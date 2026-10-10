import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isAIReportingEnabled } from "@/server/ai/settings";
import { sweepYearForecastNarratives } from "@/server/ai/worker";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.AI_CRON_SECRET;
  if (typeof secret !== "string" || secret.length < 32) return false;
  const authorization = request.headers.get("authorization");
  if (authorization === null || !authorization.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(authorization.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (process.env.APP_ENV !== "production" || !isAIReportingEnabled()) {
    return NextResponse.json({ error: "ai_sweeper_disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await sweepYearForecastNarratives(2);
    return NextResponse.json({ ok: true, selected: result.selected }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await captureServerError(error, "internal-cron");
    return NextResponse.json({ error: "ai_sweeper_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
