import { z } from "zod";
import { TossPaymentError } from "@/server/billing/toss";
import { getPaymentProvider } from "@/server/billing/paymentProvider";
import {
  applyTossCancellation,
  BillingAccessError,
  BillingInputError,
  failReservedRefund,
  reserveOwnRefund,
} from "@/server/billing/service";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refundSchema = z.object({
  orderId: z.string().uuid(),
  reasonCode: z.enum(["changed_mind", "duplicate_purchase", "access_issue"]),
}).strict();

function response(status: number, value: Readonly<Record<string, boolean | string>>): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
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
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) {
    return response(415, { error: "json_required" });
  }
  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return response(body.status, { error: "invalid_request" });
  const parsed = refundSchema.safeParse(body.value);
  if (!parsed.success) return response(400, { error: "invalid_request" });

  let reservation: Awaited<ReturnType<typeof reserveOwnRefund>> | null = null;
  try {
    reservation = await reserveOwnRefund(parsed.data.orderId, parsed.data.reasonCode);
    const provider = await getPaymentProvider();
    const cancellation = await provider.cancelPayment(
      { paymentKey: reservation.paymentKey, reason: reservation.reasonCode },
      `refund:${reservation.id}`,
    );
    if (cancellation.orderId !== reservation.orderId || cancellation.status !== "CANCELED") {
      return response(503, { error: "refund_processing" });
    }
    await applyTossCancellation({
      orderId: reservation.orderId,
      refundId: reservation.id,
      providerRefundId: cancellation.lastTransactionKey ?? null,
    });
    return response(200, { ok: true });
  } catch (error) {
    if (reservation && error instanceof TossPaymentError && error.status >= 400 && error.status < 500) {
      try {
        await failReservedRefund({ refundId: reservation.id, orderId: reservation.orderId, errorCode: "provider_cancel_rejected" });
      } catch {
        // Keep the reservation blocked if its state could not be safely reconciled.
      }
    }
    if (error instanceof BillingAccessError) {
      return response(error.reason === "authentication_required" ? 401 : error.reason === "consent_required" ? 403 : 503, { error: error.reason });
    }
    if (error instanceof BillingInputError) return response(400, { error: error.reason });
    await captureServerError(error, "billing-refund");
    return response(503, { error: "refund_processing" });
  }
}
