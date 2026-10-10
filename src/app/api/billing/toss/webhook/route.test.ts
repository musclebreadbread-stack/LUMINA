import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  applyDashboardCancellationMock,
  applyTossPaymentEventMock,
  captureServerErrorMock,
  getPaymentProviderMock,
  getPaymentByOrderMock,
} = vi.hoisted(() => ({
  applyDashboardCancellationMock: vi.fn(),
  applyTossPaymentEventMock: vi.fn(),
  captureServerErrorMock: vi.fn(),
  getPaymentProviderMock: vi.fn(),
  getPaymentByOrderMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/service", () => ({
  applyDashboardCancellation: applyDashboardCancellationMock,
  applyTossPaymentEvent: applyTossPaymentEventMock,
}));
vi.mock("@/server/billing/paymentProvider", () => ({
  getPaymentProvider: getPaymentProviderMock,
}));
vi.mock("@/server/observability/captureServerError", () => ({
  captureServerError: captureServerErrorMock,
}));

import { POST } from "./route";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const payment = {
  paymentKey: "payment-key",
  orderId,
  status: "DONE",
  totalAmount: 9_900,
  balanceAmount: 9_900,
  currency: "KRW",
  method: "카드",
  approvedAt: "2026-09-30T00:00:00.000Z",
};
const payload = {
  eventType: "PAYMENT_STATUS_CHANGED",
  data: { orderId },
};

function webhookRequest(
  body: string,
  headers: Readonly<Record<string, string>> = {},
): Request {
  return new Request("https://lumina.example/api/billing/toss/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "tosspayments-webhook-transmission-id": "transmission-1",
      ...headers,
    },
    body,
  });
}

describe("Toss webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentProviderMock.mockResolvedValue({ getPaymentByOrder: getPaymentByOrderMock });
    getPaymentByOrderMock.mockResolvedValue(payment);
    applyTossPaymentEventMock.mockResolvedValue({ status: "applied" });
    applyDashboardCancellationMock.mockResolvedValue("applied");
    captureServerErrorMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects non-JSON content before provider access", async () => {
    const response = await POST(webhookRequest(JSON.stringify(payload), { "content-type": "text/plain" }));

    expect(response.status).toBe(415);
    expect(getPaymentProviderMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid transmission ID and oversized bodies", async () => {
    const invalidId = await POST(webhookRequest(JSON.stringify(payload), { "tosspayments-webhook-transmission-id": "bad id" }));
    const oversized = await POST(webhookRequest(JSON.stringify(payload) + " ".repeat(32_769)));

    expect(invalidId.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(getPaymentProviderMock).not.toHaveBeenCalled();
  });

  it("ignores unsupported event types after validating the payload", async () => {
    const response = await POST(webhookRequest(JSON.stringify({ ...payload, eventType: "PAYMENT_SETTLED" })));

    expect(response.status).toBe(200);
    expect(getPaymentProviderMock).not.toHaveBeenCalled();
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
  });

  it("loads authoritative payment state and hashes the original event body", async () => {
    const rawBody = JSON.stringify(payload);
    const response = await POST(webhookRequest(rawBody));

    expect(response.status).toBe(200);
    expect(getPaymentByOrderMock).toHaveBeenCalledWith(orderId);
    expect(applyTossPaymentEventMock).toHaveBeenCalledWith({
      eventId: "transmission-1",
      eventType: payload.eventType,
      payloadHash: createHash("sha256").update(Buffer.from(rawBody)).digest(),
      payment,
    });
  });

  it("does not apply a provider response for another order", async () => {
    getPaymentByOrderMock.mockResolvedValue({ ...payment, orderId: "223e4567-e89b-42d3-a456-426614174000" });

    const response = await POST(webhookRequest(JSON.stringify(payload)));

    expect(response.status).toBe(200);
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
    expect(applyDashboardCancellationMock).not.toHaveBeenCalled();
  });

  it("ignores a CANCELED provider response for another order without calling either handler", async () => {
    getPaymentByOrderMock.mockResolvedValue({ ...payment, orderId: "223e4567-e89b-42d3-a456-426614174000", status: "CANCELED" });

    const response = await POST(webhookRequest(JSON.stringify(payload)));

    expect(response.status).toBe(200);
    expect(applyDashboardCancellationMock).not.toHaveBeenCalled();
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
  });

  it("applies a dashboard cancellation and does not touch applyTossPaymentEvent when Toss reports CANCELED", async () => {
    getPaymentByOrderMock.mockResolvedValue({ ...payment, status: "CANCELED", lastTransactionKey: "tx-9" });

    const response = await POST(webhookRequest(JSON.stringify(payload)));

    expect(response.status).toBe(200);
    expect(applyDashboardCancellationMock).toHaveBeenCalledWith({
      orderId,
      amount: 9_900,
      providerRefundId: "tx-9",
    });
    expect(applyTossPaymentEventMock).not.toHaveBeenCalled();
  });

  it("still routes a DONE payment through applyTossPaymentEvent only (regression check)", async () => {
    const response = await POST(webhookRequest(JSON.stringify(payload)));

    expect(response.status).toBe(200);
    expect(applyTossPaymentEventMock).toHaveBeenCalledTimes(1);
    expect(applyDashboardCancellationMock).not.toHaveBeenCalled();
  });

  it("returns a generic retryable response when provider lookup or event processing fails", async () => {
    getPaymentByOrderMock.mockRejectedValueOnce(new Error("private provider detail"));
    const providerFailure = await POST(webhookRequest(JSON.stringify(payload)));

    applyTossPaymentEventMock.mockRejectedValueOnce(new Error("private database detail"));
    const processingFailure = await POST(webhookRequest(JSON.stringify(payload)));

    expect(providerFailure.status).toBe(503);
    expect(await providerFailure.json()).toEqual({ error: "webhook_processing_failed" });
    expect(processingFailure.status).toBe(503);
    expect(await processingFailure.json()).toEqual({ error: "webhook_processing_failed" });
    expect(captureServerErrorMock).toHaveBeenCalledTimes(2);
    expect(captureServerErrorMock).toHaveBeenCalledWith(expect.any(Error), "billing-webhook");
  });
});
