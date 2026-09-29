import { z } from "zod";
import { getAdminAccess } from "@/server/admin/authorization";
import { TossPaymentError } from "@/server/billing/toss";
import { getPaymentProvider } from "@/server/billing/paymentProvider";
import {
  applyTossCancellation,
  BillingInputError,
  failReservedRefund,
  reserveAdminRefund,
} from "@/server/billing/service";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refundSchema = z.object({
  orderId: z.string().uuid(),
  reasonCode: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,63}$/u),
}).strict();

function json(status: number, error?: string): Response {
  return Response.json(error ? { error } : { ok: true }, {
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
  if (!isSameOrigin(request)) return json(403, "origin_not_allowed");
  const access = await getAdminAccess();
  if (access.status !== "authorized" || access.role !== "owner" || !access.userId) return json(403, "forbidden");
  if (!/^application\/json(?:\s*;|$)/iu.test(request.headers.get("content-type") ?? "")) return json(415, "json_required");
  const body = await readBoundedJson(request, 2_048);
  if (!body.ok) return json(body.status, "invalid_request");
  const parsed = refundSchema.safeParse(body.value);
  if (!parsed.success) return json(400, "invalid_request");

  let reservation: Awaited<ReturnType<typeof reserveAdminRefund>> | null = null;
  try {
    reservation = await reserveAdminRefund(parsed.data.orderId, access.userId, parsed.data.reasonCode);
    const provider = await getPaymentProvider();
    const cancellation = await provider.cancelPayment(
      { paymentKey: reservation.paymentKey, reason: reservation.reasonCode },
      `refund:${reservation.id}`,
    );
    if (cancellation.orderId !== reservation.orderId || cancellation.status !== "CANCELED") return json(503, "refund_processing");
    await applyTossCancellation({
      orderId: reservation.orderId,
      refundId: reservation.id,
      providerRefundId: cancellation.lastTransactionKey ?? null,
    });
    return json(200);
  } catch (error) {
    if (reservation && error instanceof TossPaymentError && error.status >= 400 && error.status < 500) {
      try {
        await failReservedRefund({ refundId: reservation.id, orderId: reservation.orderId, errorCode: "provider_cancel_rejected" });
      } catch {
        // Keep the reservation blocked if its state could not be safely reconciled.
      }
    }
    if (error instanceof BillingInputError) return json(400, error.reason);
    await captureServerError(error, "billing-refund");
    return json(503, "refund_processing");
  }
}
