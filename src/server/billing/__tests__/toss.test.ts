import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  cancelTossPayment,
  chargeTossBillingKey,
  confirmTossPayment,
  deleteTossBillingKey,
  getTossPaymentByOrder,
  issueTossBillingKey,
  TossPaymentError,
  tossPaymentProvider,
} from "../toss";

const ORDER_ID = "123e4567-e89b-42d3-a456-426614174000";
const fetchMock = vi.fn();

function payment(overrides: Record<string, unknown> = {}) {
  return {
    paymentKey: "pay_key_1",
    orderId: ORDER_ID,
    status: "DONE",
    totalAmount: 9900,
    method: "CARD",
    ...overrides,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected rejection");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_example");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("confirmTossPayment", () => {
  it("posts to the confirm endpoint with basic auth and idempotency key, defaulting currency", async () => {
    fetchMock.mockResolvedValue(json(payment()));
    const result = await confirmTossPayment({ paymentKey: "pay_key_1", orderId: ORDER_ID, amount: 9900 });
    expect(result.currency).toBe("KRW");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.tosspayments.com/v1/payments/confirm");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("test_sk_example:").toString("base64")}`);
    expect(init.headers["Idempotency-Key"]).toBe(`confirm:${ORDER_ID}`);
    expect(JSON.parse(init.body as string)).toEqual({ paymentKey: "pay_key_1", orderId: ORDER_ID, amount: 9900 });
  });

  it("rejects an idempotency key with unsafe characters before calling fetch", async () => {
    await expect(confirmTossPayment({ paymentKey: "k", orderId: "bad id!", amount: 1 })).rejects.toThrow("Invalid payment idempotency key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed without calling fetch when the secret key is missing or contains newlines", async () => {
    for (const key of ["  ", "test_a\nb"]) {
      vi.stubEnv("TOSS_SECRET_KEY", key);
      // The header error is raised inside the request try-block, so it surfaces as provider_unavailable.
      expect(await rejection(confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 }))).toMatchObject({ status: 503 });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps network failure to a 503 provider_unavailable error", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const error = await rejection(confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 }));
    expect(error).toBeInstanceOf(TossPaymentError);
    expect(error).toMatchObject({ status: 503, code: "provider_unavailable", name: "TossPaymentError" });
  });

  it("maps a non-ok response to provider_rejected carrying the upstream status", async () => {
    fetchMock.mockResolvedValue(json({ code: "X", message: "secret detail" }, 400));
    const error = await rejection(confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 }));
    expect(error).toMatchObject({ status: 400, code: "provider_rejected", message: "Payment provider request failed" });
  });

  it("maps an unparsable or schema-invalid body to 502 invalid_provider_response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 200 }));
    expect(await rejection(confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 }))).toMatchObject({ status: 502, code: "invalid_provider_response" });
    fetchMock.mockResolvedValueOnce(json(payment({ orderId: "not-a-uuid" })));
    expect(await rejection(confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 }))).toMatchObject({ status: 502, code: "invalid_provider_response" });
    fetchMock.mockResolvedValueOnce(json(payment({ totalAmount: -1 })));
    expect(await rejection(confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 }))).toMatchObject({ code: "invalid_provider_response" });
  });

  it("accepts optional approvedAt with offset and lastTransactionKey", async () => {
    fetchMock.mockResolvedValue(json(payment({ approvedAt: "2026-01-01T09:00:00+09:00", lastTransactionKey: null, currency: "USD" })));
    const result = await confirmTossPayment({ paymentKey: "k", orderId: ORDER_ID, amount: 1 });
    expect(result.currency).toBe("USD");
    expect(result.approvedAt).toBe("2026-01-01T09:00:00+09:00");
  });
});

describe("cancelTossPayment", () => {
  it("encodes the payment key in the path and sends cancelReason", async () => {
    fetchMock.mockResolvedValue(json(payment({ status: "CANCELED" })));
    const result = await cancelTossPayment({ paymentKey: "a/b c", reason: "customer request" }, "cancel:1");
    expect(result.status).toBe("CANCELED");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.tosspayments.com/v1/payments/a%2Fb%20c/cancel");
    expect(JSON.parse(init.body as string)).toEqual({ cancelReason: "customer request" });
    expect(init.headers["Idempotency-Key"]).toBe("cancel:1");
  });
});

