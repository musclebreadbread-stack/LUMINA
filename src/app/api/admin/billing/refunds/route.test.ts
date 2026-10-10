import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  applyTossCancellationMock,
  cancelPaymentMock,
  failReservedRefundMock,
  getAdminAccessMock,
  getPaymentProviderMock,
  reserveAdminRefundMock,
} = vi.hoisted(() => ({
  applyTossCancellationMock: vi.fn(),
  cancelPaymentMock: vi.fn(),
  failReservedRefundMock: vi.fn(),
  getAdminAccessMock: vi.fn(),
  getPaymentProviderMock: vi.fn(),
  reserveAdminRefundMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/admin/authorization", () => ({ getAdminAccess: getAdminAccessMock }));
vi.mock("@/server/billing/paymentProvider", () => ({ getPaymentProvider: getPaymentProviderMock }));
vi.mock("@/server/billing/service", () => ({
  BillingInputError: class BillingInputError extends Error {
    constructor(readonly reason: string) {
      super(reason);
    }
  },
  applyTossCancellation: applyTossCancellationMock,
  failReservedRefund: failReservedRefundMock,
  reserveAdminRefund: reserveAdminRefundMock,
}));

import { POST } from "./route";
import { TossPaymentError } from "@/server/billing/toss";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const reservation = {
  id: "refund-1",
  orderId,
  paymentKey: "provider-payment-key",
  reasonCode: "support_adjustment",
};

function refundRequest(
  body: unknown = { orderId, reasonCode: "support_adjustment" },
  origin = "https://lumina.example",
): Request {
  return new Request("https://lumina.example/api/admin/billing/refunds", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin refund route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example/");
    getAdminAccessMock.mockResolvedValue({ status: "authorized", role: "owner", userId: "owner-1" });
    reserveAdminRefundMock.mockResolvedValue(reservation);
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

  it("applies a completed Toss cancellation for the owner", async () => {
    const response = await POST(refundRequest());

    expect(response.status).toBe(200);
    expect(reserveAdminRefundMock).toHaveBeenCalledWith(orderId, "owner-1", "support_adjustment");
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
    cancelPaymentMock.mockRejectedValue(new TossPaymentError(403, "provider_rejected", "EXCEED_MAX_REFUND_DUE"));

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
    expect(reserveAdminRefundMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
    expect(failReservedRefundMock).not.toHaveBeenCalled();
  });

  it("leaves an existing pending reservation untouched if provider selection fails", async () => {
    getPaymentProviderMock.mockRejectedValue(new Error("provider configuration is unavailable"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(503);
    expect(reserveAdminRefundMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
    expect(failReservedRefundMock).not.toHaveBeenCalled();
  });

  it("leaves an already-canceled provider response pending for owner reconciliation", async () => {
    cancelPaymentMock.mockRejectedValue(new TossPaymentError(400, "provider_rejected", "ALREADY_CANCELED_PAYMENT"));

    const response = await POST(refundRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "refund_processing" });
    expect(failReservedRefundMock).not.toHaveBeenCalled();
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("requires owner access before creating a refund reservation", async () => {
    getAdminAccessMock.mockResolvedValue({ status: "authorized", role: "analyst", userId: "analyst-1" });

    const response = await POST(refundRequest());

    expect(response.status).toBe(403);
    expect(reserveAdminRefundMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests before reading admin access", async () => {
    const response = await POST(refundRequest(undefined, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(getAdminAccessMock).not.toHaveBeenCalled();
    expect(reserveAdminRefundMock).not.toHaveBeenCalled();
  });
});
