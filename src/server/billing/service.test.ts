import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TossPayment } from "./providerTypes";

const { queryMock, memberQueryMock, getSignedInMemberMock, hasRequiredMemberConsentsMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  memberQueryMock: vi.fn(),
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
  encryptPaymentKey: vi.fn(() => ({ ciphertext: "encrypted-payment-key", keyVersion: 1 })),
  paymentKeyDigest: vi.fn(() => Buffer.alloc(32, 1)),
}));

import { decryptBillingValue } from "./crypto";
import {
  applyTossPaymentEvent,
  getOwnActiveEntitlementId,
  getReceiptRecipient,
  hasOwnEntitlement,
  listBillingAdminOrders,
  listOwnBillingOrders,
  markOwnEntitlementViewed,
  markReceiptEmailFailed,
  markReceiptEmailUndeliverable,
  paymentEventHash,
  prepareMemberAccountDeletion,
  type AppliedPaymentEvent,
  type ReceiptEmailJob,
} from "./service";
import { withBillingTransaction } from "./workerDatabase";
import { withMemberTransaction } from "@/server/member/database";

const pendingOrder = {
  id: "order-1",
  user_id: "member-1",
  user_ref_hmac: Buffer.alloc(32, 2),
  product_key: "saju-2027",
  product_name_snapshot: "2027 Report",
  amount: 9_900,
  currency: "KRW",
  status: "pending",
  expires_at: new Date("2026-10-01T00:00:00.000Z"),
  paid_at: null,
  viewed_at: null,
};

const payment: TossPayment = {
  paymentKey: "payment-key",
  orderId: pendingOrder.id,
  status: "DONE",
  totalAmount: pendingOrder.amount,
  currency: pendingOrder.currency,
  method: "카드",
  approvedAt: "2026-09-30T00:00:00.000Z",
};

const memberClient = { query: memberQueryMock } as unknown as PoolClient;
const runMemberTransaction = async <T>(_userId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> =>
  operation(memberClient);

function configureMemberQueryResults(options: Readonly<{
  ownEntitlement?: string;
  subscriptionEntitlement?: string;
  productKey?: string;
}> = {}): string[] {
  const statements: string[] = [];
  memberQueryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
    const normalized = statement.replace(/\s+/gu, " ").trim().toLowerCase();
    statements.push(normalized);
    if (normalized.startsWith("select e.id::text from billing.entitlements")) {
      expect(parameters).toEqual(["member-1", options.productKey ?? "saju-2027"]);
      return { rows: options.ownEntitlement ? [{ id: options.ownEntitlement }] : [] };
    }
    if (normalized.startsWith("select e.id::text")) {
      return { rows: options.subscriptionEntitlement ? [{ id: options.subscriptionEntitlement }] : [] };
    }
    return { rows: [] };
  });
  vi.mocked(withMemberTransaction).mockImplementation(runMemberTransaction);
  return statements;
}

function setUpDatabase(options: Readonly<{
  eventInserted?: boolean;
  eventInsertSequence?: readonly boolean[];
  order?: typeof pendingOrder;
}> = {}): string[] {
  const statements: string[] = [];
  let eventInsertAttempt = 0;
  queryMock.mockImplementation(async (statement: string) => {
    const normalized = statement.replace(/\s+/gu, " ").trim().toLowerCase();
    statements.push(normalized);

    if (normalized.startsWith("insert into billing.webhook_events")) {
      const inserted = options.eventInsertSequence?.[eventInsertAttempt] ?? options.eventInserted !== false;
      eventInsertAttempt += 1;
      return { rows: inserted ? [{ id: "event-1" }] : [] };
    }
    if (normalized.startsWith("select id::text, user_id, user_ref_hmac, product_key")) {
      return { rows: options.order ? [options.order] : [pendingOrder] };
    }
    return { rows: [] };
  });

  const client = { query: queryMock } as unknown as PoolClient;
  const runInTransaction = async <T>(operation: (transactionClient: PoolClient) => Promise<T>): Promise<T> =>
    operation(client);
  vi.mocked(withBillingTransaction).mockImplementation(runInTransaction);
  return statements;
}

