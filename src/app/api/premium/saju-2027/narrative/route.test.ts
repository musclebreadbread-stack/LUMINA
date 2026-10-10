import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnOpenedEntitlementId: vi.fn(),
  getOwnBoundProfile: vi.fn(),
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
vi.mock("@/server/billing/service", () => ({ getOwnOpenedEntitlementId: mocks.getOwnOpenedEntitlementId }));
vi.mock("@/server/premium/reportContext", () => ({ getOwnBoundProfile: mocks.getOwnBoundProfile }));
vi.mock("@/server/premium/forecastFromProfile", () => ({ forecastFromProfile: vi.fn(() => ({})) }));
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
    mocks.getOwnBoundProfile.mockResolvedValue({ id: "profile-1" });
  });

  it("refuses AI chapters for a purchase whose report has not been opened, so it stays self-refundable only without the content", async () => {
    mocks.getOwnOpenedEntitlementId.mockResolvedValue(null);

    const response = await POST(narrativeRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "opened_entitlement_required" });
    expect(mocks.getOwnOpenedEntitlementId).toHaveBeenCalledWith("saju-2027");
    expect(mocks.enqueueYearForecastNarrative).not.toHaveBeenCalled();
  });

  it("queues AI chapters once the report has been opened", async () => {
    mocks.getOwnOpenedEntitlementId.mockResolvedValue("entitlement-1");
    mocks.enqueueYearForecastNarrative.mockResolvedValue({ id: "narrative-1", status: "succeeded" });

    const response = await POST(narrativeRequest());

    expect(response.status).toBe(200);
    expect(mocks.enqueueYearForecastNarrative).toHaveBeenCalledWith(expect.objectContaining({
      userId: "member-1",
      entitlementId: "entitlement-1",
      locale: "ko",
    }));
  });
});
