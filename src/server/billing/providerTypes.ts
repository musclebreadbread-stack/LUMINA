export interface PaymentProvider {
  readonly id: "toss" | "fake";
  confirmPayment(input: Readonly<{ paymentKey: string; orderId: string; amount: number }>): Promise<TossPayment>;
  getPaymentByOrder(orderId: string): Promise<TossPayment>;
  cancelPayment(input: Readonly<{ paymentKey: string; reason: string }>, idempotencyKey: string): Promise<TossPayment>;
  issueBillingKey(input: Readonly<{ authKey: string; customerKey: string }>): Promise<BillingAuthorization>;
  chargeBillingKey(input: Readonly<{
    billingKey: string;
    customerKey: string;
    orderId: string;
    orderName: string;
    amount: number;
    customerEmail: string;
  }>, idempotencyKey: string): Promise<TossPayment>;
  deleteBillingKey(billingKey: string): Promise<void>;
}

export interface TossPayment {
  readonly paymentKey: string;
  readonly orderId: string;
  readonly status: string;
  readonly totalAmount: number;
  readonly currency: string;
  readonly method: string;
  readonly approvedAt?: string | null;
  readonly lastTransactionKey?: string | null;
}

export interface BillingAuthorization {
  readonly billingKey: string;
  readonly customerKey: string;
  readonly method: string;
}
