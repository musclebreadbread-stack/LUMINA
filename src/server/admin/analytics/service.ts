import "server-only";

import {
  ADMIN_ANALYSIS_KEYS,
  type AdminAnalyticsQuery,
  type AdminTrackedAnalysis,
  type AnalyticsDateRange,
  type AnalyticsSolutionFilter,
  previousAnalyticsDateRange,
  resolveAnalyticsDateRange,
} from "@/lib/adminAnalytics";
import type { AnalysisKey } from "@engine/shared/evidence";
import { getAdminAccess } from "../authorization";
import { readAnalyticsRollups, writeAnalyticsAudit } from "./repository";
import type {
  AdminAnalyticsSnapshot,
  AnalyticsDataHealth,
  AnalyticsSummary,
  AnalyticsSummaryMetric,
  EventMetric,
  EventTrendPoint,
  SolutionMetric,
  TrafficPoint,
} from "./types";
import {
  fetchVercelAnalyticsRange,
  readVercelAnalyticsConfig,
  type VercelAnalyticsRange,
} from "./vercel";

const EMPTY_HEALTH: AnalyticsDataHealth = Object.freeze({
  sourceConfigured: false,
  rollupAvailable: false,
  lastSyncAt: null,
  coverageStart: null,
  coverageEnd: null,
  message: null,
});

function zeroMetric(analysis: AnalysisKey): SolutionMetric {
  return Object.freeze({
    analysis,
    entryCount: 0,
    startCount: 0,
    completionCount: 0,
    resultCount: 0,
    shareCount: 0,
    entryVisitors: 0,
    completionVisitors: 0,
    resultVisitors: 0,
    completionRate: null,
    resultRate: null,
    trend: Object.freeze([]),
  });
}

function sum(values: readonly number[]): number {
  return Math.min(values.reduce((total, value) => total + value, 0), Number.MAX_SAFE_INTEGER);
}

function metricValue(
  metrics: readonly EventMetric[],
  analysis: AdminTrackedAnalysis,
  eventName: string,
  field: "count" | "visitors",
): number {
  return sum(metrics
    .filter((metric) => metric.analysis === analysis && metric.eventName === eventName)
    .map((metric) => metric[field]));
}

function metricValueForEvents(
  events: readonly EventTrendPoint[],
  analysis: AdminTrackedAnalysis,
  eventNames: readonly string[],
  field: "count" | "visitors",
): number {
  return sum(events
    .filter((event) => event.analysis === analysis && eventNames.includes(event.eventName))
    .map((event) => event[field]));
}

function percentChange(value: number, previousValue: number): number | null {
  if (previousValue === 0) return value === 0 ? 0 : null;
  return Math.round(((value - previousValue) / previousValue) * 1000) / 10;
}

function summaryMetric(value: number, previousValue: number | null): AnalyticsSummaryMetric {
  return Object.freeze({
    value,
    previousValue,
    changePercent: previousValue === null ? null : percentChange(value, previousValue),
  });
}

function eventMetricsForRows(rows: readonly EventTrendPoint[]): readonly EventMetric[] {
  const metrics = new Map<string, EventMetric>();
  for (const row of rows) {
    if (row.analysis === null) continue;
    const key = `${row.analysis}:${row.eventName}`;
    const existing = metrics.get(key);
    metrics.set(key, Object.freeze({
      analysis: row.analysis,
      eventName: row.eventName,
      count: (existing?.count ?? 0) + row.count,
      visitors: (existing?.visitors ?? 0) + row.visitors,
    }));
  }
  return Object.freeze([...metrics.values()]);
}

function dateShift(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function trafficForRange(
  rows: readonly TrafficPoint[],
  range: AnalyticsDateRange,
): readonly TrafficPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const result: TrafficPoint[] = [];
  for (let offset = 0; offset < range.days; offset += 1) {
    const date = dateShift(range.startDate, offset);
    result.push(byDate.get(date) ?? Object.freeze({ date, pageviews: 0, visitors: 0 }));
  }
  return Object.freeze(result);
}

function eventRowsForRange(
  rows: readonly EventTrendPoint[],
  range: AnalyticsDateRange,
): readonly EventTrendPoint[] {
  return Object.freeze(rows.filter((row) => row.date >= range.startDate && row.date <= range.endDate));
}

/**
 * Build the funnel from distinct lifecycle events. `solution_entry` is the
 * page-entry denominator; `test_start` is retained as a separate diagnostic
 * count so a normal page visit is not counted twice in rates.
 */
