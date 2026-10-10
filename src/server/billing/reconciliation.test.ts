import { describe, expect, it } from "vitest";
import type { TossPayment } from "./providerTypes";
import { isCompletedFullRefund, reconciledRefundTransactionKey } from "./reconciliation";

const target = {
  orderId: "123e4567-e89b-42d3-a456-426614174000",
  paymentKey: "provider-payment-key",
  amount: 9_900,
  currency: "KRW",
} as const;

const fullyCanceledPayment: TossPayment = {
  paymentKey: target.paymentKey,
  orderId: target.orderId,
  status: "CANCELED",
  totalAmount: target.amount,
  balanceAmount: 0,
  currency: target.currency,
  method: "카드",
  cancels: [{ cancelAmount: target.amount, cancelStatus: "DONE", transactionKey: "cancel-transaction-1" }],
};

describe("Toss refund reconciliation", () => {
  it("accepts an exact full cancellation and retains its provider transaction key", () => {
    expect(isCompletedFullRefund(fullyCanceledPayment, target)).toBe(true);
    expect(reconciledRefundTransactionKey(fullyCanceledPayment, target.amount)).toBe("cancel-transaction-1");
  });

  it("accepts multiple completed cancellations only when their sum equals the order amount", () => {
    const payment: TossPayment = {
      ...fullyCanceledPayment,
      cancels: [
        { cancelAmount: 4_000, cancelStatus: "DONE", transactionKey: "cancel-part-1" },
        { cancelAmount: 5_900, cancelStatus: "DONE", transactionKey: "cancel-part-2" },
      ],
    };

    expect(isCompletedFullRefund(payment, target)).toBe(true);
    expect(reconciledRefundTransactionKey(payment, target.amount)).toBeNull();
  });

  it.each([
    { ...fullyCanceledPayment, status: "PARTIAL_CANCELED" },
    { ...fullyCanceledPayment, cancels: [{ cancelAmount: 9_900, cancelStatus: "IN_PROGRESS" }] },
    { ...fullyCanceledPayment, cancels: [{ cancelAmount: 9_899, cancelStatus: "DONE" }] },
    { ...fullyCanceledPayment, balanceAmount: 1 },
    { ...fullyCanceledPayment, currency: "USD" },
    { ...fullyCanceledPayment, orderId: "123e4567-e89b-42d3-a456-426614174001" },
    { ...fullyCanceledPayment, paymentKey: "another-payment-key" },
  ] satisfies readonly TossPayment[])("rejects an unproven or mismatched provider state", (payment) => {
    expect(isCompletedFullRefund(payment, target)).toBe(false);
  });

  it("rejects a canceled payment without a provider cancellation ledger", () => {
    expect(isCompletedFullRefund({ ...fullyCanceledPayment, cancels: null }, target)).toBe(false);
  });

  it("does not reconcile outside the currently supported KRW billing currency", () => {
    const usdPayment: TossPayment = { ...fullyCanceledPayment, currency: "USD" };

    expect(isCompletedFullRefund(usdPayment, { ...target, currency: "USD" })).toBe(false);
  });
});
