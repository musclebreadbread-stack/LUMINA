import { z } from "zod";
import { getSignedInMember } from "@/server/auth/session";
import { hasRequiredMemberConsents } from "@/server/member/consents";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { getOwnMarketingPreference, setOwnMarketingPreference } from "@/server/growth/marketingPreference";
import { isGrowthCapabilityEnabled } from "@/server/growth/featureGate";

export const runtime = "nodejs";

const preferenceSchema = z.object({ subscribed: z.boolean() }).strict();

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSameOrigin(request: Request): boolean {
  try {
    return request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL ?? "").origin;
  } catch {
    return false;
  }
}

async function getAuthorizedMemberId(): Promise<string | null> {
  const session = await getSignedInMember();
  if (!session || !(await hasRequiredMemberConsents(session.user.id))) return null;
  return session.user.id;
}

export async function GET(): Promise<Response> {
  try {
    const userId = await getAuthorizedMemberId();
    if (!userId) return errorResponse(401, "sign_in_or_required_consents_missing");
    return Response.json(await getOwnMarketingPreference(userId), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse(503, "marketing_preference_unavailable");
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "origin_not_allowed");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return errorResponse(415, "json_required");
  }

  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return errorResponse(body.status, body.status === 413 ? "request_too_large" : "invalid_request");
  const parsed = preferenceSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse(400, "invalid_request");
  if (parsed.data.subscribed && !isGrowthCapabilityEnabled("marketingRetention")) {
    return errorResponse(403, "marketing_subscription_not_enabled");
  }

  try {
    const userId = await getAuthorizedMemberId();
    if (!userId) return errorResponse(401, "sign_in_or_required_consents_missing");
    const preference = await setOwnMarketingPreference(userId, parsed.data.subscribed);
    return Response.json(preference, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse(503, "marketing_preference_unavailable");
  }
}
