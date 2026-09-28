import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("../service", () => ({
  getStuckRefundReservation: vi.fn(),
  applyTossCancellation: vi.fn(async () => undefined),
  failReservedRefund: vi.fn(async () => undefined),
}));

import { applyTossCancellation, failReservedRefund, getStuckRefundReservation } from "../service";
import type { PaymentProvider } from "../providerTypes";
import { TossPaymentError } from "../toss";
import { reconcileStuckRefund } from "../reconcileRefunds";

const getStuckRefundReservationMock = vi.mocked(getStuckRefundReservation);
const applyTossCancellationMock = vi.mocked(applyTossCancellation);
const failReservedRefundMock = vi.mocked(failReservedRefund);

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const RESERVATION = { refundId: "refund-1", reasonCode: "changed_mind", paymentKey: "payment-key-abc" };

function fakeProvider(overrides: Partial<{
  getPaymentByOrder: (orderId: string) => Promise<unknown>;
  cancelPayment: (input: unknown, idempotencyKey: string) => Promise<unknown>;
}> = {}): PaymentProvider {
  return {
    getPaymentByOrder: overrides.getPaymentByOrder ?? vi.fn(),
    cancelPayment: overrides.cancelPayment ?? vi.fn(),
  } as unknown as PaymentProvider;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("reconcileStuckRefund", () => {
  it("returns 'resolved' and touches nothing else when no pending reservation remains", async () => {
    getStuckRefundReservationMock.mockResolvedValue(null);
    const provider = fakeProvider();

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("resolved");
    expect(provider.getPaymentByOrder).not.toHaveBeenCalled();
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("returns 'provider_error' when the provider lookup itself fails", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({ getPaymentByOrder: vi.fn(async () => { throw new Error("network"); }) });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("provider_error");
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("returns 'provider_error' when the returned payment is for a different order", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({ getPaymentByOrder: vi.fn(async () => ({ orderId: "other-order", status: "DONE" })) });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("provider_error");
  });

  it("finalizes immediately when Toss already shows the payment as CANCELED", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "CANCELED", lastTransactionKey: "tx-1" })),
    });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("recovered");
    expect(applyTossCancellationMock).toHaveBeenCalledWith({ orderId: ORDER_ID, refundId: "refund-1", providerRefundId: "tx-1" });
    expect(provider.cancelPayment).not.toHaveBeenCalled();
  });

  it("treats an unexpected payment status (neither DONE nor CANCELED) as a provider error and never retries the cancel", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "WAITING_FOR_DEPOSIT" })),
    });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("provider_error");
    expect(provider.cancelPayment).not.toHaveBeenCalled();
  });

  it("replays the cancel with the reservation's idempotency key and finalizes on success", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const cancelPayment = vi.fn(async () => ({ orderId: ORDER_ID, status: "CANCELED", lastTransactionKey: "tx-2" }));
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "DONE" })),
      cancelPayment,
    });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("recovered");
    expect(cancelPayment).toHaveBeenCalledWith(
      { paymentKey: "payment-key-abc", reason: "changed_mind" },
      "refund:refund-1",
    );
    expect(applyTossCancellationMock).toHaveBeenCalledWith({ orderId: ORDER_ID, refundId: "refund-1", providerRefundId: "tx-2" });
  });

  it("marks the reservation failed (unstuck back to 'paid') when Toss rejects the retried cancel with a 4xx", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "DONE" })),
      cancelPayment: vi.fn(async () => { throw new TossPaymentError(400, "already_cancelled"); }),
    });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("recovered");
    expect(failReservedRefundMock).toHaveBeenCalledWith({
      refundId: "refund-1",
      orderId: ORDER_ID,
      errorCode: "provider_cancel_rejected",
    });
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("leaves the order stuck for the next reconcile pass on a repeat 5xx/timeout", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "DONE" })),
      cancelPayment: vi.fn(async () => { throw new TossPaymentError(503, "provider_unavailable"); }),
    });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("provider_error");
    expect(failReservedRefundMock).not.toHaveBeenCalled();
    expect(applyTossCancellationMock).not.toHaveBeenCalled();
  });

  it("treats a non-TossPaymentError from the retried cancel as still stuck", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "DONE" })),
      cancelPayment: vi.fn(async () => { throw new Error("unexpected"); }),
    });

    const outcome = await reconcileStuckRefund(ORDER_ID, provider);

    expect(outcome).toBe("provider_error");
    expect(failReservedRefundMock).not.toHaveBeenCalled();
  });

  it("never throws (surfaces provider_error instead) if applyTossCancellation itself fails, e.g. a concurrent human retry finalized it first", async () => {
    getStuckRefundReservationMock.mockResolvedValue(RESERVATION);
    applyTossCancellationMock.mockRejectedValueOnce(new Error("payment_state_invalid"));
    const provider = fakeProvider({
      getPaymentByOrder: vi.fn(async () => ({ orderId: ORDER_ID, status: "CANCELED", lastTransactionKey: "tx-3" })),
    });

    await expect(reconcileStuckRefund(ORDER_ID, provider)).resolves.toBe("provider_error");
  });
});
