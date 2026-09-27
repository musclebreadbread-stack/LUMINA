import "server-only";

import { z } from "zod";
import type { BillingAuthorization, PaymentProvider, TossPayment } from "./providerTypes";

export type { BillingAuthorization, TossPayment } from "./providerTypes";

const tossPaymentSchema = z.object({
  paymentKey: z.string().min(1).max(200),
  orderId: z.string().uuid(),
  status: z.string().min(1).max(40),
  totalAmount: z.number().int().nonnegative(),
  currency: z.string().length(3).default("KRW"),
  method: z.string().min(1).max(80),
  approvedAt: z.string().datetime({ offset: true }).nullable().optional(),
  lastTransactionKey: z.string().max(200).nullable().optional(),
});

const billingAuthorizationSchema = z.object({
  billingKey: z.string().min(1).max(200),
  customerKey: z.string().min(2).max(50),
  method: z.string().min(1).max(80),
});

export class TossPaymentError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super("Payment provider request failed");
    this.name = "TossPaymentError";
  }
}

function authorizationHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY?.trim();
  if (!secret || /[\r\n]/u.test(secret)) throw new Error("TOSS_SECRET_KEY is not configured");
  return `Basic ${Buffer.from(`${secret}:`, "utf8").toString("base64")}`;
}

async function requestPayment(path: string, body: unknown, idempotencyKey: string): Promise<TossPayment> {
  if (!/^[a-zA-Z0-9:_-]{1,200}$/u.test(idempotencyKey)) throw new Error("Invalid payment idempotency key");
  let response: Response;
  try {
    response = await fetch(`https://api.tosspayments.com/v1/payments/${path}`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(),
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TossPaymentError(503, "provider_unavailable");
  }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new TossPaymentError(response.status, "provider_rejected");
  const parsed = tossPaymentSchema.safeParse(value);
  if (!parsed.success) throw new TossPaymentError(502, "invalid_provider_response");
  return parsed.data;
}

async function requestBillingApi(
  path: string,
  body: unknown,
  idempotencyKey: string | null,
  timeoutMs: number,
): Promise<unknown> {
  if (idempotencyKey !== null && !/^[a-zA-Z0-9:_-]{1,200}$/u.test(idempotencyKey)) {
    throw new Error("Invalid payment idempotency key");
  }
  let response: Response;
  try {
    response = await fetch(`https://api.tosspayments.com/v1/billing/${path}`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(),
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new TossPaymentError(503, "provider_unavailable");
  }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new TossPaymentError(response.status, "provider_rejected");
  return value;
}

export function confirmTossPayment(input: Readonly<{ paymentKey: string; orderId: string; amount: number }>): Promise<TossPayment> {
  return requestPayment("confirm", input, `confirm:${input.orderId}`);
}

export function cancelTossPayment(input: Readonly<{ paymentKey: string; reason: string }>, idempotencyKey: string): Promise<TossPayment> {
  return requestPayment(`${encodeURIComponent(input.paymentKey)}/cancel`, { cancelReason: input.reason }, idempotencyKey);
}

export async function getTossPaymentByOrder(orderId: string): Promise<TossPayment> {
  const id = z.string().uuid().parse(orderId);
  let response: Response;
  try {
    response = await fetch(`https://api.tosspayments.com/v1/payments/orders/${id}`, {
      headers: { Authorization: authorizationHeader() },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TossPaymentError(503, "provider_unavailable");
  }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new TossPaymentError(response.status, "provider_rejected");
  const parsed = tossPaymentSchema.safeParse(value);
  if (!parsed.success) throw new TossPaymentError(502, "invalid_provider_response");
  return parsed.data;
}

export async function issueTossBillingKey(input: Readonly<{ authKey: string; customerKey: string }>): Promise<BillingAuthorization> {
  if (input.authKey.length < 1 || input.authKey.length > 300 || /[\r\n]/u.test(input.authKey)
    || input.customerKey.length < 2 || input.customerKey.length > 50 || /[\r\n]/u.test(input.customerKey)) {
    throw new TossPaymentError(400, "invalid_billing_authorization");
  }
  const value = await requestBillingApi("authorizations/issue", input, null, 10_000);
  const parsed = billingAuthorizationSchema.safeParse(value);
  if (!parsed.success || parsed.data.customerKey !== input.customerKey) {
    throw new TossPaymentError(502, "invalid_provider_response");
  }
  return parsed.data;
}

export async function chargeTossBillingKey(
  input: Readonly<{
    billingKey: string;
    customerKey: string;
    orderId: string;
    orderName: string;
    amount: number;
    customerEmail: string;
  }>,
  idempotencyKey: string,
): Promise<TossPayment> {
  if (!/^[A-Za-z0-9_-]{6,64}$/u.test(input.orderId)
    || !Number.isSafeInteger(input.amount) || input.amount <= 0
    || input.customerKey.length < 2 || input.customerKey.length > 50
    || input.orderName.length < 1 || input.orderName.length > 100
    || input.customerEmail.length < 3 || input.customerEmail.length > 254
    || input.billingKey.length < 1 || input.billingKey.length > 200) {
    throw new TossPaymentError(400, "invalid_billing_charge");
  }
  const value = await requestBillingApi(encodeURIComponent(input.billingKey), {
    customerKey: input.customerKey,
    orderId: input.orderId,
    orderName: input.orderName,
    amount: input.amount,
    customerEmail: input.customerEmail,
  }, idempotencyKey, 65_000);
  const parsed = tossPaymentSchema.safeParse(value);
  if (!parsed.success) throw new TossPaymentError(502, "invalid_provider_response");
  return parsed.data;
}

export async function deleteTossBillingKey(billingKey: string): Promise<void> {
  if (!billingKey || billingKey.length > 200 || /[\r\n]/u.test(billingKey)) {
    throw new TossPaymentError(400, "invalid_billing_key");
  }
  let response: Response;
  try {
    response = await fetch(`https://api.tosspayments.com/v1/billing/${encodeURIComponent(billingKey)}`, {
      method: "DELETE",
      headers: { Authorization: authorizationHeader() },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new TossPaymentError(503, "provider_unavailable");
  }
  if (!response.ok) throw new TossPaymentError(response.status, "provider_rejected");
}

export const tossPaymentProvider: PaymentProvider = Object.freeze({
  id: "toss",
  confirmPayment: confirmTossPayment,
  getPaymentByOrder: getTossPaymentByOrder,
  cancelPayment: cancelTossPayment,
  issueBillingKey: issueTossBillingKey,
  chargeBillingKey: chargeTossBillingKey,
  deleteBillingKey: deleteTossBillingKey,
});
