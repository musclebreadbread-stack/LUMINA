import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnOpenedEntitlement: vi.fn(),
  getOwnProfileForOrder: vi.fn(),
  forecastFromProfile: vi.fn(),
  enqueueYearForecastNarrative: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));
vi.mock("@/server/ai/settings", () => ({ isAIReportingEnabled: () => true }));
vi.mock("@/server/auth/session", () => ({
  getSignedInMember: vi.fn(async () => ({ user: { id: "member-1", email: "member@example.invalid" } })),
}));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: vi.fn(async () => true) }));
vi.mock("@/server/member/dal", () => ({ MemberAccessError: class MemberAccessError extends Error {} }));
vi.mock("@/server/billing/service", () => ({ getOwnOpenedEntitlement: mocks.getOwnOpenedEntitlement }));
vi.mock("@/server/premium/reportContext", () => ({ getOwnProfileForOrder: mocks.getOwnProfileForOrder }));
vi.mock("@/server/premium/forecastFromProfile", () => ({ forecastFromProfile: mocks.forecastFromProfile }));
vi.mock("@/server/ai/facts", () => ({ buildYearForecastFacts: vi.fn(() => []) }));
vi.mock("@/server/ai/worker", () => ({ processYearForecastNarrative: vi.fn() }));
vi.mock("@/server/ai/service", () => ({
  enqueueYearForecastNarrative: mocks.enqueueYearForecastNarrative,
  getOwnYearForecastNarrative: vi.fn(),
  AIQuotaError: class AIQuotaError extends Error {},
}));
vi.mock("@/server/observability/captureServerError", () => ({ captureServerError: vi.fn() }));

import { POST } from "./route";

function narrativeRequest(): Request {
  return new Request("https://lumina.example.invalid/api/premium/saju-2027/narrative", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale: "ko" }),
  });
}

describe("POST /api/premium/saju-2027/narrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.forecastFromProfile.mockReturnValue({});
  });

  it("refuses AI chapters while no purchase has been opened, so an unopened order cannot be refunded after taking them", async () => {
    mocks.getOwnOpenedEntitlement.mockResolvedValue(null);

    const response = await POST(narrativeRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "opened_entitlement_required" });
    expect(mocks.getOwnOpenedEntitlement).toHaveBeenCalledWith("saju-2027");
    expect(mocks.getOwnProfileForOrder).not.toHaveBeenCalled();
    expect(mocks.enqueueYearForecastNarrative).not.toHaveBeenCalled();
  });

  it("builds the chapters from the opened order's own profile, not from a newer unopened purchase", async () => {
    const openedOrderProfile = { id: "profile-of-opened-order" };
    mocks.getOwnOpenedEntitlement.mockResolvedValue({ entitlementId: "entitlement-opened", orderId: "order-opened" });
    mocks.getOwnProfileForOrder.mockResolvedValue(openedOrderProfile);
    mocks.enqueueYearForecastNarrative.mockResolvedValue({ id: "narrative-1", status: "succeeded" });

    const response = await POST(narrativeRequest());

    expect(response.status).toBe(200);
    expect(mocks.getOwnProfileForOrder).toHaveBeenCalledWith("order-opened");
    expect(mocks.forecastFromProfile).toHaveBeenCalledWith(openedOrderProfile);
    expect(mocks.enqueueYearForecastNarrative).toHaveBeenCalledWith(expect.objectContaining({
      userId: "member-1",
      entitlementId: "entitlement-opened",
      locale: "ko",
    }));
  });

  it("uses the live profile for LUMINA+ access, which has no purchase order", async () => {
    mocks.getOwnOpenedEntitlement.mockResolvedValue({ entitlementId: "plus-entitlement", orderId: null });
    mocks.getOwnProfileForOrder.mockResolvedValue({ id: "live-profile" });
    mocks.enqueueYearForecastNarrative.mockResolvedValue({ id: "narrative-2", status: "succeeded" });

    const response = await POST(narrativeRequest());

    expect(response.status).toBe(200);
    expect(mocks.getOwnProfileForOrder).toHaveBeenCalledWith(null);
  });
});
