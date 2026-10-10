import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  applyTossCancellationMock,
  authorizeOwnRefundMock,
  cancelPaymentMock,
  failReservedRefundMock,
  getPaymentProviderMock,
  reserveOwnRefundMock,
} = vi.hoisted(() => ({
  applyTossCancellationMock: vi.fn(),
  authorizeOwnRefundMock: vi.fn(),
  cancelPaymentMock: vi.fn(),
  failReservedRefundMock: vi.fn(),
  getPaymentProviderMock: vi.fn(),
  reserveOwnRefundMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/paymentProvider", () => ({ getPaymentProvider: getPaymentProviderMock }));
vi.mock("@/server/billing/service", () => ({
  BillingAccessError: class BillingAccessError extends Error {
    constructor(readonly reason: string) {
      super(reason);
    }
  },
  authorizeOwnRefund: authorizeOwnRefundMock,
  BillingInputError: class BillingInputError extends Error {
    constructor(readonly reason: string) {
      super(reason);
    }
  },
  applyTossCancellation: applyTossCancellationMock,
  failReservedRefund: failReservedRefundMock,
  reserveOwnRefund: reserveOwnRefundMock,
}));

import { POST } from "./route";
import { BillingAccessError } from "@/server/billing/service";
import { TossPaymentError } from "@/server/billing/toss";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const reservation = {
  id: "refund-1",
  orderId,
  paymentKey: "provider-payment-key",
  reasonCode: "changed_mind",
};

function refundRequest(
  body: unknown = { orderId, reasonCode: "changed_mind" },
  origin = "https://lumina.example",
): Request {
  return new Request("https://lumina.example/api/billing/refunds", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("member refund route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example/");
    authorizeOwnRefundMock.mockResolvedValue(undefined);
    reserveOwnRefundMock.mockResolvedValue(reservation);
    getPaymentProviderMock.mockResolvedValue({ cancelPayment: cancelPaymentMock });
    cancelPaymentMock.mockResolvedValue({
      orderId,
      status: "CANCELED",
      lastTransactionKey: "cancel-1",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies a completed Toss cancellation and returns a private success response", async () => {
    const response = await POST(refundRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cancelPaymentMock).toHaveBeenCalledWith(
      { paymentKey: reservation.paymentKey, reason: reservation.reasonCode },
      `refund:${reservation.id}`,
    );
    expect(applyTossCancellationMock).toHaveBeenCalledWith({
      orderId,
      refundId: reservation.id,
      providerRefundId: "cancel-1",
    });
    expect(failReservedRefundMock).not.toHaveBeenCalled();
  });

  it("releases a reservation after a definitive cancellation rejection", async () => {
    cancelPaymentMock.mockRejectedValue(new TossPaymentError(403, "provider_rejected", "NOT_CANCELABLE_PAYMENT"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(503);
    expect(failReservedRefundMock).toHaveBeenCalledWith({
      refundId: reservation.id,
      orderId,
      errorCode: "provider_cancel_rejected",
    });
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("does not create a refund reservation if provider selection fails", async () => {
    getPaymentProviderMock.mockRejectedValue(new Error("provider configuration is unavailable"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(503);
    expect(reserveOwnRefundMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
    expect(failReservedRefundMock).not.toHaveBeenCalled();
  });

  it("checks member access before resolving the payment provider", async () => {
    authorizeOwnRefundMock.mockRejectedValue(new BillingAccessError("authentication_required"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(401);
    expect(getPaymentProviderMock).not.toHaveBeenCalled();
    expect(reserveOwnRefundMock).not.toHaveBeenCalled();
  });

  it("leaves an existing pending reservation untouched if provider selection fails", async () => {
    getPaymentProviderMock.mockRejectedValue(new Error("provider configuration is unavailable"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(503);
    expect(reserveOwnRefundMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
    expect(failReservedRefundMock).not.toHaveBeenCalled();
  });

  it("keeps an ambiguous already-canceled result pending for reconciliation", async () => {
    cancelPaymentMock.mockRejectedValue(new TossPaymentError(400, "provider_rejected", "ALREADY_CANCELED_PAYMENT"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "refund_processing" });
    expect(failReservedRefundMock).not.toHaveBeenCalled();
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests before reserving a refund", async () => {
    const response = await POST(refundRequest(undefined, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(reserveOwnRefundMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
  });
});
