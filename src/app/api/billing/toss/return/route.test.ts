import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/billing/service", () => ({
  getOwnOrder: vi.fn(),
  applyTossPaymentEvent: vi.fn(async () => "applied"),
  paymentEventHash: vi.fn(() => Buffer.alloc(32)),
  BillingAccessError: class BillingAccessError extends Error {
    constructor(readonly reason: string) { super(reason); }
  },
  BillingInputError: class BillingInputError extends Error {
    constructor(readonly reason: string) { super(reason); }
  },
}));
const confirmPayment = vi.fn();
vi.mock("@/server/billing/paymentProvider", () => ({
  getPaymentProvider: vi.fn(async () => ({ confirmPayment })),
}));

import { BillingInputError, getOwnOrder } from "@/server/billing/service";
import { GET } from "./route";

const getOwnOrderMock = vi.mocked(getOwnOrder);

const ORDER_ID = "44444444-4444-4444-8444-444444444444";
const SITE_ORIGIN = "https://lumina.jack.ai.kr";

function returnRequest(params: Readonly<Record<string, string>>): Request {
  const url = new URL(`${SITE_ORIGIN}/api/billing/toss/return`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new Request(url, { method: "GET" });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/billing/toss/return", () => {
  it("redirects to the default product page with purchase=failed on a malformed request", async () => {
    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "", amount: "9900" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027?purchase=failed`);
    expect(getOwnOrderMock).not.toHaveBeenCalled();
  });

  it("redirects straight to the product's report page with the order id when already paid", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "paid", viewedAt: null,
    });

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "9900" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027/report?order=${ORDER_ID}`);
  });

  it("preserves a non-default locale in the redirect path", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "paid", viewedAt: null,
    });

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "9900", locale: "en" }));

    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/en/premium/saju-2027/report?order=${ORDER_ID}`);
  });

  it("redirects to failed when the returned amount does not match the order", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "pending", viewedAt: null,
    });

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "1" }));

    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027?purchase=failed`);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("confirms a pending order and redirects to the report page on success", async () => {
    getOwnOrderMock
      .mockResolvedValueOnce({ id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "pending", viewedAt: null })
      .mockResolvedValueOnce({ id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "paid", viewedAt: null });
    confirmPayment.mockResolvedValue({ orderId: ORDER_ID, totalAmount: 9_900, currency: "KRW" });

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "9900" }));

    expect(confirmPayment).toHaveBeenCalledTimes(1);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027/report?order=${ORDER_ID}`);
  });

  it("redirects to failed when the confirmed payment does not match the order", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "pending", viewedAt: null,
    });
    confirmPayment.mockResolvedValue({ orderId: "different-order", totalAmount: 9_900, currency: "KRW" });

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "9900" }));

    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027?purchase=failed`);
  });

  it("falls back to the default product/report paths for an unrecognized product key", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "not-a-catalog-key", amount: 9_900, currency: "KRW", status: "paid", viewedAt: null,
    });

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "9900" }));

    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027/report?order=${ORDER_ID}`);
  });

  it("redirects to failed when the order does not belong to the caller", async () => {
    getOwnOrderMock.mockRejectedValue(new BillingInputError("order_not_found"));

    const response = await GET(returnRequest({ orderId: ORDER_ID, paymentKey: "pk-1", amount: "9900" }));

    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027?purchase=failed`);
  });
});
