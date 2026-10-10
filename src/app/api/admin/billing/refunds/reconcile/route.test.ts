import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TossPayment } from "@/server/billing/providerTypes";

const {
  getAdminAccessMock,
  getPaymentProviderMock,
  getPaymentByOrderMock,
  getRefundTargetMock,
  applyTossCancellationMock,
} = vi.hoisted(() => ({
  getAdminAccessMock: vi.fn(),
  getPaymentProviderMock: vi.fn(),
  getPaymentByOrderMock: vi.fn(),
  getRefundTargetMock: vi.fn(),
  applyTossCancellationMock: vi.fn(),
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
  getAdminRefundReconciliationTarget: getRefundTargetMock,
  applyTossCancellation: applyTossCancellationMock,
}));

import { POST } from "./route";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const target = {
  id: "refund-1",
  orderId,
  paymentKey: "provider-payment-key",
  amount: 9_900,
  currency: "KRW",
} as const;
const fullyCanceledPayment: TossPayment = {
  paymentKey: target.paymentKey,
  orderId,
  status: "CANCELED",
  totalAmount: target.amount,
  balanceAmount: 0,
  currency: target.currency,
  method: "카드",
  cancels: [{ cancelAmount: target.amount, cancelStatus: "DONE", transactionKey: "cancel-1" }],
};

function reconcileRequest(body: unknown, origin = "https://lumina.example"): Request {
  return new Request("https://lumina.example/api/admin/billing/refunds/reconcile", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin refund reconciliation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example/");
    getAdminAccessMock.mockResolvedValue({ status: "authorized", role: "owner", userId: "owner-1" });
    getRefundTargetMock.mockResolvedValue(target);
    getPaymentProviderMock.mockResolvedValue({ getPaymentByOrder: getPaymentByOrderMock });
    getPaymentByOrderMock.mockResolvedValue(fullyCanceledPayment);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a cross-origin request before accessing billing state", async () => {
    const response = await POST(reconcileRequest({ orderId }, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(getRefundTargetMock).not.toHaveBeenCalled();
  });

  it("requires owner access", async () => {
    getAdminAccessMock.mockResolvedValue({ status: "authorized", role: "analyst", userId: "analyst-1" });

    const response = await POST(reconcileRequest({ orderId }));

    expect(response.status).toBe(403);
    expect(getPaymentProviderMock).not.toHaveBeenCalled();
  });

  it("does not update local order state when the provider cannot prove a full cancellation", async () => {
    getPaymentByOrderMock.mockResolvedValue({ ...fullyCanceledPayment, cancels: [] });

    const response = await POST(reconcileRequest({ orderId }));

    expect(response.status).toBe(409);
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("updates the pending refund only after matching the completed provider record", async () => {
    const response = await POST(reconcileRequest({ orderId }));

    expect(response.status).toBe(200);
    expect(getPaymentByOrderMock).toHaveBeenCalledWith(orderId);
    expect(applyTossCancellationMock).toHaveBeenCalledWith({
      orderId,
      refundId: target.id,
      providerRefundId: "cancel-1",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
