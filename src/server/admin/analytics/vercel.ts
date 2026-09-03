import "server-only";

import {
  ADMIN_EVENT_NAMES,
  isAdminEventName,
  isAdminTrackedAnalysis,
  isSafeAnalyticsDate,
  SEOUL_TIME_ZONE,
  type AnalyticsDateRange,
  type AnalyticsSolutionFilter,
} from "@/lib/adminAnalytics";
import type { AdminTrackedAnalysis } from "@/lib/adminAnalytics";
import type { EventMetric, EventTrendPoint, TrafficPoint } from "./types";

const VERCEL_ANALYTICS_API = "https://api.vercel.com/v1/query/web-analytics";
const REQUEST_TIMEOUT_MS = 10_000;
/** Vercel groups rows beyond `limit` into `Others`; use the documented maximum for aggregates. */
const MAX_AGGREGATE_ROWS = 1000;
/** A day-by-analysis trend can exceed the aggregate row cap over long periods. */
const MAX_TREND_RANGE_DAYS = 30;

export interface VercelAnalyticsConfig {
  readonly projectId: string;
  readonly teamId: string | null;
  readonly teamSlug: string | null;
}

export interface VercelVisitCount {
  readonly pageviews: number;
  readonly visitors: number;
}

export interface VercelAnalyticsRange {
  readonly range: AnalyticsDateRange;
  readonly visits: VercelVisitCount;
  readonly trafficSeries: readonly TrafficPoint[];
  readonly eventMetrics: readonly EventMetric[];
  readonly entryTrend: readonly EventTrendPoint[];
}

export interface VercelAnalyticsRollupRange {
  readonly range: AnalyticsDateRange;
  readonly trafficSeries: readonly TrafficPoint[];
  readonly eventTrend: readonly EventTrendPoint[];
}

export class VercelAnalyticsError extends Error {
  readonly code: "not_configured" | "request_failed" | "invalid_response";

  constructor(
    code: VercelAnalyticsError["code"],
    message: string,
  ) {
    super(message);
    this.name = "VercelAnalyticsError";
    this.code = code;
  }
}

function configuredValue(name: string): string | null {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readVercelAnalyticsConfig(): VercelAnalyticsConfig | null {
  const projectId = configuredValue("VERCEL_PROJECT_ID");
  const token = configuredValue("VERCEL_ANALYTICS_READ_TOKEN");
  if (projectId === null || token === null) return null;
  return Object.freeze({
    projectId,
    teamId: configuredValue("VERCEL_TEAM_ID"),
    teamSlug: configuredValue("VERCEL_TEAM_SLUG"),
  });
}

function requireToken(): string {
  const token = configuredValue("VERCEL_ANALYTICS_READ_TOKEN");
  if (token === null) {
    throw new VercelAnalyticsError(
      "not_configured",
      "VERCEL_ANALYTICS_READ_TOKEN is not configured",
    );
  }
  return token;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.min(Math.round(value), Number.MAX_SAFE_INTEGER);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function rowNumber(row: Readonly<Record<string, unknown>>, key: string): number {
  return finiteNumber(row[key]) ?? 0;
}

function parseRows(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new VercelAnalyticsError("invalid_response", "Vercel Analytics returned an invalid aggregate response");
  }
  return value.data.filter(isRecord);
}

function parseVisitCount(value: unknown): VercelVisitCount {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new VercelAnalyticsError("invalid_response", "Vercel Analytics returned an invalid visit count response");
  }
  return Object.freeze({
    pageviews: rowNumber(value.data, "pageviews"),
    visitors: rowNumber(value.data, "visitors"),
  });
}

function dateForSeoulTimestamp(value: unknown): string | null {
  const timestamp = stringValue(value);
  if (timestamp === null || Number.isNaN(Date.parse(timestamp))) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year") ?? "1970"}-${values.get("month") ?? "01"}-${values.get("day") ?? "01"}`;
}

function dateForRow(row: Readonly<Record<string, unknown>>): string | null {
  for (const key of ["day", "date"] as const) {
    const value = row[key];
    if (typeof value === "string" && isSafeAnalyticsDate(value)) return value;
  }
  return dateForSeoulTimestamp(row.timestamp);
}

function eventNameForRow(row: Readonly<Record<string, unknown>>): string | null {
  const eventName = stringValue(row.eventName);
  if (eventName === null) return null;
  return isAdminEventName(eventName) ? eventName : null;
}

