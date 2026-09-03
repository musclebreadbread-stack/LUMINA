import { readFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";

const envFile = process.env.NEON_ENV_FILE ?? ".env.staging.admin.local";
const allowedEnvFiles = [".env.staging.admin.local", ".env.production.admin.local", ".env.local"];
if (!allowedEnvFiles.includes(envFile)) throw new Error("Analytics rollup requires an approved admin env file");

const envPath = new URL(`../${envFile}`, import.meta.url);
const envContents = await readFile(envPath, "utf8");
for (const line of envContents.split(/\r?\n/u)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
  if (!match || process.env[match[1]] !== undefined) continue;
  process.env[match[1]] = match[2].replace(/^"|"$/gu, "");
}

if ([".env.production.admin.local", ".env.local"].includes(envFile) && process.env.NEON_ALLOW_PRODUCTION !== "1") {
  throw new Error("Refusing to run the analytics rollup against production without NEON_ALLOW_PRODUCTION=1");
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const projectId = process.env.VERCEL_PROJECT_ID;
const readToken = process.env.VERCEL_ANALYTICS_READ_TOKEN;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED is not configured");
if (!projectId || !readToken) throw new Error("VERCEL_PROJECT_ID and VERCEL_ANALYTICS_READ_TOKEN are required");

const ANALYSES = [
  "saju", "astro", "tarot", "numerology", "psychometrics", "jungian",
  "darktriad", "attachment", "eq", "cognitive", "horoscope", "compatibility",
  "integrated-report",
];
const ANALYTICS_ROLLUP_ENVIRONMENT = "production";
const EVENT_NAMES = [
  "solution_entry", "test_start", "test_complete", "result_view", "share_open",
  "share_image_saved", "compatibility_compare", "integrated_report_view",
  "share_landing_view", "share_landing_cta",
];
const API_BASE = "https://api.vercel.com/v1/query/web-analytics";
const TIME_ZONE = "Asia/Seoul";
const DAY_MS = 86_400_000;

function argumentValue(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function seoulDate(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year") ?? "1970"}-${values.get("month") ?? "01"}-${values.get("day") ?? "01"}`;
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  return Math.floor((Date.parse(`${end}T00:00:00.000Z`) - Date.parse(`${start}T00:00:00.000Z`)) / DAY_MS) + 1;
}

function seoulIso(value, endOfDay) {
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${value}T${time}+09:00`).toISOString();
}

function finiteCount(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.min(Math.round(value), Number.MAX_SAFE_INTEGER);
  if (typeof value === "string" && /^\d+(\.\d+)?$/u.test(value)) return Math.min(Math.round(Number(value)), Number.MAX_SAFE_INTEGER);
  return 0;
}

function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function rowDate(row) {
  const direct = [row.day, row.date].find((value) => typeof value === "string" && isDate(value));
  if (direct) return direct;
  if (typeof row.timestamp !== "string" || Number.isNaN(Date.parse(row.timestamp))) return null;
  return seoulDate(new Date(row.timestamp));
}

function rowAnalysis(row) {
  const eventData = row["eventData/analysis"] ?? row["eventData.analysis"] ?? row.analysis ?? row.eventData;
  if (typeof eventData === "string" && ANALYSES.includes(eventData)) return eventData;
  const dataRecord = record(eventData);
  if (dataRecord && typeof dataRecord.analysis === "string" && ANALYSES.includes(dataRecord.analysis)) return dataRecord.analysis;
  return null;
}

function rowList(payload) {
  const root = record(payload);
  if (!root || !Array.isArray(root.data)) throw new Error("Vercel Analytics returned an invalid aggregate response");
  return root.data.filter((value) => record(value));
}

function appendTeamScope(params) {
  if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID);
  else if (process.env.VERCEL_TEAM_SLUG) params.set("slug", process.env.VERCEL_TEAM_SLUG);
}

async function fetchAggregate(resource, dimensions, since, until, filter = null) {
  const params = new URLSearchParams({
    projectId,
    since: seoulIso(since, false),
    until: seoulIso(until, true),
    limit: "1000",
  });
  for (const dimension of dimensions) params.append("by", dimension);
  if (filter) params.set("filter", filter);
  appendTeamScope(params);
  const response = await fetch(`${API_BASE}/${resource}/aggregate?${params.toString()}`, {
    headers: { Authorization: `Bearer ${readToken}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Vercel Analytics request failed: ${response.status}`);
  return rowList(await response.json());
}

function trafficRows(rows, start, end) {
  const byDate = new Map(rows.map((row) => {
    const date = rowDate(row);
    return date ? [date, { pageviews: finiteCount(row.pageviews), visitors: finiteCount(row.visitors) }] : ["", null];
  }).filter(([date, value]) => date !== "" && value !== null));
  const result = [];
  for (let offset = 0; offset < daysBetween(start, end); offset += 1) {
    const date = shiftDate(start, offset);
    const value = byDate.get(date) ?? { pageviews: 0, visitors: 0 };
    result.push({ date, ...value });
  }
  return result;
}

function eventRows(rows, eventName) {
  return rows.flatMap((row) => {
    const date = rowDate(row);
    const analysis = rowAnalysis(row);
    return date && analysis
      ? [{ date, analysis, eventName, count: finiteCount(row.count), visitors: finiteCount(row.visitors) }]
      : [];
  });
}

const requestedSince = argumentValue("since") ?? shiftDate(seoulDate(new Date()), -2);
const requestedUntil = argumentValue("until") ?? seoulDate(new Date());
if (!isDate(requestedSince) || !isDate(requestedUntil) || requestedSince > requestedUntil) {
  throw new Error("--since and --until must be valid YYYY-MM-DD dates with since <= until");
}
if (daysBetween(requestedSince, requestedUntil) > 31) throw new Error("Analytics rollup range cannot exceed 31 days");

const configuredEnvironment = process.env.VERCEL_ANALYTICS_ENVIRONMENT?.trim();
if (configuredEnvironment && configuredEnvironment !== ANALYTICS_ROLLUP_ENVIRONMENT) {
  throw new Error("Analytics rollup only supports the production environment");
}
const environment = ANALYTICS_ROLLUP_ENVIRONMENT;
const client = new Client(databaseUrl);
let syncId = null;
try {
  await client.connect();
  const sync = await client.query(
    `insert into ops.analytics_sync_runs (source, requested_since, requested_until, status)
     values ($1, $2, $3, 'running') returning id`,
    ["vercel-web-analytics", requestedSince, requestedUntil],
  );
  syncId = sync.rows[0]?.id ?? null;

  const traffic = trafficRows(
    await fetchAggregate("visits", ["day"], requestedSince, requestedUntil),
    requestedSince,
    requestedUntil,
  );
  const events = [];
  for (const eventName of EVENT_NAMES) {
    const rows = await fetchAggregate(
      "events",
      ["day", "eventData/analysis"],
      requestedSince,
      requestedUntil,
      `eventName eq '${eventName}'`,
    );
    events.push(...eventRows(rows, eventName));
  }

  await client.query("begin");
  // Rebuild the event window atomically so corrected zero/missing rows cannot
  // leave stale daily_solution_events values behind.
  await client.query(
    `delete from ops.daily_solution_events
      where environment = $1 and metric_date between $2 and $3`,
    [environment, requestedSince, requestedUntil],
  );
  for (const row of traffic) {
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
  for (const row of events) {
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
  await client.query(
    `update ops.analytics_sync_runs
        set status = 'succeeded', rows_written = $1, finished_at = now(), error_code = null
      where id = $2`,
    [traffic.length + events.length, syncId],
  );
  await client.query("commit");
  console.log(`Neon analytics rollup completed: ${traffic.length + events.length} aggregate rows.`);
} catch (error) {
  try { await client.query("rollback"); } catch { /* Preserve the original error. */ }
  if (syncId !== null) {
    try {
      await client.query(
        `update ops.analytics_sync_runs
            set status = 'failed', error_code = 'rollup_failed', finished_at = now()
          where id = $1`,
        [syncId],
      );
    } catch { /* Preserve the original error. */ }
  }
  throw error;
} finally {
  await client.end();
}
