import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * 출시 롤백 계약: FEATURE_BILLING을 끄면 새 구매만 막고, 이미 산 회원의 열람은 유지한다.
 * 권한 확인에 판매 플래그가 섞이면 롤백이 기존 구매자의 콘텐츠를 빼앗으므로 회귀로 고정한다.
 */
const { queryMock, serverFeatureFlagsMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  serverFeatureFlagsMock: { billing: false, memberAuth: true },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: serverFeatureFlagsMock }));
vi.mock("@/server/auth", () => ({ isMemberAuthConfigured: () => true }));
vi.mock("@/server/auth/session", () => ({
  getSignedInMember: vi.fn(async () => ({ user: { id: "member-1", email: "member@example.invalid" } })),
}));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: vi.fn(async () => true) }));
vi.mock("@/server/member/database", () => ({
  withMemberTransaction: vi.fn(async (_userId: string, operation: (client: PoolClient) => Promise<unknown>) =>
    operation({ query: queryMock } as unknown as PoolClient)),
}));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: vi.fn() }));

import { BillingAccessError, createPendingOrder, hasOwnEntitlement } from "./service";

describe("billing rollback with FEATURE_BILLING turned off", () => {
  beforeEach(() => {
    serverFeatureFlagsMock.billing = false;
    vi.stubEnv("BILLING_DATABASE_URL", "postgresql://lumina_billing_worker:synthetic@billing.example.invalid/lumina");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example.invalid/");
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [{ id: "entitlement-1" }] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps an existing purchaser's report access", async () => {
    await expect(hasOwnEntitlement()).resolves.toBe(true);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("from billing.entitlements"), ["member-1", "saju-2027"]);
  });

  it("refuses new checkouts before touching the database", async () => {
    const order = createPendingOrder({
      locale: "ko",
      acceptedPurchaseTerms: true,
      acceptedWithdrawalNotice: true,
      acceptedEuWithdrawalWaiver: false,
      countryCode: "KR",
    });

    await expect(order).rejects.toBeInstanceOf(BillingAccessError);
    await expect(order).rejects.toMatchObject({ reason: "billing_unavailable" });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