function analysisForRow(row: Readonly<Record<string, unknown>>): AdminTrackedAnalysis | null {
  const eventData = row["eventData/analysis"] ?? row["eventData.analysis"] ?? row.analysis ?? row.eventData;
  if (typeof eventData === "string") return isAdminTrackedAnalysis(eventData) ? eventData : null;
  if (isRecord(eventData) && typeof eventData.analysis === "string" && isAdminTrackedAnalysis(eventData.analysis)) {
    return eventData.analysis;
  }
  return null;
}

function appendTeamScope(params: URLSearchParams, config: VercelAnalyticsConfig): void {
  if (config.teamId !== null) params.set("teamId", config.teamId);
  else if (config.teamSlug !== null) params.set("slug", config.teamSlug);
}

function buildParams(
  config: VercelAnalyticsConfig,
  range: AnalyticsDateRange,
  dimensions: readonly string[],
  filter: string | null,
  limit: number,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("projectId", config.projectId);
  params.set("since", range.startIso);
  params.set("until", range.endIso);
  for (const dimension of dimensions) params.append("by", dimension);
  params.set("limit", String(limit));
  if (filter !== null) params.set("filter", filter);
  appendTeamScope(params, config);
  return params;
}

async function getJson(
  config: VercelAnalyticsConfig,
  resource: "visits" | "events",
  endpoint: "aggregate" | "count",
  params: URLSearchParams,
): Promise<unknown> {
  const url = `${VERCEL_ANALYTICS_API}/${resource}/${endpoint}?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${requireToken()}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new VercelAnalyticsError("request_failed", "Vercel Analytics request failed");
  }

  if (!response.ok) {
    throw new VercelAnalyticsError("request_failed", `Vercel Analytics request returned ${response.status}`);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new VercelAnalyticsError("invalid_response", "Vercel Analytics returned invalid JSON");
  }
}

function eventFilter(solution: AnalyticsSolutionFilter): string {
  const names = ["solution_entry"];
  const nameExpression = `eventName in (${names.map((name) => `'${name}'`).join(", ")})`;
  return solution === "all" ? nameExpression : `${nameExpression} and eventData/analysis eq '${solution}'`;
}

function allEventFilter(): string {
  return `eventName in (${ADMIN_EVENT_NAMES.map((name) => `'${name}'`).join(", ")})`;
}

function trafficSeriesFromRows(
  rows: readonly Readonly<Record<string, unknown>>[],
  range: AnalyticsDateRange,
): readonly TrafficPoint[] {
  const byDate = new Map<string, TrafficPoint>();
  for (const row of rows) {
    const date = dateForRow(row);
    if (date === null) continue;
    byDate.set(date, Object.freeze({
      date,
      pageviews: rowNumber(row, "pageviews"),
      visitors: rowNumber(row, "visitors"),
    }));
  }

  const points: TrafficPoint[] = [];
  for (let offset = 0; offset < range.days; offset += 1) {
    const date = shiftDate(range.startDate, offset);
    points.push(byDate.get(date) ?? Object.freeze({ date, pageviews: 0, visitors: 0 }));
  }
  return Object.freeze(points);
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isoForSeoulDate(date: string, endOfDay: boolean): string {
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${date}T${time}+09:00`).toISOString();
}

/**
 * Split long trend windows before querying Vercel. `by=day,eventData/analysis`
 * produces one row per day and analysis; splitting keeps every request below
 * the API row cap instead of allowing an `Others` bucket to hide data.
 */
export function splitAnalyticsRange(range: AnalyticsDateRange): readonly AnalyticsDateRange[] {
  const ranges: AnalyticsDateRange[] = [];
  for (let startOffset = 0; startOffset < range.days; startOffset += MAX_TREND_RANGE_DAYS) {
    const endOffset = Math.min(startOffset + MAX_TREND_RANGE_DAYS - 1, range.days - 1);
    const startDate = shiftDate(range.startDate, startOffset);
    const endDate = shiftDate(range.startDate, endOffset);
    ranges.push(Object.freeze({
      preset: "custom",
      startDate,
      endDate,
      startIso: isoForSeoulDate(startDate, false),
      endIso: isoForSeoulDate(endDate, true),
      days: endOffset - startOffset + 1,
    }));
  }
  return Object.freeze(ranges);
}

function eventMetricsFromRows(rows: readonly Readonly<Record<string, unknown>>[]): readonly EventMetric[] {
  const metrics = new Map<string, EventMetric>();
  for (const row of rows) {
    const eventName = eventNameForRow(row);
    if (eventName === null) continue;
    const analysis = analysisForRow(row);
    if (analysis === null) continue;
    const key = `${eventName}:${analysis}`;
    const existing = metrics.get(key);
    metrics.set(key, Object.freeze({
      analysis,
      eventName,
      count: (existing?.count ?? 0) + rowNumber(row, "count"),
      visitors: (existing?.visitors ?? 0) + rowNumber(row, "visitors"),
    }));
  }
  return Object.freeze([...metrics.values()]);
}

