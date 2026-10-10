import "server-only";

import { timingSafeEqual } from "node:crypto";
import { resolveAnalyticsDateRange, type AnalyticsDateRange } from "@/lib/adminAnalytics";
import { scrubAnalyticsUrl } from "@/lib/analyticsScrub";
import {
  fetchUmamiAnalyticsRollup,
  fetchUmamiMetric,
  UmamiAnalyticsError,
  type UmamiAnalyticsRollupRange,
  type UmamiMetricRow,
} from "@/server/admin/analytics/umami";

/**
 * 성장 운영 에이전트(Hermes)가 읽는 비식별 KPI 요약.
 *
 * 이 응답은 저장소 밖의 자동화로 나간다. 그래서 담는 것은 일별 합계·이벤트 건수·
 * 정제된 유입 도메인·공개 경로뿐이다. 결과 공유 URL(/r, /p, /s)의 코드 부분,
 * 쿼리 문자열, 개인 단위 값은 절대 내보내지 않는다. 시크릿은 크론 시크릿과
 * 분리해 읽기 전용 권한만 가진다.
 */

const MIN_SECRET_LENGTH = 32;
const TOP_LIMIT = 15;
/** Collapsed to `/<prefix>/*`: share codes, private links, account/admin areas. */
const PRIVATE_PATH_PREFIXES = new Set(["r", "p", "s", "account", "admin", "api"]);
/**
 * Known public first segments. Anything else becomes `(other)`, so a future private
 * route cannot leak its identifiers through this report by default.
 */
const PUBLIC_FIRST_SEGMENTS = new Set([
  "about", "astro", "attachment", "characters", "cognitive", "compatibility", "contact", "darktriad",
  "eq", "glossary", "horoscope", "integrated-report", "methodology", "numerology", "plus", "premium",
  "pricing", "privacy", "psychometrics", "references", "refund-policy", "saju", "tarot", "terms",
]);
const LOCALE_SEGMENT = /^(en|ja|es|zh-hant)$/iu;
const PUBLIC_SEGMENT = /^[a-z0-9-]{1,40}$/u;
const SCRUB_PLACEHOLDER = /^\[[A-Za-z]+\]$/u;
const REFERRER_HOST = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/u;
const IPV4_HOST = /^\d{1,3}(?:\.\d{1,3}){3}$/u;

export function isAuthorizedGrowthReport(request: Request, secret: string | undefined): boolean {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) return false;
  const authorization = request.headers.get("authorization");
  if (authorization === null) return false;
  const separator = authorization.indexOf(" ");
  // RFC 7235: the auth scheme is case-insensitive.
  if (separator < 0 || authorization.slice(0, separator).toLowerCase() !== "bearer") return false;
  const candidate = Buffer.from(authorization.slice(separator + 1), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/**
 * 1일 또는 7일만 지원한다. 원천 집계가 날짜·이벤트마다 Umami를 따로 호출하므로
 * 긴 범위는 외부 폴링 한 번에 수백 건의 상류 요청이 된다. 장기 추세는 에이전트가
 * 7일 스냅샷을 쌓아서 본다.
 */
export function resolveGrowthReportRange(daysParam: string | null, now: Date = new Date()): AnalyticsDateRange {
  if (daysParam === "1") return resolveAnalyticsDateRange({ preset: "today", from: null, to: null }, now);
  return resolveAnalyticsDateRange({ preset: "7d", from: null, to: null }, now);
}

/**
 * 공개 경로만 남긴다. 먼저 브라우저 이벤트와 같은 정제 표(`scrubAnalyticsUrl`)로 타로
 * 시드·궁합 출생 데이터·인지검사 실행 ID를 자리표시자로 바꾸고, 개인 결과·계정 경로는
 * 접두사 하나로 접는다(`/r/*`). 알려진 공개 경로가 아니면 `(other)`다.
 */
export function sanitizeReportPath(value: string): string {
  const scrubbed = scrubAnalyticsUrl(value);
  if (scrubbed === null) return "(other)";
  const segments = scrubbed.split("/").filter((segment) => segment !== "");
  const locale = segments[0] !== undefined && LOCALE_SEGMENT.test(segments[0]) ? segments.shift() : undefined;
  const prefix = locale ? `/${locale}` : "";
  const first = segments[0];
  if (first === undefined) return prefix || "/";
  if (PRIVATE_PATH_PREFIXES.has(first)) return `${prefix}/${first}/*`;
  if (!PUBLIC_FIRST_SEGMENTS.has(first) || segments.length > 4) return "(other)";
  const safe = segments.every((segment) => PUBLIC_SEGMENT.test(segment) || SCRUB_PLACEHOLDER.test(segment));
  return safe ? `${prefix}/${segments.join("/")}` : "(other)";
}

export function sanitizeReferrer(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "") return "(direct)";
  let host: string;
  try {
    host = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return "(other)";
  }
  host = host.replace(/^www\./u, "");
  return REFERRER_HOST.test(host) && !IPV4_HOST.test(host) ? host : "(other)";
}

