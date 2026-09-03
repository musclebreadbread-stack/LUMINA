import "server-only";

import {
  ANALYTICS_ROLLUP_ENVIRONMENT,
  isAdminAnalysisKey,
  isAdminEventName,
  isSafeAnalyticsDate,
} from "@/lib/adminAnalytics";
import type { AnalyticsDateRange } from "@/lib/adminAnalytics";
import { createNeonSql, neonRows } from "@/lib/neon/server";
import type { AdminTrackedAnalysis } from "@/lib/adminAnalytics";
import type { EventTrendPoint, TrafficPoint } from "./types";

export interface RollupAnalyticsData {
  readonly traffic: readonly TrafficPoint[];
  readonly events: readonly EventTrendPoint[];
  readonly lastSyncAt: string | null;
  readonly coverageStart: string | null;
  readonly coverageEnd: string | null;
}

function countValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(Math.round(parsed), Number.MAX_SAFE_INTEGER);
}

function dateValue(value: unknown): string | null {
  return typeof value === "string" && isSafeAnalyticsDate(value) ? value : null;
}

function timestampValue(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function analysisValue(value: unknown): AdminTrackedAnalysis | null {
  if (typeof value !== "string") return null;
  if (value === "integrated-report") return value;
  return isAdminAnalysisKey(value) ? value : null;
}

/** Reads aggregate rows and non-sensitive sync metadata under the admin's RLS context. */
export async function readAnalyticsRollups(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<RollupAnalyticsData> {
  const sql = createNeonSql();
  const results = await sql.transaction([
    sql`select set_config('app.current_auth_user_id', ${userId}, true)`,
    sql`
      select metric_date::text as metric_date, pageviews, visitors
        from ops.daily_traffic_metrics
       where metric_date between ${startDate}::date and ${endDate}::date
         and environment = ${ANALYTICS_ROLLUP_ENVIRONMENT}
       order by metric_date asc
    `,
    sql`
      select metric_date::text as metric_date, analysis_key, event_name, event_count, visitors
        from ops.daily_solution_events
       where metric_date between ${startDate}::date and ${endDate}::date
         and environment = ${ANALYTICS_ROLLUP_ENVIRONMENT}
       order by metric_date asc, analysis_key asc, event_name asc
    `,
    sql`
      select finished_at, requested_since::text as requested_since, requested_until::text as requested_until
        from ops.analytics_sync_runs
       where status = 'succeeded'
       order by finished_at desc nulls last
       limit 1
    `,
  ]);

  const traffic: TrafficPoint[] = [];
  for (const row of neonRows(results[1])) {
    const date = dateValue(row.metric_date);
    if (date === null) continue;
    traffic.push(Object.freeze({
      date,
      pageviews: countValue(row.pageviews),
      visitors: countValue(row.visitors),
    }));
  }

  const events: EventTrendPoint[] = [];
  for (const row of neonRows(results[2])) {
    const date = dateValue(row.metric_date);
    const analysis = analysisValue(row.analysis_key);
    const eventName = typeof row.event_name === "string" && isAdminEventName(row.event_name)
      ? row.event_name
      : null;
    if (date === null || analysis === null || eventName === null) continue;
    events.push(Object.freeze({
      date,
      analysis,
      eventName,
      count: countValue(row.event_count),
      visitors: countValue(row.visitors),
    }));
  }

  const syncRow = neonRows(results[3])[0];
  return Object.freeze({
    traffic: Object.freeze(traffic),
    events: Object.freeze(events),
    lastSyncAt: timestampValue(syncRow?.finished_at),
    coverageStart: dateValue(syncRow?.requested_since),
    coverageEnd: dateValue(syncRow?.requested_until),
  });
}

/** Writes a minimal audit event under the same RLS-bound identity as reads. */
export async function writeAnalyticsAudit(
  userId: string,
  action: "view_analytics" | "run_sync" | "export_analytics",
  range: AnalyticsDateRange,
): Promise<void> {
  const sql = createNeonSql();
  await sql.transaction([
    sql`select set_config('app.current_auth_user_id', ${userId}, true)`,
    sql`
      insert into ops.admin_audit_log (actor_user_id, action, range_start, range_end)
      values (${userId}, ${action}, ${range.startDate}::date, ${range.endDate}::date)
    `,
  ]);
}
