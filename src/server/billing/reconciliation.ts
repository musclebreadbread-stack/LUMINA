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

/*
 * 완료된 취소의 Toss 거래키를 원장 참조로 남긴다. 부분 취소가 여러 건이면 응답 순서대로 쉼표로 잇는다.
 * 합계가 맞지 않거나 거래키가 하나라도 없으면 일부만 남겨 오해를 만들지 않도록 null을 돌려준다.
 */
export function reconciledRefundTransactionKey(payment: TossPayment, amount: number): string | null {
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const completedCancellations = payment.cancels?.filter((cancel) => cancel.cancelStatus === "DONE") ?? [];
  if (completedCancellations.length === 0) return null;
  if (completedCancellations.some((cancel) => !Number.isSafeInteger(cancel.cancelAmount) || cancel.cancelAmount < 0)) {
    return null;
  }
  const canceledAmount = completedCancellations.reduce((sum, cancel) => sum + cancel.cancelAmount, 0);
  if (!Number.isSafeInteger(canceledAmount) || canceledAmount !== amount) return null;
  const transactionKeys = completedCancellations.map((cancel) => cancel.transactionKey?.trim() ?? "");
  if (transactionKeys.some((key) => key === "")) return null;
  return transactionKeys.join(",");
}
