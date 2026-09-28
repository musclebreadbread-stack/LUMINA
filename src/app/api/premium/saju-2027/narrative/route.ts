import { after, NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/locale";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { getSignedInMember } from "@/server/auth/session";
import { hasRequiredMemberConsents } from "@/server/member/consents";
import { MemberAccessError, getOwnProfile } from "@/server/member/dal";
import { getOwnActiveEntitlementId } from "@/server/billing/service";
import { enqueueYearForecastNarrative, getOwnYearForecastNarrative, AIQuotaError } from "@/server/ai/service";
import { buildYearForecastFacts } from "@/server/ai/facts";
import { isAIReportingEnabled } from "@/server/ai/settings";
import { processYearForecastNarrative } from "@/server/ai/worker";
import { forecastFromProfile } from "@/server/premium/forecastFromProfile";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const requestSchema = (value: unknown): value is { locale: Locale } => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return Object.keys(candidate).length === 1
    && typeof candidate.locale === "string"
    && isLocale(candidate.locale);
};

function json(status: number, value: Readonly<Record<string, string | boolean | null>>): NextResponse {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

async function getMember() {
  const session = await getSignedInMember();
  if (!session || !(await hasRequiredMemberConsents(session.user.id))) return null;
  return session.user;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAIReportingEnabled()) return json(503, { error: "ai_narrative_disabled" });
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return json(415, { error: "json_required" });
  }
  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return json(body.status, { error: "invalid_request" });
  if (!requestSchema(body.value)) return json(400, { error: "invalid_request" });

  let user;
  try {
    user = await getMember();
  } catch (error) {
    await captureServerError(error, "ai-narrative");
    return json(503, { error: "member_unavailable" });
  }
  if (!user) return json(401, { error: "authentication_required" });

  try {
    const [entitlementId, profile] = await Promise.all([getOwnActiveEntitlementId("saju-2027"), getOwnProfile()]);
    if (!entitlementId) return json(403, { error: "entitlement_required" });
    if (!profile) return json(409, { error: "profile_required" });
    const forecast = forecastFromProfile(profile);
    const facts = buildYearForecastFacts(forecast);
    const narrative = await enqueueYearForecastNarrative({
      userId: user.id,
      entitlementId,
      locale: body.value.locale,
      facts,
    });
    if (narrative.status === "queued") {
      after(async () => {
        await processYearForecastNarrative(narrative.id).catch((error: unknown) => captureServerError(error, "ai-narrative"));
      });
    }
    return NextResponse.json(narrative, { status: narrative.status === "queued" ? 202 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AIQuotaError) return json(429, { error: error.reason });
    if (error instanceof MemberAccessError) {
      await captureServerError(error, "ai-narrative");
      return json(503, { error: "member_unavailable" });
    }
    await captureServerError(error, "ai-narrative");
    return json(503, { error: "narrative_request_unavailable" });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAIReportingEnabled()) return json(503, { error: "ai_narrative_disabled" });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
    return json(400, { error: "invalid_request" });
  }
  let user;
  try {
    user = await getMember();
  } catch (error) {
    await captureServerError(error, "ai-narrative");
    return json(503, { error: "member_unavailable" });
  }
  if (!user) return json(401, { error: "authentication_required" });
  try {
    const result = await getOwnYearForecastNarrative(user.id, id);
    if (!result) return json(404, { error: "narrative_not_found" });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await captureServerError(error, "ai-narrative");
    return json(503, { error: "narrative_status_unavailable" });
  }
}
