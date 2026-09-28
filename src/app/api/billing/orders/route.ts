import { z } from "zod";
import { BillingAccessError, BillingInputError, createPendingOrder } from "@/server/billing/service";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { captureServerError } from "@/server/observability/captureServerError";
import { LOCALES } from "@/i18n/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orderSchema = z.object({
  productKey: z.literal("saju-2027"),
  locale: z.enum(LOCALES),
  acceptedPurchaseTerms: z.literal(true),
  acceptedWithdrawalNotice: z.literal(true),
  acceptedEuWithdrawalWaiver: z.boolean(),
}).strict();

function response(status: number, error: string): Response {
  return Response.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

function isSameOrigin(request: Request): boolean {
  try {
    return request.headers.get("origin") === new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return response(403, "origin_not_allowed");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return response(415, "json_required");
  }
  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return response(body.status, body.status === 413 ? "request_too_large" : "invalid_request");
  const parsed = orderSchema.safeParse(body.value);
  if (!parsed.success) return response(400, "invalid_request");
  const country = request.headers.get("cf-ipcountry")?.trim().toUpperCase();
  try {
    const order = await createPendingOrder({
      ...parsed.data,
      countryCode: country && /^[A-Z]{2}$/u.test(country) ? country : null,
    });
    return Response.json(order, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    if (error instanceof BillingAccessError) {
      const status = error.reason === "authentication_required" ? 401 : error.reason === "consent_required" ? 403 : 503;
      return response(status, error.reason);
    }
    if (error instanceof BillingInputError) return response(400, error.reason);
    // An unexpected failure here (e.g. a missing database grant) otherwise fails
    // silently as a generic 503 — nobody finds out until a person notices orders
    // aren't being created.
    await captureServerError(error, "billing-order");
    return response(503, "billing_unavailable");
  }
}
