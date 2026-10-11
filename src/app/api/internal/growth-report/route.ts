import { NextResponse } from "next/server";
import {
  buildGrowthReport,
  isAuthorizedGrowthReport,
  resolveGrowthReportRange,
} from "@/server/growth/report";
import { captureServerError } from "@/server/observability/captureServerError";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Hermes 성장 운영 에이전트용 읽기 전용 KPI. `GROWTH_REPORT_SECRET`(32자 이상)을
 * Bearer로 받아야 하며, 값이 없으면 항상 401이다. 쓰기·DB 접근은 하지 않는다.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedGrowthReport(request, process.env.GROWTH_REPORT_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const range = resolveGrowthReportRange(new URL(request.url).searchParams.get("days"));
  try {
    const report = await buildGrowthReport(range);
    if (report === "umami_not_configured") {
      return NextResponse.json({ error: report }, { status: 503, headers: NO_STORE });
    }
    return NextResponse.json(report, { headers: NO_STORE });
  } catch (error) {
    await captureServerError(error, "internal-cron");
    return NextResponse.json({ error: "growth_report_failed" }, { status: 502, headers: NO_STORE });
  }
}
