import { z } from "zod";
import { createMemberConsentGrant, memberConsentGrantCookie } from "@/server/auth/consentGrant";
import { isMemberAuthConfigured } from "@/server/auth";
import { readBoundedJson } from "@/server/http/readBoundedJson";

export const runtime = "nodejs";

const grantSchema = z.object({
  terms: z.literal(true),
  privacy: z.literal(true),
  overseasTransfer: z.literal(true),
}).strict();

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isMemberAuthConfigured()) return errorResponse(503, "member_account_unavailable");

  let expectedOrigin: string;
  let secureCookie: boolean;
  try {
    const baseUrl = new URL(process.env.BETTER_AUTH_URL ?? "");
    expectedOrigin = baseUrl.origin;
    secureCookie = baseUrl.protocol === "https:";
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

  if (!grantSchema.safeParse(body.value).success) {
    return errorResponse(400, "required_consents_missing");
  }

  try {
    const grant = createMemberConsentGrant();
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": memberConsentGrantCookie(grant, secureCookie),
      },
    });
  } catch {
    return errorResponse(503, "consent_grant_unavailable");
  }
}
