import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createPendingOrderMock } = vi.hoisted(() => ({ createPendingOrderMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/service", () => ({
  BillingAccessError: class BillingAccessError extends Error {
    constructor(readonly reason: string) {
      super(reason);
    }
  },
  BillingInputError: class BillingInputError extends Error {
    constructor(readonly reason: string) {
      super(reason);
    }
  },
  createPendingOrder: createPendingOrderMock,
}));

import { POST } from "./route";

const checkoutBody = {
  productKey: "saju-2027",
  locale: "ko",
  acceptedPurchaseTerms: true,
  acceptedWithdrawalNotice: true,
  acceptedEuWithdrawalWaiver: false,
};

function checkoutRequest(body: unknown, origin = "https://lumina.example"): Request {
  return new Request("https://lumina.example/api/billing/orders", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "cf-ipcountry": "KR",
    },
    body: JSON.stringify(body),
  });
}

describe("billing order route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example/");
    createPendingOrderMock.mockResolvedValue({
      orderId: "order-1",
      amount: 9_900,
      currency: "KRW",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an amount supplied by the browser", async () => {
    const response = await POST(checkoutRequest({ ...checkoutBody, amount: 1 }));

    expect(response.status).toBe(400);
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("blocks requests from another origin", async () => {
    const response = await POST(checkoutRequest(checkoutBody, "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(createPendingOrderMock).not.toHaveBeenCalled();
  });

  it("passes only the accepted checkout choices and normalized country to the server", async () => {
    const response = await POST(checkoutRequest(checkoutBody));

    expect(response.status).toBe(200);
    expect(createPendingOrderMock).toHaveBeenCalledWith({ ...checkoutBody, countryCode: "KR" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
