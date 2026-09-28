import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/service", () => ({
  applyDashboardCancellation: vi.fn(async () => "applied"),
  applyTossPaymentEvent: vi.fn(async () => "applied"),
}));
const getPaymentByOrder = vi.fn();
vi.mock("@/server/billing/paymentProvider", () => ({
  getPaymentProvider: vi.fn(async () => ({ getPaymentByOrder })),
}));

import { applyDashboardCancellation, applyTossPaymentEvent } from "@/server/billing/service";
import { POST } from "./route";

const applyDashboardCancellationMock = vi.mocked(applyDashboardCancellation);
const applyTossPaymentEventMock = vi.mocked(applyTossPaymentEvent);

const ORDER_ID = "22222222-2222-4222-8222-222222222222";

function webhookRequest(body: unknown, transmissionId = "txn-1"): Request {
  return new Request("https://lumina.jack.ai.kr/api/billing/toss/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "tosspayments-webhook-transmission-id": transmissionId,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/billing/toss/webhook", () => {
  it("applies a dashboard cancellation and does not touch applyTossPaymentEvent when Toss reports CANCELED", async () => {
    getPaymentByOrder.mockResolvedValue({
      orderId: ORDER_ID,
      status: "CANCELED",
      totalAmount: 9_900,
      currency: "KRW",
      lastTransactionKey: "tx-9",
    });

    const response = await POST(webhookRequest({ eventType: "PAYMENT_STATUS_CHANGED", data: { orderId: ORDER_ID } }));

    expect(response.status).toBe(200);
    expect(applyDashboardCancellationMock).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      amount: 9_900,
      providerRefundId: "tx-9",
    });
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
  });

  it("still routes a DONE payment through applyTossPaymentEvent (regression check)", async () => {
    getPaymentByOrder.mockResolvedValue({ orderId: ORDER_ID, status: "DONE", totalAmount: 9_900, currency: "KRW" });

    const response = await POST(webhookRequest({ eventType: "PAYMENT_STATUS_CHANGED", data: { orderId: ORDER_ID } }));

    expect(response.status).toBe(200);
    expect(applyTossPaymentEventMock).toHaveBeenCalledTimes(1);
    expect(applyDashboardCancellationMock).not.toHaveBeenCalled();
  });

  it("ignores a payment whose orderId does not match the requested one, without calling either handler", async () => {
    getPaymentByOrder.mockResolvedValue({ orderId: "different-order", status: "CANCELED", totalAmount: 9_900, currency: "KRW" });

    const response = await POST(webhookRequest({ eventType: "PAYMENT_STATUS_CHANGED", data: { orderId: ORDER_ID } }));

    expect(response.status).toBe(200);
    expect(applyDashboardCancellationMock).not.toHaveBeenCalled();
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
  });

  it("ignores non-PAYMENT_STATUS_CHANGED events without ever calling the provider", async () => {
    const response = await POST(webhookRequest({ eventType: "SOME_OTHER_EVENT", data: { orderId: ORDER_ID } }));

    expect(response.status).toBe(200);
    expect(getPaymentByOrder).not.toHaveBeenCalled();
  });
});
