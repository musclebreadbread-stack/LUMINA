import { createNeonSql } from "@/lib/neon/server";

/**
 * Unlike /api/health (a pure liveness check), this pings the database so an
 * uptime monitor can distinguish "the app is up" from "the app is up but
 * every request will 503". Deliberately doesn't report failures to Sentry —
 * this is meant to be polled every few seconds by infra, and doing so would
 * turn one outage into a continuous stream of identical events.
 */
export async function GET(): Promise<Response> {
  try {
    const sql = createNeonSql();
    await sql`select 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Readiness check: database ping failed", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
