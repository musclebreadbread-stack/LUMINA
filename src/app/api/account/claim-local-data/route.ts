import { z } from "zod";
import { isMemberAuthConfigured } from "@/server/auth";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { claimOwnLocalData, InvalidMemberDataError, MemberAccessError } from "@/server/member/dal";

export const runtime = "nodejs";

const claimSchema = z.object({
  confirm: z.literal(true),
  profile: z.unknown().nullable(),
  snapshots: z.array(z.unknown()).max(32),
}).strict();

function errorResponse(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isMemberAuthConfigured()) return errorResponse(503, "member_account_unavailable");

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(process.env.BETTER_AUTH_URL ?? "").origin;
  } catch {
    return errorResponse(503, "member_account_unavailable");
  }
  if (request.headers.get("origin") !== expectedOrigin) return errorResponse(403, "origin_not_allowed");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return errorResponse(415, "json_required");
  }

  const body = await readBoundedJson(request, 256 * 1_024);
  if (!body.ok) return errorResponse(body.status, body.status === 413 ? "request_too_large" : "invalid_request");
  const parsed = claimSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse(400, "invalid_claim_request");

  try {
    const saved = await claimOwnLocalData(parsed.data.profile, parsed.data.snapshots);
    return Response.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MemberAccessError) {
      return errorResponse(error.reason === "authentication_required" ? 401 : 403, error.reason);
    }
    if (error instanceof InvalidMemberDataError) return errorResponse(400, "invalid_local_data");
    return errorResponse(503, "local_data_save_failed");
  }
}
