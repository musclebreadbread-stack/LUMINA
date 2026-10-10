import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, getSignedInMemberMock, hasRequiredMemberConsentsMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getSignedInMemberMock: vi.fn(),
  hasRequiredMemberConsentsMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: hasRequiredMemberConsentsMock }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: vi.fn() }));
vi.mock("./crypto", () => ({
  decryptBillingValue: vi.fn(),
  encryptBillingValue: vi.fn(),
  encryptPaymentKey: vi.fn(),
  paymentKeyDigest: vi.fn(),
}));

import { BillingInputError, getOwnOrder, listOwnBillingOrders } from "./service";
import { withMemberTransaction } from "@/server/member/database";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const memberClient = { query: queryMock } as unknown as PoolClient;

function configureMemberQuery(rows: readonly Record<string, unknown>[]): string[] {
  const statements: string[] = [];
  queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
    statements.push(statement.replace(/\s+/gu, " ").trim().toLowerCase());
    if (statements.at(-1)?.includes("where id = $1 and user_id = $2")) {
      expect(parameters).toEqual([orderId, "member-1"]);
    } else {
      expect(parameters).toEqual(["member-1"]);
    }
    return { rows };
  });

  vi.mocked(withMemberTransaction).mockImplementation(async (userId, operation) => {
    expect(userId).toBe("member-1");
    return operation(memberClient);
  });
  return statements;
}

describe("member billing read service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");
    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects malformed and non-owned order IDs with the same not-found error", async () => {
    configureMemberQuery([]);

    await expect(getOwnOrder("not-an-order-id")).rejects.toBeInstanceOf(BillingInputError);
    await expect(getOwnOrder(orderId)).rejects.toMatchObject({ reason: "order_not_found" });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("returns a single order only through a member-scoped query", async () => {
    const statements = configureMemberQuery([{
      id: orderId,
      amount: 9_900,
      currency: "KRW",
      status: "paid",
    }]);

    await expect(getOwnOrder(orderId)).resolves.toEqual({
      id: orderId,
      amount: 9_900,
      currency: "KRW",
      status: "paid",
    });
    expect(statements[0]).toContain("where id = $1 and user_id = $2 limit 1");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("maps own non-subscription orders and preserves the server refund eligibility flag", async () => {
    const statements = configureMemberQuery([{
      id: orderId,
      product_key: "saju-2027",
      product_name_snapshot: "2027 Report",
      amount: 9_900,
      currency: "KRW",
      status: "paid",
      created_at: "2026-09-30T00:00:00.000Z",
      paid_at: "2026-09-30T00:01:00.000Z",
      viewed_at: null,
      can_self_refund: true,
    }]);

    await expect(listOwnBillingOrders()).resolves.toEqual([{
      id: orderId,
      productKey: "saju-2027",
      productName: "2027 Report",
      amount: 9_900,
      currency: "KRW",
      status: "paid",
      createdAt: "2026-09-30T00:00:00.000Z",
      paidAt: "2026-09-30T00:01:00.000Z",
      viewedAt: null,
      canSelfRefund: true,
    }]);
    expect(statements[0]).toContain("where user_id = $1 and subscription_invoice_id is null");
    expect(statements[0]).toContain("limit 100");
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), ["member-1"]);
  });
});