describe("Toss payment webhook state transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");
    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies a verified payment and creates its entitlement and receipt job once", async () => {
    const statements = setUpDatabase();

    const result = await applyTossPaymentEvent({
      eventId: "transmission-1",
      eventType: "PAYMENT_STATUS_CHANGED",
      payloadHash: Buffer.alloc(32, 3),
      payment,
    });

    expect(result).toBe("applied");
    expect(statements.some((statement) => statement.startsWith("insert into billing.payments"))).toBe(true);
    expect(statements.some((statement) => statement.includes("update billing.orders set status = 'paid'"))).toBe(true);
    expect(statements.some((statement) => statement.startsWith("insert into billing.entitlements"))).toBe(true);
    expect(statements.some((statement) => statement.startsWith("insert into billing.receipt_email_events"))).toBe(true);
  });

  it("grants one entitlement across five deliveries of the same webhook", async () => {
    const statements = setUpDatabase({ eventInsertSequence: [true, false, false, false, false] });
    const event = {
      eventId: "transmission-1",
      eventType: "PAYMENT_STATUS_CHANGED",
      payloadHash: Buffer.alloc(32, 3),
      payment,
    } as const;
    const results: AppliedPaymentEvent[] = [];
    for (let delivery = 0; delivery < 5; delivery += 1) {
      results.push(await applyTossPaymentEvent(event));
    }

    expect(results).toEqual(["applied", "duplicate", "duplicate", "duplicate", "duplicate"]);
    expect(statements.filter((statement) => statement.startsWith("insert into billing.entitlements"))).toHaveLength(1);
    expect(statements.filter((statement) => statement.startsWith("insert into billing.receipt_email_events"))).toHaveLength(1);
  });

  it("records a later event for an already-paid order as ignored without repeating grants", async () => {
    const statements = setUpDatabase({ order: { ...pendingOrder, status: "paid" } });

    const result = await applyTossPaymentEvent({
      eventId: "transmission-2",
      eventType: "PAYMENT_STATUS_CHANGED",
      payloadHash: Buffer.alloc(32, 4),
      payment,
    });

    expect(result).toBe("ignored");
    expect(statements.some((statement) => statement.includes("update billing.webhook_events set status = 'ignored'"))).toBe(true);
    expect(statements.some((statement) => statement.startsWith("insert into billing.payments"))).toBe(false);
    expect(statements.some((statement) => statement.startsWith("insert into billing.entitlements"))).toBe(false);
  });

  it("ignores a payment whose settled amount differs from the order", async () => {
    const statements = setUpDatabase();

    const result = await applyTossPaymentEvent({
      eventId: "transmission-3",
      eventType: "PAYMENT_STATUS_CHANGED",
      payloadHash: Buffer.alloc(32, 5),
      payment: { ...payment, totalAmount: payment.totalAmount + 1 },
    });

    expect(result).toBe("ignored");
    expect(statements.some((statement) => statement.includes("update billing.webhook_events set status = 'ignored'"))).toBe(true);
    expect(statements.some((statement) => statement.startsWith("insert into billing.payments"))).toBe(false);
    expect(statements.some((statement) => statement.startsWith("insert into billing.entitlements"))).toBe(false);
  });

  it("grants premium access only to the signed-in member with an active paid entitlement", async () => {
    const statements = configureMemberQueryResults({ ownEntitlement: "entitlement-1" });

    await expect(hasOwnEntitlement("saju-2027")).resolves.toBe(true);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("where e.user_id = $1 and e.product_key = $2");
    expect(statements[0]).toContain("e.status = 'active'");
    expect(statements[0]).toContain("o.status = 'paid'");
    expect(withMemberTransaction).toHaveBeenCalledWith("member-1", expect.any(Function));
  });

  it("falls back to an active LUMINA Plus entitlement only for the base report product", async () => {
    const statements = configureMemberQueryResults({ subscriptionEntitlement: "plus-entitlement-1" });

    await expect(hasOwnEntitlement("saju-2027")).resolves.toBe(true);

    expect(statements).toHaveLength(2);
    expect(statements[1]).toContain("s.status in ('active', 'past_due')");
    expect(statements[1]).toContain("e.status = 'active'");
  });

  it("does not fall back to a subscription for an unrelated product key", async () => {
    configureMemberQueryResults({ productKey: "lumina-plus-monthly" });

    await expect(hasOwnEntitlement("lumina-plus-monthly")).resolves.toBe(false);

    expect(memberQueryMock).toHaveBeenCalledTimes(1);
    expect(memberQueryMock.mock.calls[0]?.[1]).toEqual(["member-1", "lumina-plus-monthly"]);
  });

  it("marks a paid entitlement viewed only for the signed-in owner", async () => {
    const statements: string[] = [];
    queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
      const normalized = statement.replace(/\s+/gu, " ").trim().toLowerCase();
      statements.push(normalized);
      expect(parameters).toEqual(["member-1", "saju-2027"]);
      return { rows: [{ order_id: "order-1" }], rowCount: 1 };
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await expect(markOwnEntitlementViewed("saju-2027")).resolves.toBe(true);

    expect(statements[0]).toContain("where o.user_id = $1 and o.product_key = $2 and o.status = 'paid'");
    expect(statements[0]).toContain("e.user_id = $1 and e.status = 'active'");
  });

  it("denies access checks when the member is not signed in or lacks required consents", async () => {
    getSignedInMemberMock.mockResolvedValue(null);
    configureMemberQueryResults({ ownEntitlement: "entitlement-1" });

    await expect(hasOwnEntitlement("saju-2027")).rejects.toMatchObject({ reason: "authentication_required" });
    expect(memberQueryMock).not.toHaveBeenCalled();

    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(false);
    await expect(hasOwnEntitlement("saju-2027")).rejects.toMatchObject({
      name: "BillingAccessError",
      reason: "consent_required",
    });
    expect(memberQueryMock).not.toHaveBeenCalled();
  });
});