export function buildSolutionMetrics(
  metrics: readonly EventMetric[],
  events: readonly EventTrendPoint[],
  range: AnalyticsDateRange,
): readonly SolutionMetric[] {
  const rangeEvents = eventRowsForRange(events, range);
  return Object.freeze(ADMIN_ANALYSIS_KEYS.map((analysis) => {
    const entryCount = metricValue(metrics, analysis, "solution_entry", "count");
    const entryVisitors = metricValue(metrics, analysis, "solution_entry", "visitors");
    const completionCount = metricValue(metrics, analysis, "test_complete", "count");
    const completionVisitors = metricValue(metrics, analysis, "test_complete", "visitors");
    const resultCount = metricValue(metrics, analysis, "result_view", "count");
    const resultVisitors = metricValue(metrics, analysis, "result_view", "visitors");
    const shareCount = metricValue(metrics, analysis, "share_open", "count");
    const trend: number[] = [];
    for (let offset = 0; offset < range.days; offset += 1) {
      const date = dateShift(range.startDate, offset);
      trend.push(metricValueForEvents(
        rangeEvents.filter((event) => event.date === date),
        analysis,
        ["solution_entry"],
        "count",
      ));
    }
    return Object.freeze({
      analysis,
      entryCount,
      startCount: metricValue(metrics, analysis, "test_start", "count"),
      completionCount,
      resultCount,
      shareCount,
      entryVisitors,
      completionVisitors,
      resultVisitors,
      completionRate: entryCount > 0 ? Math.round((completionCount / entryCount) * 1000) / 10 : null,
      resultRate: entryCount > 0 ? Math.round((resultCount / entryCount) * 1000) / 10 : null,
      trend: Object.freeze(trend),
    });
  }));
}

function totalFor(solutions: readonly SolutionMetric[], field: keyof Pick<SolutionMetric, "entryCount" | "completionCount" | "resultCount" | "shareCount">): number {
  return sum(solutions.map((solution) => solution[field]));
}

function buildSummary(
  visits: { readonly pageviews: number; readonly visitors: number },
  previousVisits: { readonly pageviews: number; readonly visitors: number } | null,
  solutions: readonly SolutionMetric[],
  previousSolutions: readonly SolutionMetric[] | null,
): AnalyticsSummary {
  const entries = totalFor(solutions, "entryCount");
  const completions = totalFor(solutions, "completionCount");
  const results = totalFor(solutions, "resultCount");
  const shares = totalFor(solutions, "shareCount");
  return Object.freeze({
    visitors: summaryMetric(visits.visitors, previousVisits?.visitors ?? null),
    pageviews: summaryMetric(visits.pageviews, previousVisits?.pageviews ?? null),
    entries: summaryMetric(entries, previousSolutions === null ? null : totalFor(previousSolutions, "entryCount")),
    completions: summaryMetric(completions, previousSolutions === null ? null : totalFor(previousSolutions, "completionCount")),
    results: summaryMetric(results, previousSolutions === null ? null : totalFor(previousSolutions, "resultCount")),
    shares: summaryMetric(shares, previousSolutions === null ? null : totalFor(previousSolutions, "shareCount")),
  });
}

function selectedEventMetrics(metrics: readonly EventMetric[], solution: AnalyticsSolutionFilter): readonly EventMetric[] {
  return Object.freeze(solution === "all" ? metrics : metrics.filter((metric) => metric.analysis === solution));
}

function buildSnapshotFromLive(
  query: AdminAnalyticsQuery,
  range: AnalyticsDateRange,
  previousRange: AnalyticsDateRange,
  current: VercelAnalyticsRange,
  previous: VercelAnalyticsRange,
): AdminAnalyticsSnapshot {
  const solutions = buildSolutionMetrics(current.eventMetrics, current.entryTrend, range);
  const previousSolutions = buildSolutionMetrics(previous.eventMetrics, previous.entryTrend, previousRange);
  return Object.freeze({
    query,
    range,
    previousRange,
    source: "vercel-live",
    freshness: "live",
    generatedAt: new Date().toISOString(),
    summary: buildSummary(current.visits, previous.visits, solutions, previousSolutions),
    trafficSeries: current.trafficSeries,
    solutions,
    selectedSolution: query.solution,
    selectedSolutionSeries: selectedEventMetrics(current.eventMetrics, query.solution),
    eventTrend: current.entryTrend,
    health: Object.freeze({
      sourceConfigured: true,
      rollupAvailable: false,
      lastSyncAt: null,
      coverageStart: range.startDate,
      coverageEnd: range.endDate,
      message: null,
    }),
  });
}

