import "server-only";

import type { PaymentProvider, TossPayment } from "./providerTypes";

if (process.env.APP_ENV === "production") {
  throw new Error("The fake payment provider cannot be loaded in production");
}

function fakePayment(orderId: string, amount: number): TossPayment {
  return Object.freeze({
    paymentKey: `fake_${orderId}`,
    orderId,
    status: "DONE",
    totalAmount: amount,
    currency: "KRW",
    method: "FAKE",
    approvedAt: new Date().toISOString(),
  });
}

export const fakePaymentProvider: PaymentProvider = Object.freeze({
  id: "fake",
  async confirmPayment(input: Parameters<PaymentProvider["confirmPayment"]>[0]) { return fakePayment(input.orderId, input.amount); },
  async getPaymentByOrder(orderId: string) { return fakePayment(orderId, 0); },
  async cancelPayment(input: Parameters<PaymentProvider["cancelPayment"]>[0]) { return fakePayment(input.paymentKey.replace(/^fake_/u, ""), 0); },
  async issueBillingKey(input: Parameters<PaymentProvider["issueBillingKey"]>[0]) {
    return Object.freeze({ billingKey: `fake_billing_${input.customerKey}`, customerKey: input.customerKey, method: "FAKE" });
  },
  async chargeBillingKey(input: Parameters<PaymentProvider["chargeBillingKey"]>[0]) { return fakePayment(input.orderId, input.amount); },
  async deleteBillingKey() {},
});
