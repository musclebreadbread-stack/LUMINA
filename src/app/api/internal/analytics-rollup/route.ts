import { Client } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import {
  resolveAnalyticsRollupEnvironment,
  resolveAnalyticsDateRange,
  isSafeAnalyticsDate,
  SEOUL_TIME_ZONE,
  type AnalyticsDateRange,
} from "@/lib/adminAnalytics";
import { fetchVercelAnalyticsRollup } from "@/server/admin/analytics/vercel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function seoulIso(date: string, endOfDay: boolean): string {
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${date}T${time}+09:00`).toISOString();
}

function recentRollupRange(now = new Date()): AnalyticsDateRange {
  const endDate = datePartsForSeoul(now);
  const startDate = shiftDate(endDate, -2);
  if (!isSafeAnalyticsDate(startDate) || !isSafeAnalyticsDate(endDate)) {
    throw new Error("Unable to resolve the rollup date range");
  }
  return resolveAnalyticsDateRange({ preset: "custom", from: startDate, to: endDate }, now);
}

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return typeof secret === "string" && secret.length >= 32 && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runRollup(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const databaseUrl = process.env.ANALYTICS_ROLLUP_DATABASE_URL;
  if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    return NextResponse.json({ error: "rollup_not_configured" }, { status: 503 });
  }

  const environment = resolveAnalyticsRollupEnvironment(process.env.VERCEL_ANALYTICS_ENVIRONMENT);
  if (environment === null) {
    return NextResponse.json({ error: "rollup_environment_unsupported" }, { status: 503 });
  }

  let syncId: string | null = null;
  const range = recentRollupRange();
  const client = new Client(databaseUrl);
  try {
    await client.connect();
    const sync = await client.query(
      `insert into ops.analytics_sync_runs (source, requested_since, requested_until, status)
       values ($1, $2, $3, 'running') returning id`,
      ["vercel-web-analytics", range.startDate, range.endDate],
    );
    syncId = typeof sync.rows[0]?.id === "string" ? sync.rows[0].id : null;
    const aggregate = await fetchVercelAnalyticsRollup(range);

    await client.query("begin");
    // Rebuild the event window atomically so corrected zero/missing rows cannot
    // leave stale daily_solution_events values behind.
    await client.query(
      `delete from ops.daily_solution_events
        where environment = $1 and metric_date between $2 and $3`,
      [environment, range.startDate, range.endDate],
    );
    for (const row of aggregate.trafficSeries) {
      await client.query(
        `insert into ops.daily_traffic_metrics
          (metric_date, environment, pageviews, visitors, source, coverage_start, coverage_end, collected_at)
         values ($1, $2, $3, $4, 'vercel-web-analytics', $5, $6, now())
         on conflict (metric_date, environment) do update set
           pageviews = excluded.pageviews, visitors = excluded.visitors,
           source = excluded.source, coverage_start = excluded.coverage_start,
           coverage_end = excluded.coverage_end, collected_at = excluded.collected_at`,
        [row.date, environment, row.pageviews, row.visitors, seoulIso(row.date, false), seoulIso(row.date, true)],
      );
    }
    for (const row of aggregate.eventTrend) {
      if (row.analysis === null || row.count === 0 && row.visitors === 0) continue;
      await client.query(
        `insert into ops.daily_solution_events
          (metric_date, environment, analysis_key, event_name, event_count, visitors, source, collected_at)
         values ($1, $2, $3, $4, $5, $6, 'vercel-web-analytics', now())
         on conflict (metric_date, environment, analysis_key, event_name) do update set
           event_count = excluded.event_count, visitors = excluded.visitors,
           source = excluded.source, collected_at = excluded.collected_at`,
        [row.date, environment, row.analysis, row.eventName, row.count, row.visitors],
      );
    }
    const rowsWritten = aggregate.trafficSeries.length + aggregate.eventTrend.filter((row) => row.analysis !== null && (row.count > 0 || row.visitors > 0)).length;
    await client.query(
      `update ops.analytics_sync_runs
          set status = 'succeeded', rows_written = $1, finished_at = now(), error_code = null
        where id = $2`,
      [rowsWritten, syncId],
    );
    await client.query("commit");
    return NextResponse.json({ ok: true, since: range.startDate, until: range.endDate, rows: rowsWritten });
  } catch {
    try { await client.query("rollback"); } catch { /* Preserve the original failure. */ }
    if (syncId !== null) {
      try {
        await client.query(
          `update ops.analytics_sync_runs
              set status = 'failed', error_code = 'rollup_failed', finished_at = now()
            where id = $1`,
          [syncId],
        );
      } catch { /* Preserve the original failure. */ }
    }
    return NextResponse.json({ error: "rollup_failed" }, { status: 500 });
  } finally {
    await client.end();
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return runRollup(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runRollup(request);
}