describe("getTossPaymentByOrder", () => {
  it("fetches by order id with an authorization header", async () => {
    fetchMock.mockResolvedValue(json(payment()));
    const result = await getTossPaymentByOrder(ORDER_ID);
    expect(result.paymentKey).toBe("pay_key_1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.tosspayments.com/v1/payments/orders/${ORDER_ID}`);
    expect(init.method).toBeUndefined();
  });

  it("rejects a non-uuid order id without calling fetch", async () => {
    await expect(getTossPaymentByOrder("../etc")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps network, http and schema failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    expect(await rejection(getTossPaymentByOrder(ORDER_ID))).toMatchObject({ status: 503, code: "provider_unavailable" });
    fetchMock.mockResolvedValueOnce(json({}, 404));
    expect(await rejection(getTossPaymentByOrder(ORDER_ID))).toMatchObject({ status: 404, code: "provider_rejected" });
    fetchMock.mockResolvedValueOnce(json({ nope: true }));
    expect(await rejection(getTossPaymentByOrder(ORDER_ID))).toMatchObject({ status: 502, code: "invalid_provider_response" });
  });
});

describe("issueTossBillingKey", () => {
  const input = { authKey: "auth_1", customerKey: "customer-1" };

  it("issues a billing key without an idempotency header", async () => {
    fetchMock.mockResolvedValue(json({ billingKey: "bk_1", customerKey: "customer-1", method: "CARD" }));
    await expect(issueTossBillingKey(input)).resolves.toEqual({ billingKey: "bk_1", customerKey: "customer-1", method: "CARD" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.tosspayments.com/v1/billing/authorizations/issue");
    expect(init.headers).not.toHaveProperty("Idempotency-Key");
  });

  it("validates input lengths and newlines before calling fetch", async () => {
    const bad = [
      { authKey: "", customerKey: "customer-1" },
      { authKey: "a".repeat(301), customerKey: "customer-1" },
      { authKey: "a\nb", customerKey: "customer-1" },
      { authKey: "a", customerKey: "x" },
      { authKey: "a", customerKey: "x".repeat(51) },
      { authKey: "a", customerKey: "cu\rstomer" },
    ];
    for (const value of bad) {
      expect(await rejection(issueTossBillingKey(value))).toMatchObject({ status: 400, code: "invalid_billing_authorization" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a response whose customerKey differs or is malformed", async () => {
    fetchMock.mockResolvedValueOnce(json({ billingKey: "bk_1", customerKey: "someone-else", method: "CARD" }));
    expect(await rejection(issueTossBillingKey(input))).toMatchObject({ status: 502, code: "invalid_provider_response" });
    fetchMock.mockResolvedValueOnce(json({ billingKey: "" }));
    expect(await rejection(issueTossBillingKey(input))).toMatchObject({ status: 502 });
  });

  it("maps network and http errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("x"));
    expect(await rejection(issueTossBillingKey(input))).toMatchObject({ status: 503 });
    fetchMock.mockResolvedValueOnce(json({}, 401));
    expect(await rejection(issueTossBillingKey(input))).toMatchObject({ status: 401, code: "provider_rejected" });
  });
});

describe("chargeTossBillingKey", () => {
  const input = {
    billingKey: "bk/1",
    customerKey: "customer-1",
    orderId: "order_123456",
    orderName: "LUMINA+",
    amount: 4900,
    customerEmail: "a@b.co",
  };

  it("charges with the encoded billing key and idempotency header", async () => {
    fetchMock.mockResolvedValue(json(payment()));
    const result = await chargeTossBillingKey(input, "charge:1");
    expect(result.totalAmount).toBe(9900);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.tosspayments.com/v1/billing/bk%2F1");
    expect(init.headers["Idempotency-Key"]).toBe("charge:1");
    expect(JSON.parse(init.body as string)).toEqual({
      customerKey: "customer-1",
      orderId: "order_123456",
      orderName: "LUMINA+",
      amount: 4900,
      customerEmail: "a@b.co",
    });
  });

  it("rejects invalid charge inputs without calling fetch", async () => {
    const variants = [
      { orderId: "short" },
      { orderId: "has space!" },
      { amount: 0 },
      { amount: 1.5 },
      { customerKey: "x" },
      { orderName: "" },
      { orderName: "n".repeat(101) },
      { customerEmail: "ab" },
      { customerEmail: "e".repeat(255) },
      { billingKey: "" },
      { billingKey: "b".repeat(201) },
    ];
    for (const override of variants) {
      expect(await rejection(chargeTossBillingKey({ ...input, ...override }, "charge:1"))).toMatchObject({ status: 400, code: "invalid_billing_charge" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid idempotency key and an invalid provider response", async () => {
    await expect(chargeTossBillingKey(input, "bad key")).rejects.toThrow("Invalid payment idempotency key");
    fetchMock.mockResolvedValueOnce(json({ foo: 1 }));
    expect(await rejection(chargeTossBillingKey(input, "charge:1"))).toMatchObject({ status: 502, code: "invalid_provider_response" });
  });
});

describe("deleteTossBillingKey", () => {
  it("issues a DELETE to the encoded key", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await expect(deleteTossBillingKey("bk/1")).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.tosspayments.com/v1/billing/bk%2F1");
    expect(init.method).toBe("DELETE");
  });

  it("validates the key and maps failures", async () => {
    for (const key of ["", "k".repeat(201), "a\nb"]) {
      expect(await rejection(deleteTossBillingKey(key))).toMatchObject({ status: 400, code: "invalid_billing_key" });
    }
    fetchMock.mockRejectedValueOnce(new Error("x"));
    expect(await rejection(deleteTossBillingKey("bk"))).toMatchObject({ status: 503 });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await rejection(deleteTossBillingKey("bk"))).toMatchObject({ status: 404, code: "provider_rejected" });
  });
});

describe("tossPaymentProvider", () => {
  it("is a frozen provider wired to the toss functions", () => {
    expect(tossPaymentProvider.id).toBe("toss");
    expect(Object.isFrozen(tossPaymentProvider)).toBe(true);
    expect(tossPaymentProvider.confirmPayment).toBe(confirmTossPayment);
    expect(tossPaymentProvider.deleteBillingKey).toBe(deleteTossBillingKey);
  });
});
