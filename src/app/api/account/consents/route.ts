import { z } from "zod";
import { getMemberAuth, isMemberAuthConfigured } from "@/server/auth";
import { memberConsentGrantCookie } from "@/server/auth/consentGrant";
import { getActiveConsentVersions, recordRequiredMemberConsents } from "@/server/member/consents";
import { readBoundedJson } from "@/server/http/readBoundedJson";

export const runtime = "nodejs";

const consentSchema = z.object({
  terms: z.literal(true),
  privacy: z.literal(true),
  overseasTransfer: z.literal(true),
}).strict();

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isMemberAuthConfigured() || !getActiveConsentVersions()) {
    return errorResponse(503, "member_account_unavailable");
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(process.env.BETTER_AUTH_URL ?? "").origin;
  } catch {
    return errorResponse(503, "member_account_unavailable");
  }
  if (request.headers.get("origin") !== expectedOrigin) {
    return errorResponse(403, "origin_not_allowed");
  }
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return errorResponse(415, "json_required");
  }

  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return errorResponse(body.status, body.status === 413 ? "request_too_large" : "invalid_request");

  const parsed = consentSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse(400, "required_consents_missing");

  try {
    const session = await getMemberAuth().api.getSession({ headers: request.headers });
    if (!session) return errorResponse(401, "sign_in_required");
    await recordRequiredMemberConsents(session.user.id);
    const secureCookie = new URL(process.env.BETTER_AUTH_URL ?? "").protocol === "https:";
    return Response.json({ saved: true }, {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": memberConsentGrantCookie(null, secureCookie),
      },
    });
  } catch {
    return errorResponse(503, "consent_save_failed");
  }
}
