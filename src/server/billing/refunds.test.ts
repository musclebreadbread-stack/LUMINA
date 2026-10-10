import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  queryMock,
  getSignedInMemberMock,
  hasRequiredMemberConsentsMock,
  decryptBillingValueMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getSignedInMemberMock: vi.fn(),
  hasRequiredMemberConsentsMock: vi.fn(),
  decryptBillingValueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: { billing: true } }));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: hasRequiredMemberConsentsMock }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: vi.fn() }));
vi.mock("./crypto", () => ({
  decryptBillingValue: decryptBillingValueMock,
  encryptBillingValue: vi.fn(),
  encryptPaymentKey: vi.fn(),
  paymentKeyDigest: vi.fn(),
}));

import { applyTossCancellation, BillingInputError, failReservedRefund, reserveOwnRefund } from "./service";
import { withBillingTransaction } from "./workerDatabase";

const orderId = "123e4567-e89b-42d3-a456-426614174000";
const paymentId = "123e4567-e89b-42d3-a456-426614174001";
const memberId = "member-1";

type RefundOrder = Readonly<{
  id: string;
  user_id: string;
  user_ref_hmac: Buffer;
  status: string;
  paid_at: Date | null;
  viewed_at: Date | null;
  amount: number;
  payment_id: string;
  encrypted_key: string;
  key_version: number;
}>;

const paidOrder: RefundOrder = {
  id: orderId,
  user_id: memberId,
  user_ref_hmac: Buffer.alloc(32, 1),
  status: "paid",
  paid_at: new Date(Date.now() - 60_000),
  viewed_at: null,
  amount: 9_900,
  payment_id: paymentId,
  encrypted_key: "encrypted-payment-key",
  key_version: 1,
};

type PendingRefund = Readonly<{
  id: string;
  reason_code: string;
  actor_user_id: string | null;
  created_at: Date;
}>;

const recentPendingRefund: PendingRefund = {
  id: "refund-existing",
  reason_code: "duplicate_purchase",
  actor_user_id: memberId,
  created_at: new Date(),
};

function configureDatabase(options: Readonly<{
  order?: RefundOrder;
  pendingRefund?: PendingRefund;
  settleRefund?: boolean;
  failRefundReservation?: boolean;
  completedRefund?: Readonly<{ id: string; paymentId: string }>;
}> = {}): string[] {
  const statements: string[] = [];
  queryMock.mockImplementation(async (statement: string, values?: readonly unknown[]) => {
    const normalized = statement.replace(/\s+/gu, " ").trim().toLowerCase();
    statements.push(normalized);

    if (normalized.startsWith("select id::text from billing.orders")) {
      const order = options.order ?? paidOrder;
      return { rows: order.status === "refunding" ? [{ id: order.id }] : [] };
    }
    if (normalized.startsWith("select o.id::text")) return { rows: [options.order ?? paidOrder] };
    if (normalized.startsWith("select id::text from billing.payments")) return { rows: [{ id: paymentId }] };
    if (normalized.startsWith("select r.id::text from billing.refunds r where r.id = $1")) {
      const [refundId, refundPaymentId] = values ?? [];
      const completedRefund = options.completedRefund;
      return completedRefund !== undefined
        && completedRefund.id === refundId
        && completedRefund.paymentId === refundPaymentId
        ? { rows: [{ id: completedRefund.id }] }
        : { rows: [] };
    }
    if (normalized.startsWith("select r.id::text")) {
      return { rows: options.pendingRefund ? [options.pendingRefund] : [] };
    }
    if (normalized.startsWith("update billing.refunds set status = 'failed'")) {
      return options.failRefundReservation ? { rows: [{ id: "refund-existing" }] } : { rows: [] };
    }
    if (normalized.startsWith("update billing.refunds")) {
      return options.settleRefund
        ? { rows: [{ actor_user_id: memberId, actor_ref_hmac: Buffer.alloc(32, 1), reason_code: "changed_mind" }] }
        : { rows: [] };
    }
    if (normalized.startsWith("insert into billing.refunds")) return { rows: [{ id: "refund-new" }] };
    return { rows: [] };
  });

  const client = { query: queryMock } as unknown as PoolClient;
  const runInTransaction = async <T>(operation: (transactionClient: PoolClient) => Promise<T>): Promise<T> =>
    operation(client);
  vi.mocked(withBillingTransaction).mockImplementation(runInTransaction);
  return statements;
}

