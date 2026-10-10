import type { TossPayment } from "./providerTypes";

export interface TossRefundReconciliationTarget {
  readonly orderId: string;
  readonly paymentKey: string;
  readonly amount: number;
  readonly currency: string;
}

export function isCompletedFullRefund(
  payment: TossPayment,
  target: TossRefundReconciliationTarget,
): boolean {
  if (!Number.isSafeInteger(target.amount) || target.amount <= 0
    || target.currency !== "KRW"
    || !Number.isSafeInteger(payment.totalAmount)
    || payment.paymentKey !== target.paymentKey
    || payment.orderId !== target.orderId
    || payment.status !== "CANCELED"
    || payment.totalAmount !== target.amount
    || payment.currency !== target.currency
    || payment.balanceAmount !== undefined && payment.balanceAmount !== 0) {
    return false;
  }

  const completedCancellations = payment.cancels?.filter((cancel) => cancel.cancelStatus === "DONE") ?? [];
  if (completedCancellations.length === 0) return false;
  let canceledAmount = 0;
  for (const cancel of completedCancellations) {
    if (!Number.isSafeInteger(cancel.cancelAmount) || cancel.cancelAmount < 0) return false;
    canceledAmount += cancel.cancelAmount;
    if (!Number.isSafeInteger(canceledAmount)) return false;
  }
  return canceledAmount === target.amount;
}

export function reconciledRefundTransactionKey(payment: TossPayment, amount: number): string | null {
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const completedCancellations = payment.cancels?.filter((cancel) => cancel.cancelStatus === "DONE") ?? [];
  if (completedCancellations.length !== 1 || completedCancellations[0]?.cancelAmount !== amount) return null;
  return completedCancellations[0].transactionKey ?? null;
}