function buildSnapshotFromRollup(
  query: AdminAnalyticsQuery,
  range: AnalyticsDateRange,
  previousRange: AnalyticsDateRange,
  rollup: {
    readonly traffic: readonly TrafficPoint[];
    readonly events: readonly EventTrendPoint[];
    readonly lastSyncAt: string | null;
    readonly coverageStart: string | null;
    readonly coverageEnd: string | null;
  },
  sourceConfigured: boolean,
  message: string | null,
): AdminAnalyticsSnapshot {
  const currentEvents = eventRowsForRange(rollup.events, range);
  const previousEvents = eventRowsForRange(rollup.events, previousRange);
  const currentMetrics = eventMetricsForRows(currentEvents);
  const previousMetrics = eventMetricsForRows(previousEvents);
  const solutions = buildSolutionMetrics(currentMetrics, currentEvents, range);
  const previousSolutions = buildSolutionMetrics(previousMetrics, previousEvents, previousRange);
  const trafficSeries = trafficForRange(rollup.traffic, range);
  const previousTraffic = trafficForRange(rollup.traffic, previousRange);
  const visits = {
    pageviews: sum(trafficSeries.map((point) => point.pageviews)),
    visitors: sum(trafficSeries.map((point) => point.visitors)),
  };
  const previousVisits = {
    pageviews: sum(previousTraffic.map((point) => point.pageviews)),
    visitors: sum(previousTraffic.map((point) => point.visitors)),
  };
  const lastSyncTime = rollup.lastSyncAt === null ? null : Date.parse(rollup.lastSyncAt);
  const freshness = lastSyncTime === null
    ? "unavailable"
    : Date.now() - lastSyncTime <= 48 * 60 * 60 * 1000 ? "fresh" : "stale";
  const hasRows = trafficSeries.some((point) => point.pageviews > 0 || point.visitors > 0) || currentEvents.length > 0;

  return Object.freeze({
    query,
    range,
    previousRange,
    source: hasRows ? "neon-rollup" : "empty",
    freshness,
    generatedAt: new Date().toISOString(),
    summary: buildSummary(visits, previousVisits, solutions, previousSolutions),
    trafficSeries,
    solutions,
    selectedSolution: query.solution,
    selectedSolutionSeries: selectedEventMetrics(currentMetrics, query.solution),
    eventTrend: currentEvents,
    health: Object.freeze({
      sourceConfigured,
      rollupAvailable: true,
      lastSyncAt: rollup.lastSyncAt,
      coverageStart: rollup.coverageStart,
      coverageEnd: rollup.coverageEnd,
      message,
    }),
  });
}

function emptySnapshot(
  query: AdminAnalyticsQuery,
  range: AnalyticsDateRange,
  previousRange: AnalyticsDateRange,
  sourceConfigured: boolean,
  message: string,
): AdminAnalyticsSnapshot {
  const solutions = Object.freeze(ADMIN_ANALYSIS_KEYS.map(zeroMetric));
  const zeroVisits = { pageviews: 0, visitors: 0 };
  return Object.freeze({
    query,
    range,
    previousRange,
    source: "unavailable",
    freshness: "unavailable",
    generatedAt: new Date().toISOString(),
    summary: buildSummary(zeroVisits, null, solutions, null),
    trafficSeries: trafficForRange([], range),
    solutions,
    selectedSolution: query.solution,
    selectedSolutionSeries: Object.freeze([]),
    eventTrend: Object.freeze([]),
    health: Object.freeze({ ...EMPTY_HEALTH, sourceConfigured, message }),
  });
}

export async function loadAdminAnalytics(query: AdminAnalyticsQuery): Promise<AdminAnalyticsSnapshot> {
  const access = await getAdminAccess();
  if (access.status !== "authorized" || access.userId === null) {
    throw new Error("admin authorization required");
  }

  const range = resolveAnalyticsDateRange(query);
  const previousRange = previousAnalyticsDateRange(range);
  await writeAnalyticsAudit(access.userId, "view_analytics", range).catch(() => undefined);
  const sourceConfigured = readVercelAnalyticsConfig() !== null;

  if (sourceConfigured) {
    try {
      const [current, previous] = await Promise.all([
        fetchVercelAnalyticsRange(range, query.solution),
        fetchVercelAnalyticsRange(previousRange, query.solution),
      ]);
      return buildSnapshotFromLive(query, range, previousRange, current, previous);
    } catch {
      // A delayed or unavailable Vercel API should not make the admin console unusable.
    }
  }

  try {
    const rollup = await readAnalyticsRollups(access.userId, previousRange.startDate, range.endDate);
    return buildSnapshotFromRollup(
      query,
      range,
      previousRange,
      rollup,
      sourceConfigured,
      sourceConfigured
        ? "Live analytics is unavailable; showing the latest aggregate rollup."
        : "Configure the Vercel Analytics read token to enable live traffic data.",
    );
  } catch {
    return emptySnapshot(
      query,
      range,
      previousRange,
      sourceConfigured,
      "Analytics data is not available until the operations migration and source configuration are complete.",
    );
  }
}