function mergeRows(rows: readonly UmamiMetricRow[], sanitize: (value: string) => string) {
  const merged = new Map<string, number>();
  for (const row of rows) {
    const key = sanitize(row.value);
    merged.set(key, (merged.get(key) ?? 0) + row.count);
  }
  return [...merged.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, TOP_LIMIT);
}

export interface GrowthReport {
  readonly ok: true;
  readonly range: { readonly startDate: string; readonly endDate: string; readonly days: number };
  readonly traffic: {
    readonly pageviews: number;
    readonly dailyVisitorSum: number;
    readonly series: readonly { readonly date: string; readonly pageviews: number; readonly visitors: number }[];
  };
  readonly events: Readonly<Record<string, number>>;
  readonly eventsByAnalysis: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly referrers: readonly { readonly source: string; readonly visitors: number }[] | null;
  readonly topPaths: readonly { readonly path: string; readonly pageviews: number }[] | null;
  /** Fixed codes such as `referrers_unavailable`: tells "no traffic" apart from "metric failed". */
  readonly warnings: readonly string[];
}

export function summarizeGrowthReport(
  rollup: UmamiAnalyticsRollupRange,
  referrerRows: readonly UmamiMetricRow[] | null,
  pathRows: readonly UmamiMetricRow[] | null,
): GrowthReport {
  const events: Record<string, number> = {};
  const eventsByAnalysis: Record<string, Record<string, number>> = {};
  for (const point of rollup.eventTrend) {
    events[point.eventName] = (events[point.eventName] ?? 0) + point.count;
    if (point.analysis !== null) {
      const bucket = (eventsByAnalysis[point.analysis] ??= {});
      bucket[point.eventName] = (bucket[point.eventName] ?? 0) + point.count;
    }
  }
  const warnings: string[] = [];
  if (referrerRows === null) warnings.push("referrers_unavailable");
  if (pathRows === null) warnings.push("top_paths_unavailable");
  return {
    ok: true,
    range: { startDate: rollup.range.startDate, endDate: rollup.range.endDate, days: rollup.range.days },
    traffic: {
      pageviews: rollup.trafficSeries.reduce((sum, point) => sum + point.pageviews, 0),
      dailyVisitorSum: rollup.trafficSeries.reduce((sum, point) => sum + point.visitors, 0),
      series: rollup.trafficSeries.map(({ date, pageviews, visitors }) => ({ date, pageviews, visitors })),
    },
    events,
    eventsByAnalysis,
    referrers: referrerRows === null
      ? null
      : mergeRows(referrerRows, sanitizeReferrer).map(({ key, count }) => ({ source: key, visitors: count })),
    topPaths: pathRows === null
      ? null
      : mergeRows(pathRows, sanitizeReportPath).map(({ key, count }) => ({ path: key, pageviews: count })),
    warnings,
  };
}

/**
 * Umami v3 renamed the page metric from `url` to `path`, so try the names in order when
 * Umami rejects one. The report never fails because a ranking is missing; it flags it.
 */
async function optionalMetric(range: AnalyticsDateRange, types: readonly string[]): Promise<readonly UmamiMetricRow[] | null> {
  for (const type of types) {
    try {
      return await fetchUmamiMetric(range, type, 100);
    } catch (error) {
      if (error instanceof UmamiAnalyticsError && error.code !== "not_configured") continue;
      return null;
    }
  }
  return null;
}

export async function buildGrowthReport(range: AnalyticsDateRange): Promise<GrowthReport | "umami_not_configured"> {
  let rollup: UmamiAnalyticsRollupRange;
  try {
    rollup = await fetchUmamiAnalyticsRollup(range);
  } catch (error) {
    if (error instanceof UmamiAnalyticsError && error.code === "not_configured") return "umami_not_configured";
    throw error;
  }
  const [referrers, paths] = await Promise.all([
    optionalMetric(range, ["referrer"]),
    optionalMetric(range, ["path", "url"]),
  ]);
  return summarizeGrowthReport(rollup, referrers, paths);
}
