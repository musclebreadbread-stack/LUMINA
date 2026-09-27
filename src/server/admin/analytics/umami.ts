import "server-only";

import {
  ADMIN_EVENT_NAMES,
  isSafeAnalyticsDate,
  SEOUL_TIME_ZONE,
  type AnalyticsDateRange,
} from "@/lib/adminAnalytics";
import { parseUmamiEventName } from "@/lib/umamiEventName";
import type { EventTrendPoint, TrafficPoint } from "./types";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_SERIES_ROWS = 1000;

export interface UmamiAnalyticsConfig {
  readonly apiUrl: string;
  readonly websiteId: string;
  readonly apiKey: string;
}

export interface UmamiAnalyticsRollupRange {
  readonly range: AnalyticsDateRange;
  readonly trafficSeries: readonly TrafficPoint[];
  readonly eventTrend: readonly EventTrendPoint[];
}

export class UmamiAnalyticsError extends Error {
  readonly code: "not_configured" | "request_failed" | "invalid_response";

  constructor(code: UmamiAnalyticsError["code"], message: string) {
    super(message);
    this.name = "UmamiAnalyticsError";
    this.code = code;
  }
}

function configuredValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function readUmamiAnalyticsConfig(): UmamiAnalyticsConfig | null {
  const rawApiUrl = configuredValue("UMAMI_API_URL");
  const websiteId = configuredValue("UMAMI_WEBSITE_ID");
  const apiKey = configuredValue("UMAMI_API_KEY");
  if (rawApiUrl === null || websiteId === null || apiKey === null) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(websiteId)
    || apiKey.length < 24 || /[\r\n\u0000]/u.test(apiKey)) return null;

  try {
    const parsed = new URL(rawApiUrl);
    const privateRailwayHttp = parsed.protocol === "http:" && parsed.hostname.toLowerCase().endsWith(".railway.internal");
    const secureOrigin = parsed.protocol === "https:";
    if ((!secureOrigin && !privateRailwayHttp) || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    const path = parsed.pathname.replace(/\/+$/u, "");
    if (path !== "" && path !== "/api") return null;
    return Object.freeze({
      apiUrl: `${parsed.origin}/api/`,
      websiteId,
      apiKey,
    });
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteCount(value: unknown): number | null {
  const candidate = typeof value === "string" ? Number(value) : value;
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < 0) return null;
  return Math.min(Math.round(candidate), Number.MAX_SAFE_INTEGER);
}

function numberField(record: Readonly<Record<string, unknown>>, name: string): number | null {
  const value = record[name];
  if (isRecord(value)) return finiteCount(value.value);
  return finiteCount(value);
}

function responseData(value: unknown): Readonly<Record<string, unknown>> | null {
  if (!isRecord(value)) return null;
  return isRecord(value.data) ? value.data : value;
}

function queryRange(range: AnalyticsDateRange): URLSearchParams {
  return new URLSearchParams({
    startAt: String(Date.parse(range.startIso)),
    endAt: String(Date.parse(range.endIso)),
    timezone: SEOUL_TIME_ZONE,
  });
}

async function getJson(
  config: UmamiAnalyticsConfig,
  resource: string,
  params: URLSearchParams,
): Promise<unknown> {
  const target = new URL(`websites/${config.websiteId}/${resource}`, config.apiUrl);
  target.search = params.toString();
  let response: Response;
  try {
    response = await fetch(target, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new UmamiAnalyticsError("request_failed", "Umami analytics request failed");
  }
  if (!response.ok) throw new UmamiAnalyticsError("request_failed", `Umami analytics request returned ${response.status}`);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new UmamiAnalyticsError("invalid_response", "Umami analytics returned invalid JSON");
  }
}

function dateForSeoul(value: string): string | null {
  if (isSafeAnalyticsDate(value)) return value;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const dateParts = new Map(parts.map((part) => [part.type, part.value]));
  const result = `${dateParts.get("year") ?? "1970"}-${dateParts.get("month") ?? "01"}-${dateParts.get("day") ?? "01"}`;
  return isSafeAnalyticsDate(result) ? result : null;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function seoulDateRange(date: string): URLSearchParams {
  const start = new Date(`${date}T00:00:00.000+09:00`);
  const end = new Date(`${date}T23:59:59.999+09:00`);
  return new URLSearchParams({
    startAt: String(start.getTime()),
    endAt: String(end.getTime()),
    timezone: SEOUL_TIME_ZONE,
  });
}

function pointsFromArray(value: unknown, range: AnalyticsDateRange): ReadonlyMap<string, number> {
  if (!Array.isArray(value)) throw new UmamiAnalyticsError("invalid_response", "Umami returned an invalid time series");
  const points = new Map<string, number>();
  for (const item of value) {
    if (!isRecord(item) || typeof item.x !== "string") continue;
    const date = dateForSeoul(item.x);
    const count = finiteCount(item.y);
    if (date === null || count === null || date < range.startDate || date > range.endDate) continue;
    points.set(date, Math.min((points.get(date) ?? 0) + count, Number.MAX_SAFE_INTEGER));
  }
  return points;
}

async function mapLimited<T, R>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T) => Promise<R>,
): Promise<readonly R[]> {
  const results: R[] = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];
      if (value === undefined) return;
      results[index] = await operation(value);
    }
  });
  await Promise.all(workers);
  return Object.freeze(results);
}

