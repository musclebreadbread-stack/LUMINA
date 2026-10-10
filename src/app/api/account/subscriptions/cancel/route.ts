import { z } from "zod";
import { SubscriptionAccessError, SubscriptionInputError, cancelOwnSubscription } from "@/server/billing/subscriptions";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({ subscriptionId: z.string().uuid() }).strict();

function response(status: number, body: Readonly<Record<string, string | boolean>>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

function isSameOrigin(request: Request): boolean {
  try {
    return request.headers.get("origin") === new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return response(403, { error: "origin_not_allowed" });
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) return response(415, { error: "json_required" });
  const body = await readBoundedJson(request, 1_024);
  if (!body.ok) return response(body.status, { error: "invalid_request" });
  const parsed = requestSchema.safeParse(body.value);
  if (!parsed.success) return response(400, { error: "invalid_request" });
  try {
    const status = await cancelOwnSubscription(parsed.data.subscriptionId);
    return response(200, { ok: true, status });
  } catch (error) {
    if (error instanceof SubscriptionAccessError) {
      const status = error.reason === "authentication_required" ? 401 : error.reason === "consent_required" ? 403 : 503;
      return response(status, { error: error.reason });
    }
    if (error instanceof SubscriptionInputError) return response(400, { error: error.reason });
    await captureServerError(error, "billing-subscription");
    return response(503, { error: "cancellation_unavailable" });
  }
}
