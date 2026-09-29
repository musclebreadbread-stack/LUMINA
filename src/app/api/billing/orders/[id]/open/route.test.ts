import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/server/billing/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/billing/service")>();
  return {
    ...actual,
    getOwnOrder: vi.fn(),
    markOwnEntitlementViewed: vi.fn(async () => true),
  };
});

import { BillingInputError, getOwnOrder, markOwnEntitlementViewed } from "@/server/billing/service";
import { POST } from "./route";

const getOwnOrderMock = vi.mocked(getOwnOrder);
const markOwnEntitlementViewedMock = vi.mocked(markOwnEntitlementViewed);

const ORDER_ID = "33333333-3333-4333-8333-333333333333";
const SITE_ORIGIN = "https://lumina.jack.ai.kr";

function openRequest(origin: string | null): Request {
  return new Request(`${SITE_ORIGIN}/api/billing/orders/${ORDER_ID}/open`, {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

function call(request: Request) {
  return POST(request, { params: Promise.resolve({ id: ORDER_ID }) });
}

beforeEach(() => {
  process.env.BETTER_AUTH_URL = SITE_ORIGIN;
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.BETTER_AUTH_URL;
});

describe("POST /api/billing/orders/[id]/open", () => {
  it("marks the order viewed and redirects to the product's report page on a genuine same-origin open", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "paid", viewedAt: null,
    });

    const response = await call(openRequest(SITE_ORIGIN));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/premium/saju-2027/report`);
    expect(markOwnEntitlementViewedMock).toHaveBeenCalledWith("saju-2027");
  });

  it("rejects a cross-origin request without marking anything viewed (CSRF guard)", async () => {
    const response = await call(openRequest("https://evil.example"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/account`);
    expect(getOwnOrderMock).not.toHaveBeenCalled();
    expect(markOwnEntitlementViewedMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no origin header at all", async () => {
    const response = await call(openRequest(null));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/account`);
    expect(markOwnEntitlementViewedMock).not.toHaveBeenCalled();
  });

  it("does not mark an unpaid order viewed", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "saju-2027", amount: 9_900, currency: "KRW", status: "pending", viewedAt: null,
    });

    const response = await call(openRequest(SITE_ORIGIN));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/account`);
    expect(markOwnEntitlementViewedMock).not.toHaveBeenCalled();
  });

  it("refuses to open a subscription invoice order (not a one-time product)", async () => {
    getOwnOrderMock.mockResolvedValue({
      id: ORDER_ID, productKey: "lumina-plus-monthly", amount: 7_900, currency: "KRW", status: "paid", viewedAt: null,
    });

    const response = await call(openRequest(SITE_ORIGIN));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/account`);
    expect(markOwnEntitlementViewedMock).not.toHaveBeenCalled();
  });

  it("redirects to /account when the order does not belong to the caller", async () => {
    getOwnOrderMock.mockRejectedValue(new BillingInputError("order_not_found"));

    const response = await call(openRequest(SITE_ORIGIN));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${SITE_ORIGIN}/account`);
  });
});
