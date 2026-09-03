import type { AnalysisKey } from "@engine/shared/evidence";

export const SEOUL_TIME_ZONE = "Asia/Seoul";
export const ANALYTICS_ROLLUP_ENVIRONMENT = "production" as const;

/** The admin rollup reader is production-only; reject writes for other environments. */
export function resolveAnalyticsRollupEnvironment(value: string | undefined): typeof ANALYTICS_ROLLUP_ENVIRONMENT | null {
  const normalized = value?.trim();
  if (normalized === undefined || normalized.length === 0) return ANALYTICS_ROLLUP_ENVIRONMENT;
  return normalized === ANALYTICS_ROLLUP_ENVIRONMENT ? ANALYTICS_ROLLUP_ENVIRONMENT : null;
}

export const ADMIN_ANALYSIS_KEYS: readonly AnalysisKey[] = Object.freeze([
  "saju",
  "astro",
  "tarot",
  "numerology",
  "psychometrics",
  "jungian",
  "darktriad",
  "attachment",
  "eq",
  "cognitive",
  "horoscope",
  "compatibility",
]);

export const ADMIN_EVENT_NAMES = Object.freeze([
  "solution_entry",
  "test_start",
  "test_complete",
  "result_view",
  "share_open",
  "share_image_saved",
  "compatibility_compare",
  "integrated_report_view",
  "share_landing_view",
  "share_landing_cta",
] as const);

export type AdminEventName = (typeof ADMIN_EVENT_NAMES)[number];
export type AnalyticsPreset = "today" | "7d" | "30d" | "90d" | "custom";
export type AnalyticsSolutionFilter = AnalysisKey | "all";
export type AdminTrackedAnalysis = AnalysisKey | "integrated-report";

export const ADMIN_TRACKED_ANALYSIS_KEYS: readonly AdminTrackedAnalysis[] = Object.freeze([
  ...ADMIN_ANALYSIS_KEYS,
  "integrated-report",
]);

export interface AnalyticsDateRange {
  readonly preset: AnalyticsPreset;
  readonly startDate: string;
  readonly endDate: string;
  readonly startIso: string;
  readonly endIso: string;
  readonly days: number;
}

export interface AdminAnalyticsQuery {
  readonly preset: AnalyticsPreset;
  readonly from: string | null;
  readonly to: string | null;
  readonly solution: AnalyticsSolutionFilter;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MAX_CUSTOM_RANGE_DAYS = 366;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueFromQuery(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === "string");
    return first;
  }
  return undefined;
}

function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parts = value.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) return false;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

function isAnalysisKey(value: string | undefined): value is AnalysisKey {
  return value !== undefined && ADMIN_ANALYSIS_KEYS.includes(value as AnalysisKey);
}

function datePartsForSeoul(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year") ?? "1970"}-${values.get("month") ?? "01"}-${values.get("day") ?? "01"}`;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isoForSeoulDate(date: string, endOfDay: boolean): string {
  const suffix = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${date}T${suffix}+09:00`).toISOString();
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

function presetDays(preset: Exclude<AnalyticsPreset, "custom">): number {
  if (preset === "today") return 1;
  if (preset === "7d") return 7;
  if (preset === "30d") return 30;
  return 90;
}

function isPreset(value: string | undefined): value is AnalyticsPreset {
  return value === "today" || value === "7d" || value === "30d" || value === "90d" || value === "custom";
}

export function parseAnalyticsQuery(input: Readonly<Record<string, unknown>>): AdminAnalyticsQuery {
  const presetValue = valueFromQuery(input.preset);
  const preset = isPreset(presetValue) ? presetValue : "7d";
  const fromValue = valueFromQuery(input.from);
  const toValue = valueFromQuery(input.to);
  const solutionValue = valueFromQuery(input.solution);

  return Object.freeze({
    preset,
    from: fromValue !== undefined && isValidDateString(fromValue) ? fromValue : null,
    to: toValue !== undefined && isValidDateString(toValue) ? toValue : null,
    solution: solutionValue === "all" || isAnalysisKey(solutionValue) ? solutionValue : "all",
  });
}

export function resolveAnalyticsDateRange(
  query: Pick<AdminAnalyticsQuery, "preset" | "from" | "to">,
  now: Date = new Date(),
): AnalyticsDateRange {
  const today = datePartsForSeoul(now);
  let startDate = shiftDate(today, -(presetDays(query.preset === "custom" ? "7d" : query.preset) - 1));
  let endDate = today;
  let preset = query.preset;

  if (
    query.preset === "custom" &&
    query.from !== null &&
    query.to !== null &&
    isValidDateString(query.from) &&
    isValidDateString(query.to) &&
    query.from <= query.to &&
    daysBetween(query.from, query.to) <= MAX_CUSTOM_RANGE_DAYS
  ) {
    startDate = query.from;
    endDate = query.to;
  } else if (query.preset === "custom") {
    preset = "7d";
  }

  return Object.freeze({
    preset,
    startDate,
    endDate,
    startIso: isoForSeoulDate(startDate, false),
    endIso: isoForSeoulDate(endDate, true),
    days: daysBetween(startDate, endDate),
  });
}

export function previousAnalyticsDateRange(range: AnalyticsDateRange): AnalyticsDateRange {
  const endDate = shiftDate(range.startDate, -1);
  const startDate = shiftDate(endDate, -(range.days - 1));
  return Object.freeze({
    preset: "custom",
    startDate,
    endDate,
    startIso: isoForSeoulDate(startDate, false),
    endIso: isoForSeoulDate(endDate, true),
    days: range.days,
  });
}

export function isAdminEventName(value: string | undefined): value is AdminEventName {
  return value !== undefined && ADMIN_EVENT_NAMES.includes(value as AdminEventName);
}

export function isAdminAnalysisKey(value: string | undefined): value is AnalysisKey {
  return isAnalysisKey(value);
}

export function isAdminTrackedAnalysis(value: string | undefined): value is AdminTrackedAnalysis {
  return value !== undefined && ADMIN_TRACKED_ANALYSIS_KEYS.includes(value as AdminTrackedAnalysis);
}

export function isSafeAnalyticsDate(value: string): boolean {
  return isValidDateString(value);
}

export function isAnalyticsDateRange(value: unknown): value is AnalyticsDateRange {
  if (!isRecord(value)) return false;
  return (
    typeof value.preset === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.startIso === "string" &&
    typeof value.endIso === "string" &&
    typeof value.days === "number" &&
    Number.isInteger(value.days) &&
    value.days > 0 &&
    isValidDateString(value.startDate) &&
    isValidDateString(value.endDate)
  );
}
