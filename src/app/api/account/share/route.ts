import { z } from "zod";
import { createOwnShareLink, InvalidMemberDataError, MemberAccessError } from "@/server/member/dal";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { LOCALES } from "@/i18n/locale";

export const runtime = "nodejs";

const shareRequestSchema = z.object({
  snapshotId: z.string().uuid(),
  locale: z.enum(LOCALES).default("ko"),
}).strict();

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

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "origin_not_allowed");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return errorResponse(415, "json_required");
  }

  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return errorResponse(body.status, body.status === 413 ? "request_too_large" : "invalid_request");
  const parsed = shareRequestSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse(400, "invalid_request");

  try {
    const share = await createOwnShareLink(parsed.data.snapshotId, parsed.data.locale);
    return Response.json(share, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MemberAccessError) {
      return errorResponse(error.reason === "authentication_required" ? 401 : 403, error.reason);
    }
    if (error instanceof InvalidMemberDataError) return errorResponse(404, "saved_result_not_found");
    return errorResponse(503, "share_unavailable");
  }
}