describe("billing orders and account lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");
    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists only the signed-in member's one-time orders and maps refund eligibility", async () => {
    memberQueryMock.mockResolvedValue({
      rows: [{
        id: "order-1",
        product_key: "saju-2027",
        product_name_snapshot: "2027 Report",
        amount: 9_900,
        currency: "KRW",
        status: "paid",
        created_at: "2026-10-01T00:00:00.000Z",
        paid_at: "2026-10-01T00:01:00.000Z",
        viewed_at: null,
        can_self_refund: true,
      }],
    });
    vi.mocked(withMemberTransaction).mockImplementation(runMemberTransaction);

    await expect(listOwnBillingOrders()).resolves.toEqual([{
      id: "order-1",
      productKey: "saju-2027",
      productName: "2027 Report",
      amount: 9_900,
      currency: "KRW",
      status: "paid",
      createdAt: "2026-10-01T00:00:00.000Z",
      paidAt: "2026-10-01T00:01:00.000Z",
      viewedAt: null,
      canSelfRefund: true,
    }]);

    const [statement, parameters] = memberQueryMock.mock.calls[0] ?? [];
    expect(parameters).toEqual(["member-1"]);
    expect(String(statement)).toContain("where user_id = $1 and subscription_invoice_id is null");
    expect(String(statement)).toContain("limit 100");
  });

  it("maps admin orders to pseudonymous user references", async () => {
    queryMock.mockResolvedValue({
      rows: [{
        id: "order-1",
        product_name_snapshot: "2027 Report",
        amount: 9_900,
        currency: "KRW",
        status: "refunding",
        created_at: "2026-10-01T00:00:00.000Z",
        paid_at: "2026-10-01T00:01:00.000Z",
        viewed_at: null,
        user_ref: "ab".repeat(32),
      }],
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await expect(listBillingAdminOrders()).resolves.toEqual([{
      id: "order-1",
      productName: "2027 Report",
      amount: 9_900,
      currency: "KRW",
      status: "refunding",
      createdAt: "2026-10-01T00:00:00.000Z",
      paidAt: "2026-10-01T00:01:00.000Z",
      viewedAt: null,
      userRef: "ab".repeat(32),
    }]);

    expect(String(queryMock.mock.calls[0]?.[0])).toContain("encode(o.user_ref_hmac, 'hex') as user_ref");
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("limit 200");
  });

  it("uses a paid base report entitlement before trying an active Plus entitlement", async () => {
    memberQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "plus-entitlement-1" }] });
    vi.mocked(withMemberTransaction).mockImplementation(runMemberTransaction);

    await expect(getOwnActiveEntitlementId("saju-2027")).resolves.toBe("plus-entitlement-1");

    expect(memberQueryMock).toHaveBeenCalledTimes(2);
    expect(memberQueryMock.mock.calls[1]?.[0]).toContain("s.status in ('active', 'past_due')");
  });

  it("does not use a Plus entitlement for an unrelated report product", async () => {
    memberQueryMock.mockResolvedValue({ rows: [] });
    vi.mocked(withMemberTransaction).mockImplementation(runMemberTransaction);

    await expect(getOwnActiveEntitlementId("lumina-plus-monthly")).resolves.toBeNull();

    expect(memberQueryMock).toHaveBeenCalledTimes(1);
  });

  it("uses an active Plus entitlement when first opening the base report", async () => {
    const statements: string[] = [];
    queryMock.mockImplementation(async (statement: string) => {
      statements.push(statement.replace(/\s+/gu, " ").trim().toLowerCase());
      return statements.length === 1 ? { rows: [], rowCount: 0 } : { rows: [{ id: "plus-entitlement-1" }], rowCount: 1 };
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await expect(markOwnEntitlementViewed("saju-2027")).resolves.toBe(true);

    expect(statements).toHaveLength(2);
    expect(statements[1]).toContain("s.product_key = any($2::text[])");
  });

  it("blocks account deletion while a pending paid order has not expired", async () => {
    queryMock.mockResolvedValue({
      rows: [{
        id: "order-1",
        status: "pending",
        expires_at: new Date(Date.now() + 60_000),
        user_ref_hmac: Buffer.alloc(32, 1),
      }],
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await expect(prepareMemberAccountDeletion("member-1"))
      .rejects.toMatchObject({ reason: "billing_pending_orders" });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("blocks account deletion while a subscription invoice is processing", async () => {
    queryMock.mockImplementation(async (statement: string) => statement.includes("from billing.orders where user_id")
      ? { rows: [] }
      : { rows: [{ id: "invoice-1" }] });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await expect(prepareMemberAccountDeletion("member-1"))
      .rejects.toMatchObject({ reason: "billing_pending_orders" });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("cancels pending subscriptions, schedules active ones to end, and scrubs billing contact data", async () => {
    const userRef = Buffer.alloc(32, 4);
    const calls: Array<Readonly<{ statement: string; parameters?: readonly unknown[] }>> = [];
    queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
      calls.push({ statement: statement.replace(/\s+/gu, " ").trim().toLowerCase(), parameters });
      if (statement.includes("from billing.orders where user_id")) {
        return { rows: [{ id: "order-paid", status: "paid", expires_at: new Date(0), user_ref_hmac: userRef }] };
      }
      if (statement.includes("from billing.subscriptions s")) return { rows: [] };
      if (statement.includes("from billing.subscriptions\n")) {
        return { rows: [
          { id: "sub-pending", status: "pending", user_ref_hmac: userRef },
          { id: "sub-active", status: "active", user_ref_hmac: userRef },
          { id: "sub-past-due", status: "past_due", user_ref_hmac: userRef },
        ] };
      }
      return { rows: [], rowCount: 0 };
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await prepareMemberAccountDeletion("member-1");

    const subscriptionUpdates = calls.filter(({ statement }) => statement.startsWith("update billing.subscriptions"));
    expect(subscriptionUpdates.map(({ parameters }) => parameters)).toEqual([
      ["sub-pending", true],
      ["sub-active", false],
      ["sub-past-due", false],
    ]);
    expect(calls.some(({ statement }) => statement.includes("update billing.receipt_email_events"))).toBe(true);
    expect(calls.some(({ statement }) => statement.includes("set receipt_email_ciphertext = null"))).toBe(true);
    expect(calls.some(({ statement, parameters }) => statement.startsWith("insert into billing.audit_events")
      && statement.includes("'account.delete_requested'")
      && parameters?.[2] === userRef.toString("hex"))).toBe(true);
  });

  it("uses subscription pseudonymous data when no order exists for account deletion", async () => {
    const userRef = Buffer.alloc(32, 7);
    const calls: Array<Readonly<{ statement: string; parameters?: readonly unknown[] }>> = [];
    queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
      calls.push({ statement: statement.replace(/\s+/gu, " ").trim().toLowerCase(), parameters });
      if (statement.includes("from billing.orders where user_id")) return { rows: [] };
      if (statement.includes("from billing.subscriptions\n")) {
        return { rows: [{ id: "sub-active", status: "active", user_ref_hmac: userRef }] };
      }
      return { rows: [] };
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await prepareMemberAccountDeletion("member-1");

    expect(calls.some(({ statement, parameters }) => statement.startsWith("insert into billing.audit_events")
      && parameters?.[1] === userRef)).toBe(true);
  });

  it("skips the billing cleanup when billing storage is disabled", async () => {
    vi.stubEnv("BILLING_DATABASE_URL", " ");

    await expect(prepareMemberAccountDeletion("member-1")).resolves.toBeUndefined();

    expect(withBillingTransaction).not.toHaveBeenCalled();
  });

  it("decrypts receipt recipients only when both the ciphertext and key version exist", () => {
    const job: ReceiptEmailJob = {
      orderId: "order-1",
      attemptCount: 1,
      ciphertext: null,
      keyVersion: 1,
      locale: "ko",
      productName: "2027 Report",
      amount: 9_900,
      currency: "KRW",
      paidAt: new Date("2026-10-01T00:00:00.000Z"),
    };
    expect(getReceiptRecipient(job)).toBeNull();
    expect(getReceiptRecipient({ ...job, ciphertext: "receipt-ciphertext", keyVersion: null })).toBeNull();
    expect(decryptBillingValue).not.toHaveBeenCalled();

    vi.mocked(decryptBillingValue).mockReturnValue("member@example.test");
    expect(getReceiptRecipient({ ...job, ciphertext: "receipt-ciphertext" })).toBe("member@example.test");
    expect(decryptBillingValue).toHaveBeenCalledWith("receipt-ciphertext", "receipt-email", "order-1", 1);
  });

  it("marks failed receipt attempts and constrains provider error codes", async () => {
    const calls: Array<Readonly<{ statement: string; parameters?: readonly unknown[] }>> = [];
    queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
      calls.push({ statement: statement.replace(/\s+/gu, " ").trim().toLowerCase(), parameters });
      return { rows: [], rowCount: 1 };
    });
    const client = { query: queryMock } as unknown as PoolClient;
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));

    await markReceiptEmailFailed("order-1", 20, "bad provider code!");
    await markReceiptEmailUndeliverable("order-2", 3);

    expect(calls[0]?.parameters).toEqual(["order-1", 20, "provider_error"]);
    expect(calls[0]?.statement).toContain("when attempt_count >= 20 then 'failed' else 'pending'");
    expect(calls[1]?.parameters).toEqual(["order-2", 3]);
    expect(calls[1]?.statement).toContain("last_error_code = 'missing_recipient'");
  });

  it("hashes verified event payloads consistently for idempotent processing", () => {
    const event = { type: "PAYMENT_STATUS_CHANGED", id: "event-1" };

    expect(paymentEventHash(event)).toEqual(paymentEventHash(event));
    expect(paymentEventHash(event)).not.toEqual(paymentEventHash({ ...event, id: "event-2" }));
  });
});
