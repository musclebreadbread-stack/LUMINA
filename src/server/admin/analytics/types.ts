import type {
  AdminTrackedAnalysis,
  AdminAnalyticsQuery,
  AnalyticsDateRange,
  AnalyticsSolutionFilter,
} from "@/lib/adminAnalytics";
import type { AnalysisKey } from "@engine/shared/evidence";

export type AnalyticsDataSource = "vercel-live" | "neon-rollup" | "empty" | "unavailable";
export type AnalyticsFreshness = "live" | "fresh" | "stale" | "unavailable";

export interface TrafficPoint {
  readonly date: string;
  readonly pageviews: number;
  readonly visitors: number;
}

export interface EventMetric {
  readonly analysis: AdminTrackedAnalysis;
  readonly eventName: string;
  readonly count: number;
  readonly visitors: number;
}

export interface EventTrendPoint {
  readonly date: string;
  readonly eventName: string;
  readonly analysis: AdminTrackedAnalysis | null;
  readonly count: number;
  readonly visitors: number;
}

export interface SolutionMetric {
  readonly analysis: AnalysisKey;
  readonly entryCount: number;
  readonly startCount: number;
  readonly completionCount: number;
  readonly resultCount: number;
  readonly shareCount: number;
  readonly entryVisitors: number;
  readonly completionVisitors: number;
  readonly resultVisitors: number;
  readonly completionRate: number | null;
  readonly resultRate: number | null;
  readonly trend: readonly number[];
}

export interface AnalyticsSummaryMetric {
  readonly value: number;
  readonly previousValue: number | null;
  readonly changePercent: number | null;
}

export interface AnalyticsSummary {
  readonly visitors: AnalyticsSummaryMetric;
  readonly pageviews: AnalyticsSummaryMetric;
  readonly entries: AnalyticsSummaryMetric;
  readonly completions: AnalyticsSummaryMetric;
  readonly results: AnalyticsSummaryMetric;
  readonly shares: AnalyticsSummaryMetric;
}

export interface AnalyticsDataHealth {
  readonly sourceConfigured: boolean;
  readonly rollupAvailable: boolean;
  readonly lastSyncAt: string | null;
  readonly coverageStart: string | null;
  readonly coverageEnd: string | null;
  readonly message: string | null;
}

export interface AdminAnalyticsSnapshot {
  readonly query: AdminAnalyticsQuery;
  readonly range: AnalyticsDateRange;
  readonly previousRange: AnalyticsDateRange;
  readonly source: AnalyticsDataSource;
  readonly freshness: AnalyticsFreshness;
  readonly generatedAt: string;
  readonly summary: AnalyticsSummary;
  readonly trafficSeries: readonly TrafficPoint[];
  readonly solutions: readonly SolutionMetric[];
  readonly selectedSolution: AnalyticsSolutionFilter;
  readonly selectedSolutionSeries: readonly EventMetric[];
  readonly eventTrend: readonly EventTrendPoint[];
  readonly health: AnalyticsDataHealth;
}

export interface AdminAccess {
  readonly status: "authorized" | "unauthenticated" | "forbidden" | "unavailable";
  readonly role: "viewer" | "analyst" | "owner" | null;
  readonly userId: string | null;
}
