import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelTossPayment, chargeTossBillingKey, confirmTossPayment, deleteTossBillingKey, getTossPaymentByOrder, isDefinitiveTossCancelRejection, issueTossBillingKey, TossPaymentError } from "./toss";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const paymentKey = "toss-payment-key";
const paymentResponse = {
  paymentKey,
  orderId,
  status: "DONE",
  totalAmount: 9_900,
  balanceAmount: 9_900,
  currency: "KRW",
  method: "카드",
  approvedAt: "2026-09-30T00:00:00.000Z",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestOptions(): RequestInit {
  const options = fetchMock.mock.calls[0]?.[1];
  if (typeof options !== "object" || options === null) throw new Error("Fetch options were not captured");
  return options as RequestInit;
}

function requestHeaders(): Record<string, string> {
  const headers = requestOptions().headers;
  if (typeof headers !== "object" || headers === null || headers instanceof Headers) {
    throw new Error("Fetch headers were not captured as an object");
  }
  return headers as Record<string, string>;
}

describe("Toss payment adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TOSS_SECRET_KEY", "test-secret-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(response(paymentResponse));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("confirms an order with the server idempotency key and a sanitized authorization header", async () => {
    const result = await confirmTossPayment({ paymentKey, orderId, amount: 9_900 });

    expect(result.paymentKey).toBe(paymentKey);
    expect(fetchMock).toHaveBeenCalledWith("https://api.tosspayments.com/v1/payments/confirm", expect.any(Object));
    expect(requestOptions()).toMatchObject({
      method: "POST",
      cache: "no-store",
      body: JSON.stringify({ paymentKey, orderId, amount: 9_900 }),
    });
    expect(requestHeaders()).toEqual(expect.objectContaining({
      Authorization: `Basic ${Buffer.from("test-secret-key:").toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `confirm:${orderId}`,
    }));
  });

  it("cancels a payment with an encoded payment key, reason, and caller idempotency key", async () => {
    await cancelTossPayment({ paymentKey: "key/with space", reason: "customer_support" }, "refund:refund-1");

    expect(fetchMock).toHaveBeenCalledWith("https://api.tosspayments.com/v1/payments/key%2Fwith%20space/cancel", expect.any(Object));
    expect(requestOptions().body).toBe(JSON.stringify({ cancelReason: "customer_support" }));
    expect(requestHeaders()["Idempotency-Key"]).toBe("refund:refund-1");
  });

  it("reads the provider cancellation ledger without caching it", async () => {
    fetchMock.mockResolvedValue(response({
      ...paymentResponse,
      status: "CANCELED",
      balanceAmount: 0,
      cancels: [{ cancelAmount: 9_900, cancelStatus: "DONE", transactionKey: "cancel-1" }],
    }));

    const result = await getTossPaymentByOrder(orderId);

    expect(fetchMock).toHaveBeenCalledWith(`https://api.tosspayments.com/v1/payments/orders/${orderId}`, expect.any(Object));
    expect(requestOptions()).toMatchObject({ cache: "no-store" });
    expect(result.cancels?.[0]).toEqual({ cancelAmount: 9_900, cancelStatus: "DONE", transactionKey: "cancel-1" });
  });

  it("rejects non-UUID order lookups before making a network request", async () => {
    await expect(getTossPaymentByOrder("not-an-order-id")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("converts transport failures to a generic provider-unavailable error", async () => {
    fetchMock.mockRejectedValue(new Error("private transport detail"));

    await expect(confirmTossPayment({ paymentKey, orderId, amount: 9_900 }))
      .rejects.toMatchObject({ name: "TossPaymentError", status: 503, code: "provider_unavailable", message: "Payment provider request failed" });
  });

  it("keeps provider rejection details out of the application error", async () => {
    fetchMock.mockResolvedValue(response({ message: "sensitive provider detail" }, 409));

    await expect(getTossPaymentByOrder(orderId))
      .rejects.toMatchObject({ name: "TossPaymentError", status: 409, code: "provider_rejected", message: "Payment provider request failed" });
  });

  it("exposes only a validated provider error code for safe cancellation recovery decisions", async () => {
    fetchMock.mockResolvedValue(response({ code: "INVALID_REQUEST", message: "sensitive provider detail" }, 400));

    await expect(cancelTossPayment({ paymentKey, reason: "customer_support" }, "refund:refund-1"))
      .rejects.toMatchObject({ providerCode: "INVALID_REQUEST", message: "Payment provider request failed" });
    expect(isDefinitiveTossCancelRejection(new TossPaymentError(400, "provider_rejected", "INVALID_REQUEST"))).toBe(true);
    expect(isDefinitiveTossCancelRejection(new TossPaymentError(403, "provider_rejected", "NOT_CANCELABLE_PAYMENT"))).toBe(true);
    expect(isDefinitiveTossCancelRejection(new TossPaymentError(403, "provider_rejected", "EXCEED_MAX_REFUND_DUE"))).toBe(true);
    expect(isDefinitiveTossCancelRejection(new TossPaymentError(400, "provider_rejected", "ALREADY_CANCELED_PAYMENT"))).toBe(false);
    expect(isDefinitiveTossCancelRejection(new TossPaymentError(400, "provider_rejected"))).toBe(false);
    expect(isDefinitiveTossCancelRejection(new TossPaymentError(500, "provider_rejected", "INVALID_REQUEST"))).toBe(false);
  });

  it("rejects malformed successful payment payloads", async () => {
    fetchMock.mockResolvedValue(response({ ...paymentResponse, totalAmount: "9900" }));

    await expect(confirmTossPayment({ paymentKey, orderId, amount: 9_900 }))
      .rejects.toMatchObject({ status: 502, code: "invalid_provider_response" });
  });

  it("does not send a request when the idempotency key is invalid", async () => {
    await expect(cancelTossPayment({ paymentKey, reason: "support" }, "bad key"))
      .rejects.toThrow("Invalid payment idempotency key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("issues a billing key without logging or returning mismatched customer identity", async () => {
    fetchMock.mockResolvedValue(response({ billingKey: "billing-key", customerKey: "customer-key-1", method: "카드" }));

    const authorization = await issueTossBillingKey({ authKey: "synthetic-auth-key", customerKey: "customer-key-1" });

    expect(authorization).toEqual({ billingKey: "billing-key", customerKey: "customer-key-1", method: "카드" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.tosspayments.com/v1/billing/authorizations/issue", expect.any(Object));
    expect(requestOptions().body).toBe(JSON.stringify({ authKey: "synthetic-auth-key", customerKey: "customer-key-1" }));
    expect(requestHeaders()["Idempotency-Key"]).toBeUndefined();

    fetchMock.mockResolvedValue(response({ billingKey: "billing-key", customerKey: "other-customer", method: "카드" }));
    await expect(issueTossBillingKey({ authKey: "synthetic-auth-key", customerKey: "customer-key-1" }))
      .rejects.toMatchObject({ status: 502, code: "invalid_provider_response" });
  });

  it("rejects invalid billing authorization input before network access", async () => {
    await expect(issueTossBillingKey({ authKey: "bad\nkey", customerKey: "customer-key-1" }))
      .rejects.toMatchObject({ status: 400, code: "invalid_billing_authorization" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("charges a billing key with validated fields, timeout-safe idempotency, and a bounded response", async () => {
    const input = {
      billingKey: "key/with space",
      customerKey: "customer-key-1",
      orderId: "renewal-2026-09-001",
      orderName: "LUMINA Plus",
      amount: 9_900,
      customerEmail: "member@example.test",
    };

    await chargeTossBillingKey(input, "renewal:invoice-1");

    expect(fetchMock).toHaveBeenCalledWith("https://api.tosspayments.com/v1/billing/key%2Fwith%20space", expect.any(Object));
    expect(requestOptions()).toMatchObject({
      body: JSON.stringify({
        customerKey: input.customerKey,
        orderId: input.orderId,
        orderName: input.orderName,
        amount: input.amount,
        customerEmail: input.customerEmail,
      }),
      cache: "no-store",
    });
    expect(requestHeaders()["Idempotency-Key"]).toBe("renewal:invoice-1");
    expect(requestOptions().signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects invalid recurring charge input before network access", async () => {
    await expect(chargeTossBillingKey({
      billingKey: "",
      customerKey: "customer-key-1",
      orderId: "bad id",
      orderName: "LUMINA Plus",
      amount: Number.MAX_SAFE_INTEGER + 1,
      customerEmail: "member@example.test",
    }, "renewal:invoice-1"))
      .rejects.toMatchObject({ status: 400, code: "invalid_billing_charge" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes a billing key and rejects invalid keys without a request", async () => {
    await deleteTossBillingKey("billing-key");
    expect(fetchMock).toHaveBeenCalledWith("https://api.tosspayments.com/v1/billing/billing-key", expect.any(Object));
    expect(requestOptions()).toMatchObject({ method: "DELETE", cache: "no-store" });

    fetchMock.mockClear();
    await expect(deleteTossBillingKey("bad\nkey"))
      .rejects.toMatchObject({ status: 400, code: "invalid_billing_key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports failed billing-key deletion without exposing provider content", async () => {
    fetchMock.mockResolvedValue(response({ message: "private provider error" }, 500));

    await expect(deleteTossBillingKey("billing-key"))
      .rejects.toMatchObject({ name: "TossPaymentError", status: 500, code: "provider_rejected", message: "Payment provider request failed" });
  });

  it("uses typed Toss errors for invalid provider authorization", async () => {
    vi.stubEnv("TOSS_SECRET_KEY", "invalid\nsecret");

    await expect(getTossPaymentByOrder(orderId)).rejects.toBeInstanceOf(TossPaymentError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
