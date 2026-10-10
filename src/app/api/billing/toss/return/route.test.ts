import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TossPayment } from "@/server/billing/providerTypes";

const {
  getOwnOrderMock,
  applyTossPaymentEventMock,
  getPaymentProviderMock,
  confirmPaymentMock,
  paymentEventHashMock,
} = vi.hoisted(() => ({
  getOwnOrderMock: vi.fn(),
  applyTossPaymentEventMock: vi.fn(),
  getPaymentProviderMock: vi.fn(),
  confirmPaymentMock: vi.fn(),
  paymentEventHashMock: vi.fn(() => Buffer.alloc(32, 4)),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/service", () => ({
  BillingAccessError: class BillingAccessError extends Error {},
  BillingInputError: class BillingInputError extends Error {},
  applyTossPaymentEvent: applyTossPaymentEventMock,
  getOwnOrder: getOwnOrderMock,
  paymentEventHash: paymentEventHashMock,
}));
vi.mock("@/server/billing/paymentProvider", () => ({ getPaymentProvider: getPaymentProviderMock }));

import { GET } from "./route";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const pendingOrder = {
  id: orderId,
  amount: 9_900,
  currency: "KRW",
  status: "pending",
};
const payment: TossPayment = {
  paymentKey: "toss-payment-key",
  orderId,
  status: "DONE",
  totalAmount: 9_900,
  currency: "KRW",
  method: "카드",
};

function successUrl(options: Readonly<{ orderId?: string; paymentKey?: string; amount?: string }> = {}): Request {
  const url = new URL("https://lumina.example/api/billing/toss/return");
  url.searchParams.set("orderId", options.orderId ?? orderId);
  url.searchParams.set("paymentKey", options.paymentKey ?? payment.paymentKey);
  url.searchParams.set("amount", options.amount ?? "9900");
  return new Request(url);
}

function purchaseResult(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).searchParams.get("purchase") : null;
}

describe("Toss checkout return route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOwnOrderMock.mockReset().mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce({ ...pendingOrder, status: "paid" });
    confirmPaymentMock.mockReset().mockResolvedValue(payment);
    getPaymentProviderMock.mockReset().mockResolvedValue({ confirmPayment: confirmPaymentMock });
    applyTossPaymentEventMock.mockReset().mockResolvedValue("applied");
    paymentEventHashMock.mockReset().mockReturnValue(Buffer.alloc(32, 4));
  });

  it("confirms the exact server-priced order, applies the event, and redirects to success", async () => {
    const response = await GET(successUrl());

    expect(response.status).toBe(303);
    expect(purchaseResult(response)).toBe("success");
    expect(confirmPaymentMock).toHaveBeenCalledWith({ paymentKey: payment.paymentKey, orderId, amount: pendingOrder.amount });
    expect(applyTossPaymentEventMock).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "RETURN_CONFIRMATION",
      payment,
      payloadHash: Buffer.alloc(32, 4),
    }));
    expect(getOwnOrderMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("rejects a browser amount mismatch before calling Toss", async () => {
    const response = await GET(successUrl({ amount: "1" }));

    expect(response.status).toBe(303);
    expect(purchaseResult(response)).toBe("failed");
    expect(getOwnOrderMock).toHaveBeenCalledTimes(1);
    expect(confirmPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects a provider response that does not match the pending order", async () => {
    confirmPaymentMock.mockResolvedValue({ ...payment, totalAmount: payment.totalAmount - 1 });

    const response = await GET(successUrl());

    expect(purchaseResult(response)).toBe("failed");
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
    expect(getOwnOrderMock).toHaveBeenCalledTimes(1);
  });

  it("reports failure if event application does not grant the order", async () => {
    getOwnOrderMock.mockReset();
    getOwnOrderMock.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(pendingOrder);

    const response = await GET(successUrl());

    expect(purchaseResult(response)).toBe("failed");
    expect(applyTossPaymentEventMock).toHaveBeenCalledTimes(1);
  });

  it("does not reconfirm an order that is already paid", async () => {
    getOwnOrderMock.mockReset();
    getOwnOrderMock.mockResolvedValue({ ...pendingOrder, status: "paid" });

    const response = await GET(successUrl());

    expect(purchaseResult(response)).toBe("success");
    expect(confirmPaymentMock).not.toHaveBeenCalled();
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
  });

  it.each([
    { orderId, paymentKey: payment.paymentKey, amount: "" },
    { orderId, paymentKey: "", amount: "9900" },
    { orderId, paymentKey: "x".repeat(201), amount: "9900" },
    { orderId, paymentKey: payment.paymentKey, amount: "not-a-number" },
  ])("rejects an incomplete or oversized provider redirect", async (input) => {
    const response = await GET(successUrl(input));

    expect(purchaseResult(response)).toBe("failed");
    expect(getOwnOrderMock).not.toHaveBeenCalled();
    expect(confirmPaymentMock).not.toHaveBeenCalled();
  });
});
