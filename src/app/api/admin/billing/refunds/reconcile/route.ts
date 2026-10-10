import { z } from "zod";
import { getAdminAccess } from "@/server/admin/authorization";
import { getPaymentProvider } from "@/server/billing/paymentProvider";
import {
  applyTossCancellation,
  BillingInputError,
  getAdminRefundReconciliationTarget,
} from "@/server/billing/service";
import { isCompletedFullRefund, reconciledRefundTransactionKey } from "@/server/billing/reconciliation";
import { readBoundedJson } from "@/server/http/readBoundedJson";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reconcileSchema = z.object({ orderId: z.string().uuid() }).strict();

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
  const parsed = reconcileSchema.safeParse(body.value);
  if (!parsed.success) return json(400, "invalid_request");

  try {
    const target = await getAdminRefundReconciliationTarget(parsed.data.orderId);
    if (!target) return json(409, "refund_reconciliation_unavailable");
    const payment = await (await getPaymentProvider()).getPaymentByOrder(target.orderId);
    if (!isCompletedFullRefund(payment, target)) return json(409, "provider_state_unconfirmed");
    await applyTossCancellation({
      orderId: target.orderId,
      refundId: target.id,
      providerRefundId: reconciledRefundTransactionKey(payment, target.amount),
    });
    return json(200);
  } catch (error) {
    if (error instanceof BillingInputError) return json(409, error.reason);
    await captureServerError(error, "billing-refund");
    return json(503, "refund_reconciliation_unavailable");
  }
}
