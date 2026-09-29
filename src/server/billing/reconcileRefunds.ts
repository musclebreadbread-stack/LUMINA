import "server-only";

import type { PaymentProvider, TossPayment } from "./providerTypes";
import { applyTossCancellation, failReservedRefund, getStuckRefundReservation } from "./service";
import { TossPaymentError } from "./toss";

export type StuckRefundOutcome = "recovered" | "provider_error" | "resolved";

/**
 * Recovers an order stuck in 'refunding' after a Toss cancel call timed out (the
 * reservation stays 'pending' forever otherwise — nothing else retries it until a
 * person happens to revisit the refund UI). Re-checks the real payment status with
 * Toss first: if it actually cancelled, finalizes; if it's still DONE, replays the
 * same cancel call with the reservation's original idempotency key (safe to repeat
 * — Toss returns the original outcome for a repeated key rather than double-
 * cancelling) and routes the result exactly like the refund endpoints do.
 */
export async function reconcileStuckRefund(orderId: string, provider: PaymentProvider): Promise<StuckRefundOutcome> {
  // The whole body is wrapped so this never throws: the caller runs many of these
  // concurrently in a Promise.all, and one order racing a concurrent human retry
  // (e.g. applyTossCancellation's guarded UPDATE matching zero rows because the
  // human's request already finalized it first) must not abort the rest of the batch.
  try {
    const reservation = await getStuckRefundReservation(orderId);
    if (!reservation) return "resolved";

    let payment: TossPayment;
    try {
      payment = await provider.getPaymentByOrder(orderId);
    } catch {
      return "provider_error";
    }
    if (payment.orderId !== orderId) return "provider_error";

    if (payment.status === "CANCELED") {
      await applyTossCancellation({ orderId, refundId: reservation.refundId, providerRefundId: payment.lastTransactionKey ?? null });
      return "recovered";
    }
    if (payment.status !== "DONE") return "provider_error";

    try {
      const cancellation = await provider.cancelPayment(
        { paymentKey: reservation.paymentKey, reason: reservation.reasonCode },
        `refund:${reservation.refundId}`,
      );
      if (cancellation.orderId === orderId && cancellation.status === "CANCELED") {
        await applyTossCancellation({ orderId, refundId: reservation.refundId, providerRefundId: cancellation.lastTransactionKey ?? null });
        return "recovered";
      }
      return "provider_error";
    } catch (error) {
      if (error instanceof TossPaymentError && error.status >= 400 && error.status < 500) {
        await failReservedRefund({ refundId: reservation.refundId, orderId, errorCode: "provider_cancel_rejected" });
        return "recovered";
      }
      return "provider_error";
    }
  } catch {
    return "provider_error";
  }
}
