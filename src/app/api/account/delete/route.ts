import { z } from "zod";
import { deleteOwnMemberAccount, InvalidMemberDataError, MemberAccessError } from "@/server/member/dal";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { BillingInputError } from "@/server/billing/service";

export const runtime = "nodejs";

const deletionRequestSchema = z.object({
  confirmationEmail: z.string().trim().min(3).max(320),
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
  const parsed = deletionRequestSchema.safeParse(body.value);
  if (!parsed.success) return errorResponse(400, "invalid_request");

  try {
    await deleteOwnMemberAccount(parsed.data.confirmationEmail);
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MemberAccessError) {
      return errorResponse(error.reason === "authentication_required" ? 401 : 403, error.reason);
    }
    if (error instanceof BillingInputError && error.reason === "billing_pending_orders") {
      return errorResponse(409, "pending_payment_order");
    }
    if (error instanceof InvalidMemberDataError) return errorResponse(400, "confirmation_did_not_match");
    return errorResponse(503, "account_delete_unavailable");
  }
}