async function dailyVisitors(
  config: UmamiAnalyticsConfig,
  date: string,
  eventName?: string,
): Promise<number> {
  const params = seoulDateRange(date);
  if (eventName !== undefined) {
    params.set("event", eventName);
    params.set("eventType", "2");
  }
  const payload = responseData(await getJson(config, "stats", params));
  if (payload === null) throw new UmamiAnalyticsError("invalid_response", "Umami returned invalid statistics");
  return numberField(payload, "visitors") ?? 0;
}

interface EventCountPoint {
  readonly date: string;
  readonly eventName: string;
  readonly analysis: EventTrendPoint["analysis"];
  readonly count: number;
}

export async function fetchUmamiAnalyticsRollup(range: AnalyticsDateRange): Promise<UmamiAnalyticsRollupRange> {
  const config = readUmamiAnalyticsConfig();
  if (config === null) throw new UmamiAnalyticsError("not_configured", "Umami analytics is not configured");

  const trafficParams = queryRange(range);
  trafficParams.set("unit", "day");
  const seriesParams = queryRange(range);
  seriesParams.set("unit", "day");
  seriesParams.set("limit", String(MAX_SERIES_ROWS));
  seriesParams.set("eventType", "2");

  const [pageviewsPayload, eventsPayload] = await Promise.all([
    getJson(config, "pageviews", trafficParams),
    getJson(config, "events/series", seriesParams),
  ]);

  const pageviewsData = responseData(pageviewsPayload);
  if (pageviewsData === null) throw new UmamiAnalyticsError("invalid_response", "Umami returned invalid pageview data");
  const pageviews = pointsFromArray(pageviewsData.pageviews, range);

  if (!Array.isArray(eventsPayload)) throw new UmamiAnalyticsError("invalid_response", "Umami returned an invalid event series");
  const eventCounts = new Map<string, EventCountPoint>();
  for (const item of eventsPayload) {
    if (!isRecord(item) || typeof item.t !== "string" || typeof item.x !== "string") continue;
    const parsedName = parseUmamiEventName(item.t);
    const date = dateForSeoul(item.x);
    const count = finiteCount(item.y);
    if (parsedName === null || date === null || count === null || date < range.startDate || date > range.endDate) continue;
    if (!ADMIN_EVENT_NAMES.includes(parsedName.eventName)) continue;
    const key = `${date}:${parsedName.eventName}:${parsedName.analysis}`;
    const previous = eventCounts.get(key);
    eventCounts.set(key, Object.freeze({
      date,
      eventName: parsedName.eventName,
      analysis: parsedName.analysis,
      count: Math.min((previous?.count ?? 0) + count, Number.MAX_SAFE_INTEGER),
    }));
  }

  const eventCountPoints = [...eventCounts.values()];
  const dates = Array.from({ length: range.days }, (_, offset) => shiftDate(range.startDate, offset));
  const visitorQueries = [
    ...dates.map((date) => ({ date, eventName: undefined as string | undefined, key: `traffic:${date}` })),
    ...eventCountPoints.map((point) => ({
      date: point.date,
      eventName: `${point.eventName}__${point.analysis}`,
      key: `event:${point.date}:${point.eventName}:${point.analysis}`,
    })),
  ];
  const visitorValues = await mapLimited(visitorQueries, 8, async (query) => ({
    key: query.key,
    visitors: await dailyVisitors(config, query.date, query.eventName),
  }));
  const visitorsByKey = new Map(visitorValues.map((item) => [item.key, item.visitors]));

  const trafficSeries = Object.freeze(dates.map((date) => Object.freeze({
    date,
    pageviews: pageviews.get(date) ?? 0,
    visitors: visitorsByKey.get(`traffic:${date}`) ?? 0,
  })));
  const eventTrend = Object.freeze(eventCountPoints.map((point) => Object.freeze({
    date: point.date,
    eventName: point.eventName,
    analysis: point.analysis,
    count: point.count,
    visitors: visitorsByKey.get(`event:${point.date}:${point.eventName}:${point.analysis}`) ?? 0,
  })));
  return Object.freeze({ range, trafficSeries, eventTrend });
}