function entryTrendFromRows(
  rows: readonly Readonly<Record<string, unknown>>[],
  fallbackEventName = "solution_entry",
): readonly EventTrendPoint[] {
  const points: EventTrendPoint[] = [];
  for (const row of rows) {
    const date = dateForRow(row);
    const analysis = analysisForRow(row);
    if (date === null || analysis === null) continue;
    points.push(Object.freeze({
      date,
      eventName: eventNameForRow(row) ?? fallbackEventName,
      analysis,
      count: rowNumber(row, "count"),
      visitors: rowNumber(row, "visitors"),
    }));
  }
  return Object.freeze(points);
}

export async function fetchVercelAnalyticsRollup(
  range: AnalyticsDateRange,
): Promise<VercelAnalyticsRollupRange> {
  const config = readVercelAnalyticsConfig();
  if (config === null) {
    throw new VercelAnalyticsError("not_configured", "Vercel Analytics is not configured");
  }

  const trafficParams = buildParams(config, range, ["day"], null, MAX_AGGREGATE_ROWS);
  const trendRanges = splitAnalyticsRange(range);
  const trafficRequest = getJson(config, "visits", "aggregate", trafficParams);
  const eventRequests = ADMIN_EVENT_NAMES.map(async (eventName) => {
    const chunks = await Promise.all(trendRanges.map(async (trendRange) => {
      const params = buildParams(
        config,
        trendRange,
        ["day", "eventData/analysis"],
        `eventName eq '${eventName}'`,
        MAX_AGGREGATE_ROWS,
      );
      const rows = parseRows(await getJson(config, "events", "aggregate", params));
      return entryTrendFromRows(rows, eventName);
    }));
    return Object.freeze(chunks.flat());
  });
  const [trafficResponse, ...eventTrends] = await Promise.all([trafficRequest, ...eventRequests]);
  return Object.freeze({
    range,
    trafficSeries: trafficSeriesFromRows(parseRows(trafficResponse), range),
    eventTrend: Object.freeze(eventTrends.flat()),
  });
}

export async function fetchVercelAnalyticsRange(
  range: AnalyticsDateRange,
  selectedSolution: AnalyticsSolutionFilter,
): Promise<VercelAnalyticsRange> {
  const config = readVercelAnalyticsConfig();
  if (config === null) {
    throw new VercelAnalyticsError("not_configured", "Vercel Analytics is not configured");
  }

  const trafficParams = buildParams(config, range, ["day"], null, MAX_AGGREGATE_ROWS);
  const eventParams = buildParams(
    config,
    range,
    ["eventName", "eventData/analysis"],
    allEventFilter(),
    MAX_AGGREGATE_ROWS,
  );
  const trendRanges = splitAnalyticsRange(range);
  const entryTrendRequest = Promise.all(trendRanges.map(async (trendRange) => {
    const params = buildParams(
      config,
      trendRange,
      ["day", "eventData/analysis"],
      eventFilter(selectedSolution),
      MAX_AGGREGATE_ROWS,
    );
    return entryTrendFromRows(parseRows(await getJson(config, "events", "aggregate", params)));
  }));
  const visitCountParams = new URLSearchParams({
    projectId: config.projectId,
    since: range.startIso,
    until: range.endIso,
  });
  appendTeamScope(visitCountParams, config);

  const [visitCountResponse, trafficResponse, eventResponse, entryTrendResponses] = await Promise.all([
    getJson(config, "visits", "count", visitCountParams),
    getJson(config, "visits", "aggregate", trafficParams),
    getJson(config, "events", "aggregate", eventParams),
    entryTrendRequest,
  ]);

  return Object.freeze({
    range,
    visits: parseVisitCount(visitCountResponse),
    trafficSeries: trafficSeriesFromRows(parseRows(trafficResponse), range),
    eventMetrics: eventMetricsFromRows(parseRows(eventResponse)),
    entryTrend: Object.freeze(entryTrendResponses.flat()),
  });
}

export function selectEventMetrics(
  metrics: readonly EventMetric[],
  solution: AnalyticsSolutionFilter,
): readonly EventMetric[] {
  if (solution === "all") return metrics;
  return Object.freeze(metrics.filter((metric) => metric.analysis === solution));
}
