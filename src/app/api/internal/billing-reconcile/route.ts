import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  applyTossPaymentEvent,
  cancelExpiredUnpaidOrder,
  listStuckRefundingOrders,
  listTossReconcileOrders,
  paymentEventHash,
} from "@/server/billing/service";
import { TossPaymentError } from "@/server/billing/toss";
import { getPaymentProvider } from "@/server/billing/paymentProvider";
import { reconcileStuckRefund } from "@/server/billing/reconcileRefunds";
import { billingJobsAllowed } from "@/server/billing/environment";
import { captureServerError } from "@/server/observability/captureServerError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.BILLING_CRON_SECRET;
  if (typeof secret !== "string" || secret.length < 32) return false;
  const authorization = request.headers.get("authorization");
  if (authorization === null || !authorization.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(authorization.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function disabledResponse(): NextResponse {
  return NextResponse.json({ error: "billing_reconcile_disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function reconcile(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!billingJobsAllowed()
    || process.env.BILLING_RECONCILE_ENABLED !== "true"
    || process.env.BILLING_LEGAL_DOCUMENTS_APPROVED !== "true"
    || !process.env.BILLING_DATABASE_URL) {
    return disabledResponse();
  }

  try {
    const orders = await listTossReconcileOrders(20);
    const provider = await getPaymentProvider();
    let checked = 0;
    let applied = 0;
    let duplicates = 0;
    let cancelled = 0;
    let providerFailures = 0;
    const batches: typeof orders[] = [];
    for (let index = 0; index < orders.length; index += 4) batches.push(orders.slice(index, index + 4));

    for (const batch of batches) {
      await Promise.all(batch.map(async (order) => {
        try {
          const payment = await provider.getPaymentByOrder(order.id);
          checked += 1;
          if (payment.orderId !== order.id || payment.status !== "DONE") return;
          const result = await applyTossPaymentEvent({
            eventId: `reconcile:${order.id}:${createHash("sha256").update(payment.paymentKey, "utf8").digest("hex")}`,
            eventType: "PAYMENT_RECONCILED",
            payloadHash: paymentEventHash(payment),
            payment,
          });
          if (result === "applied") applied += 1;
          if (result === "duplicate") duplicates += 1;
        } catch (error) {
          if (error instanceof TossPaymentError && error.status === 404) {
            checked += 1;
            if (order.expiresAt.getTime() <= Date.now() && await cancelExpiredUnpaidOrder(order.id)) cancelled += 1;
            return;
          }
          providerFailures += 1;
        }
      }));
    }

    const stuckRefunds = await listStuckRefundingOrders(20);
    let refundsChecked = 0;
    let refundsRecovered = 0;
    const refundBatches: typeof stuckRefunds[] = [];
    for (let index = 0; index < stuckRefunds.length; index += 4) refundBatches.push(stuckRefunds.slice(index, index + 4));
    for (const batch of refundBatches) {
      await Promise.all(batch.map(async (order) => {
        refundsChecked += 1;
        const outcome = await reconcileStuckRefund(order.id, provider);
        if (outcome === "recovered") refundsRecovered += 1;
        if (outcome === "provider_error") providerFailures += 1;
      }));
    }

    if (providerFailures > 0) {
      return NextResponse.json({ error: "billing_reconcile_incomplete", checked, providerFailures, refundsChecked, refundsRecovered }, {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ ok: true, checked, applied, duplicates, cancelled, refundsChecked, refundsRecovered }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    await captureServerError(error, "internal-cron");
    return NextResponse.json({ error: "billing_reconcile_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return reconcile(request);
}
