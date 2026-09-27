import { z } from "zod";
import { InvalidMemberDataError, MemberAccessError, revokeOwnShareLink } from "@/server/member/dal";

export const runtime = "nodejs";

const idSchema = z.string().uuid();

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

export async function DELETE(
  request: Request,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return errorResponse(403, "origin_not_allowed");
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return errorResponse(400, "invalid_request");

  try {
    const revoked = await revokeOwnShareLink(id);
    return Response.json({ revoked }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MemberAccessError) {
      return errorResponse(error.reason === "authentication_required" ? 401 : 403, error.reason);
    }
    if (error instanceof InvalidMemberDataError) return errorResponse(400, "invalid_request");
    return errorResponse(503, "share_revoke_unavailable");
  }
}