describe("self-service refund reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");
    getSignedInMemberMock.mockResolvedValue({ user: { id: memberId, email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
    decryptBillingValueMock.mockReturnValue("provider-payment-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reuses the same pending reservation for an owner retry while refunding", async () => {
    const statements = configureDatabase({
      order: { ...paidOrder, status: "refunding" },
      pendingRefund: recentPendingRefund,
    });

    const reservation = await reserveOwnRefund(orderId, "changed_mind");

    expect(reservation).toEqual({
      id: "refund-existing",
      orderId,
      paymentKey: "provider-payment-key",
      reasonCode: "duplicate_purchase",
    });
    expect(statements.some((statement) => statement.startsWith("insert into billing.refunds"))).toBe(false);
    expect(statements.some((statement) => statement.includes("update billing.orders set status = 'refunding'"))).toBe(false);
    expect(decryptBillingValueMock).toHaveBeenCalledWith("encrypted-payment-key", "payment-key", orderId, 1);
  });

  it("does not let an owner retry a reservation created by an admin", async () => {
    configureDatabase({
      order: { ...paidOrder, status: "refunding" },
      pendingRefund: { ...recentPendingRefund, id: "refund-admin", reason_code: "support_adjustment", actor_user_id: "admin-1" },
    });

    await expect(reserveOwnRefund(orderId, "changed_mind"))
      .rejects.toBeInstanceOf(BillingInputError);
    expect(decryptBillingValueMock).not.toHaveBeenCalled();
  });

  it("rejects a refunding order that has no pending refund reservation", async () => {
    configureDatabase({ order: { ...paidOrder, status: "refunding" } });

    await expect(reserveOwnRefund(orderId, "changed_mind"))
      .rejects.toMatchObject({ reason: "refund_unavailable" });
    expect(decryptBillingValueMock).not.toHaveBeenCalled();
  });

  it("stops automatic retries before the provider idempotency key expires", async () => {
    configureDatabase({
      order: { ...paidOrder, status: "refunding" },
      pendingRefund: {
        ...recentPendingRefund,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    });

    await expect(reserveOwnRefund(orderId, "changed_mind"))
      .rejects.toMatchObject({ reason: "refund_unavailable" });
    expect(decryptBillingValueMock).not.toHaveBeenCalled();
  });

  it("creates a reservation for an unviewed order within the seven-day self-refund window", async () => {
    const statements = configureDatabase();

    const reservation = await reserveOwnRefund(orderId, "changed_mind");

    expect(reservation.id).toBe("refund-new");
    expect(statements.some((statement) => statement.startsWith("insert into billing.refunds"))).toBe(true);
    expect(statements.some((statement) => statement.includes("update billing.orders set status = 'refunding'"))).toBe(true);
  });

  it("still rejects a self-refund after the paid report was viewed", async () => {
    configureDatabase({ order: { ...paidOrder, viewed_at: new Date() } });

    await expect(reserveOwnRefund(orderId, "changed_mind"))
      .rejects.toMatchObject({ reason: "refund_unavailable" });
  });

  it("rejects a self-refund when the settlement timestamp is in the future", async () => {
    configureDatabase({ order: { ...paidOrder, paid_at: new Date(Date.now() + 60_000) } });

    await expect(reserveOwnRefund(orderId, "changed_mind"))
      .rejects.toMatchObject({ reason: "refund_unavailable" });
  });

  it("marks the refund paid, revokes the entitlement, and writes an audit event", async () => {
    const statements = configureDatabase({
      order: { ...paidOrder, status: "refunding" },
      settleRefund: true,
    });

    await applyTossCancellation({ orderId, refundId: "refund-existing", providerRefundId: "provider-refund-1" });

    expect(statements.some((statement) => statement.startsWith("update billing.refunds"))).toBe(true);
    expect(statements.some((statement) => statement.includes("update billing.payments set status = 'cancelled'"))).toBe(true);
    expect(statements.some((statement) => statement.includes("update billing.orders set status = 'refunded'"))).toBe(true);
    expect(statements.some((statement) => statement.includes("update billing.entitlements set status = 'revoked'"))).toBe(true);
    expect(statements.some((statement) => statement.startsWith("insert into billing.audit_events"))).toBe(true);
  });

  it("treats a matching completed refund retry as idempotent success", async () => {
    const statements = configureDatabase({
      order: { ...paidOrder, status: "refunded" },
      completedRefund: { id: "refund-existing", paymentId },
    });

    await expect(applyTossCancellation({ orderId, refundId: "refund-existing", providerRefundId: "provider-refund-1" }))
      .resolves.toBeUndefined();

    expect(statements.some((statement) => statement.includes("where r.id = $1 and r.payment_id = $2 and r.status = 'succeeded'"))).toBe(true);
    expect(statements.some((statement) => statement.startsWith("update billing.refunds"))).toBe(false);
    expect(statements.some((statement) => statement.startsWith("insert into billing.audit_events"))).toBe(false);
  });

  it.each([
    {
      description: "a different refund ID",
      inputRefundId: "refund-stale",
      completedRefund: { id: "refund-existing", paymentId },
    },
    {
      description: "a different payment ID",
      inputRefundId: "refund-existing",
      completedRefund: { id: "refund-existing", paymentId: "payment-other" },
    },
  ])("rejects an already-refunded retry matching neither $description", async ({ inputRefundId, completedRefund }) => {
    const statements = configureDatabase({
      order: { ...paidOrder, status: "refunded" },
      completedRefund,
    });

    await expect(applyTossCancellation({ orderId, refundId: inputRefundId, providerRefundId: "provider-refund-1" }))
      .rejects.toMatchObject({ reason: "payment_state_invalid" });

    expect(statements.some((statement) => statement.startsWith("update billing.refunds"))).toBe(false);
  });

  it("restores an order only after failing its matching pending refund", async () => {
    const statements = configureDatabase({
      order: { ...paidOrder, status: "refunding" },
      failRefundReservation: true,
    });

    await failReservedRefund({ refundId: "refund-existing", orderId, errorCode: "provider_cancel_rejected" });

    expect(statements[0]).toContain("where id = $1 and status = 'refunding' for update");
    expect(statements[1]).toContain("and status = 'pending' returning id::text");
    expect(statements[2]).toContain("update billing.orders set status = 'paid'");
  });

  it("keeps the order refunding when no matching pending refund was failed", async () => {
    const statements = configureDatabase({ order: { ...paidOrder, status: "refunding" } });

    await failReservedRefund({ refundId: "refund-stale", orderId, errorCode: "provider_cancel_rejected" });

    expect(statements).toHaveLength(2);
    expect(statements[1]).toContain("where id = $1 and payment_id = (select id from billing.payments where order_id = $2)");
    expect(statements[1]).toContain("and status = 'pending' returning id::text");
  });

  it("does not change a refund after another transition already closed the order", async () => {
    const statements = configureDatabase({ order: { ...paidOrder, status: "refunded" } });

    await failReservedRefund({ refundId: "refund-existing", orderId, errorCode: "provider_cancel_rejected" });

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("where id = $1 and status = 'refunding' for update");
  });
});
