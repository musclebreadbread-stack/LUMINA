import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const flags = vi.hoisted(() => ({ serverFeatureFlags: { billing: true } }));
vi.mock("@/lib/flags", () => flags);

const auth = vi.hoisted(() => ({ getSignedInMember: vi.fn() }));
vi.mock("@/server/auth/session", () => auth);

const consents = vi.hoisted(() => ({ hasRequiredMemberConsents: vi.fn() }));
vi.mock("@/server/member/consents", () => consents);

const snapshots = vi.hoisted(() => ({ snapshotOwnProfile: vi.fn() }));
vi.mock("@/server/member/profileSnapshot", () => snapshots);

const attribution = vi.hoisted(() => ({ recordOrderAttribution: vi.fn() }));
vi.mock("../orderAttribution", () => attribution);

const query = vi.hoisted(() => vi.fn());
const tx = vi.hoisted(() => ({
  withBillingTransaction: vi.fn(),
  withMemberTransaction: vi.fn(),
}));
vi.mock("../workerDatabase", () => ({ withBillingTransaction: tx.withBillingTransaction }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: tx.withMemberTransaction }));

const ai = vi.hoisted(() => ({ getAIUsageCostSummary: vi.fn() }));
vi.mock("@/server/ai/service", () => ai);

import { encryptBillingValue } from "../crypto";
import * as service from "../service";

const USER_ID = "user-1";
const ORDER_ID = "123e4567-e89b-42d3-a456-426614174000";
const ENC_KEY = "0123456789abcdef".repeat(4);
const HMAC_KEY = "h".repeat(40);

type Rows = { rows: unknown[]; rowCount?: number };

/** Queue results for successive client.query calls in a transaction. */
function queue(...results: Array<Rows | Error>) {
  for (const result of results) {
    if (result instanceof Error) query.mockRejectedValueOnce(result);
    else query.mockResolvedValueOnce({ rowCount: result.rows.length, ...result });
  }
}
const rows = (...items: unknown[]): Rows => ({ rows: items });
const none: Rows = { rows: [] };

function sqlOf(index: number): string {
  return (query.mock.calls[index]?.[0] as string) ?? "";
}

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { reason?: string; message: string }).reason ?? (error as Error).message;
  }
  return "no-error";
}

function configureCheckout() {
  vi.stubEnv("BILLING_DATABASE_URL", "postgres://example.invalid/db");
  vi.stubEnv("BILLING_LEGAL_DOCUMENTS_APPROVED", "true");
  vi.stubEnv("TOSS_CLIENT_KEY", "test_ck_example");
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_example");
  vi.stubEnv("BILLING_ENCRYPTION_KEY", ENC_KEY);
  vi.stubEnv("BILLING_USER_REF_HMAC_KEY", HMAC_KEY);
  vi.stubEnv("BILLING_TERMS_VERSION", "terms-1");
  vi.stubEnv("BILLING_WITHDRAWAL_NOTICE_VERSION", "wd-1");
  vi.stubEnv("MEMBER_TRANSFER_VERSION", "tr-1");
  vi.stubEnv("BILLING_EU_WITHDRAWAL_WAIVER_VERSION", "eu-1");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example");
  vi.stubEnv("APP_ENV", "production");
}

beforeEach(() => {
  vi.clearAllMocks();
  query.mockReset();
  flags.serverFeatureFlags.billing = true;
  configureCheckout();
  const run = async (...args: unknown[]) => (args[args.length - 1] as (client: unknown) => unknown)({ query });
  tx.withBillingTransaction.mockImplementation(run);
  tx.withMemberTransaction.mockImplementation(run);
  auth.getSignedInMember.mockResolvedValue({ user: { id: USER_ID, email: "user@example.com" } });
  consents.hasRequiredMemberConsents.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("member gating", () => {
  it("rejects when storage is unavailable, unauthenticated, or consents are missing", async () => {
    vi.stubEnv("BILLING_DATABASE_URL", "");
    expect(await code(service.getMemberForBilling())).toBe("billing_unavailable");
    configureCheckout();
    auth.getSignedInMember.mockResolvedValueOnce(null);
    expect(await code(service.getMemberForBilling())).toBe("authentication_required");
    consents.hasRequiredMemberConsents.mockResolvedValueOnce(false);
    expect(await code(service.getMemberForBilling())).toBe("consent_required");
    await expect(service.getMemberForBilling()).resolves.toEqual({ id: USER_ID, email: "user@example.com" });
  });

  it("requires full checkout config (flag and env) only for checkout paths", async () => {
    flags.serverFeatureFlags.billing = false;
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("billing_unavailable");
    expect(service.getBillingClientKey()).toBeNull();
    flags.serverFeatureFlags.billing = true;
    expect(service.getBillingClientKey()).toBe("test_ck_example");
    vi.stubEnv("TOSS_CLIENT_KEY", "");
    expect(service.getBillingClientKey()).toBeNull();
  });
});

function baseOrderInput(overrides: Record<string, unknown> = {}) {
  return {
    productKey: "saju-2027",
    locale: "en",
    acceptedPurchaseTerms: true,
    acceptedWithdrawalNotice: true,
    acceptedEuWithdrawalWaiver: false,
    countryCode: "KR",
    attribution: null,
    ...overrides,
  } as unknown as Parameters<typeof service.createPendingOrder>[0];
}

describe("createPendingOrder", () => {
  function queueCreate() {
    snapshots.snapshotOwnProfile.mockResolvedValue({
      id: "profile-1",
      profile: { year: 1990, month: 1, day: 2, calendar: "solar", isLeapMonth: false, hour: 3, minute: 4, dayBoundaryRule: "x" },
    });
    queue(
      rows({ id: "price-1", product_key: "saju-2027", name_ko: "사주", name_en: "Saju", amount: 9900, currency: "KRW" }),
      rows({ id: ORDER_ID }),
      none,
      none, none, none,
    );
  }

  it("creates an order, stores consents and returns redirect urls and a customer key", async () => {
    queueCreate();
    const created = await service.createPendingOrder(baseOrderInput());
    expect(created).toMatchObject({
      orderName: "Saju",
      amount: 9900,
      currency: "KRW",
      clientKey: "test_ck_example",
      successUrl: "https://lumina.example/api/billing/toss/return?locale=en",
      failUrl: "https://lumina.example/api/billing/toss/fail?locale=en",
    });
    expect(created.customerKey).toMatch(/^[A-Za-z0-9_-]{20,}$/u);
    expect(attribution.recordOrderAttribution).toHaveBeenCalledOnce();
    const consentCalls = query.mock.calls.filter(([sql]) => (sql as string).includes("order_consents"));
    expect(consentCalls.map((call) => (call[1] as string[])[1])).toEqual(["purchase_terms", "withdrawal_restriction", "overseas_transfer"]);
  });

  it("uses the Korean name for ko and adds the EU waiver consent for EU buyers", async () => {
    snapshots.snapshotOwnProfile.mockResolvedValue({ id: "p", profile: { year: 1 } });
    queue(
      rows({ id: "price-1", product_key: "saju-2027", name_ko: "사주", name_en: "Saju", amount: 9900, currency: "KRW" }),
      rows({ id: ORDER_ID }), none, none, none, none, none,
    );
    const created = await service.createPendingOrder(baseOrderInput({ locale: "ko", countryCode: "DE", acceptedEuWithdrawalWaiver: true }));
    expect(created.orderName).toBe("사주");
    const types = query.mock.calls.filter(([sql]) => (sql as string).includes("order_consents")).map((call) => (call[1] as string[])[1]);
    expect(types).toContain("eu_withdrawal_waiver");
  });

  it("validates input, consents, documents and EU waiver before touching the database", async () => {
    expect(await code(service.createPendingOrder(baseOrderInput({ productKey: "lumina-plus-monthly" })))).toBe("product_unavailable");
    expect(await code(service.createPendingOrder(baseOrderInput({ acceptedPurchaseTerms: false })))).toBe("payment_state_invalid");
    expect(await code(service.createPendingOrder(baseOrderInput({ acceptedWithdrawalNotice: false })))).toBe("payment_state_invalid");
    expect(await code(service.createPendingOrder(baseOrderInput({ countryCode: "FR" })))).toBe("payment_state_invalid");
    vi.stubEnv("BILLING_TERMS_VERSION", "x".repeat(101));
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("billing_unavailable");
    configureCheckout();
    vi.stubEnv("BILLING_EU_WITHDRAWAL_WAIVER_VERSION", "");
    expect(await code(service.createPendingOrder(baseOrderInput({ countryCode: "FR", acceptedEuWithdrawalWaiver: true })))).toBe("billing_unavailable");
    expect(tx.withMemberTransaction).not.toHaveBeenCalled();
  });

  it("requires a profile and an available price", async () => {
    snapshots.snapshotOwnProfile.mockResolvedValueOnce(null);
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("profile_required");
    snapshots.snapshotOwnProfile.mockResolvedValue({ id: "p", profile: {} });
    queue(none);
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("product_unavailable");
    queue(rows({ id: "1", product_key: "saju-2027", name_ko: "a", name_en: "b", amount: 1, currency: "USD" }));
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("product_unavailable");
    queue(rows({ id: "1", product_key: "saju-2027", name_ko: "a", name_en: "b", amount: 1, currency: "KRW" }), none);
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("Pending order was not created");
  });

  it("rejects unsafe site origins after the order is stored", async () => {
    const bad = ["", "http://lumina.example", "https://u:p@lumina.example", "https://lumina.example/path", "https://lumina.example/?q=1", "https://lumina.example/#h"];
    for (const origin of bad) {
      queueCreate();
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
      expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("billing_unavailable");
    }
    queueCreate();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("APP_ENV", "development");
    await expect(service.createPendingOrder(baseOrderInput())).resolves.toMatchObject({ successUrl: "http://localhost:3000/api/billing/toss/return?locale=en" });
  });

  it("fails without a valid HMAC key", async () => {
    vi.stubEnv("BILLING_USER_REF_HMAC_KEY", "short");
    // billingCheckoutReady only checks non-empty; the key length is enforced when hashing.
    queueCreate();
    expect(await code(service.createPendingOrder(baseOrderInput()))).toBe("BILLING_USER_REF_HMAC_KEY is not configured");
  });
});

describe("own order queries", () => {
  it("getOwnOrder validates the id and maps the row", async () => {
    expect(await code(service.getOwnOrder("nope"))).toBe("order_not_found");
    queue(none);
    expect(await code(service.getOwnOrder(ORDER_ID))).toBe("order_not_found");
    queue(rows({ id: ORDER_ID, product_key: "saju-2027", amount: 1, currency: "KRW", status: "paid", viewed_at: null }));
    await expect(service.getOwnOrder(ORDER_ID)).resolves.toEqual({
      id: ORDER_ID, productKey: "saju-2027", amount: 1, currency: "KRW", status: "paid", viewedAt: null,
    });
  });

  it("listOwnBillingOrders maps snake_case rows", async () => {
    queue(rows({
      id: "o1", product_key: "k", product_name_snapshot: "N", amount: 5, currency: "KRW", status: "paid",
      created_at: "c", paid_at: "p", viewed_at: null, can_self_refund: true,
    }));
    await expect(service.listOwnBillingOrders()).resolves.toEqual([{
      id: "o1", productKey: "k", productName: "N", amount: 5, currency: "KRW", status: "paid",
      createdAt: "c", paidAt: "p", viewedAt: null, canSelfRefund: true,
    }]);
  });

  it("getOwnOrderProfileIds drops null profile ids", async () => {
    queue(rows({ profile_id: "a" }, { profile_id: null }, { profile_id: "b" }));
    await expect(service.getOwnOrderProfileIds(ORDER_ID)).resolves.toEqual(["a", "b"]);
  });
});

describe("admin listings and KPIs", () => {
  it("listBillingAdminOrders requires storage and maps rows", async () => {
    queue(rows({ id: "o", product_name_snapshot: "N", amount: 1, currency: "KRW", status: "paid", created_at: "c", paid_at: null, viewed_at: null, user_ref: "ab" }));
    await expect(service.listBillingAdminOrders()).resolves.toEqual([
      { id: "o", productName: "N", amount: 1, currency: "KRW", status: "paid", createdAt: "c", paidAt: null, viewedAt: null, userRef: "ab" },
    ]);
    vi.stubEnv("BILLING_DATABASE_URL", "");
    expect(await code(service.listBillingAdminOrders())).toBe("billing_unavailable");
  });

  it("getBillingChannelSummary is null without storage and clamps values", async () => {
    queue(rows({ source: "(none)", landing_path: "/", paid_orders: -3, gross_krw: "abc", refunded_orders: 2 }));
    await expect(service.getBillingChannelSummary()).resolves.toEqual([
      { source: "(none)", landingPath: "/", paidOrders: 0, grossKrw: 0, refundedOrders: 2 },
    ]);
    vi.stubEnv("BILLING_DATABASE_URL", "");
    await expect(service.getBillingChannelSummary()).resolves.toBeNull();
  });

  const kpiRow = { mrr_krw: "5000", net_revenue_30d_krw: "100000", active_payers_30d: 4, paid_orders_30d: 8, refunded_orders_30d: 2 };

  it("getBillingKpiSummary returns null without storage or without a row", async () => {
    queue(none);
    await expect(service.getBillingKpiSummary()).resolves.toBeNull();
    vi.stubEnv("BILLING_DATABASE_URL", "");
    await expect(service.getBillingKpiSummary()).resolves.toBeNull();
  });

  it("computes ARPPU, refund rate and AI cost share with a valid exchange rate", async () => {
    vi.stubEnv("REPORTING_KRW_PER_USD", "1400");
    queue(rows(kpiRow));
    ai.getAIUsageCostSummary.mockResolvedValue({ costMicrousd: 10_000_000, estimatedRequests: 42 });
    const summary = await service.getBillingKpiSummary();
    expect(ai.getAIUsageCostSummary).toHaveBeenCalledWith(30);
    expect(summary).toEqual({
      netRevenue30dKrw: 100000,
      mrrKrw: 5000,
      arppuKrw: 25000,
      refundRatePercent: 25,
      activePayers30d: 4,
      aiCostUsd30d: 10,
      aiCostSharePercent: 14,
      aiEstimatedRequests30d: 42,
    });
  });

  it("degrades gracefully: AI failure, bad exchange rate, zero denominators", async () => {
    vi.stubEnv("REPORTING_KRW_PER_USD", "10");
    queue(rows({ ...kpiRow, active_payers_30d: 0, paid_orders_30d: 0, net_revenue_30d_krw: "0" }));
    ai.getAIUsageCostSummary.mockRejectedValue(new Error("ai db disabled"));
    const summary = await service.getBillingKpiSummary();
    expect(summary).toMatchObject({
      arppuKrw: null, refundRatePercent: null, aiCostUsd30d: null, aiCostSharePercent: null, aiEstimatedRequests30d: null,
    });
    vi.stubEnv("REPORTING_KRW_PER_USD", "1400");
    queue(rows(kpiRow));
    ai.getAIUsageCostSummary.mockResolvedValue({ costMicrousd: 1_000_000, estimatedRequests: 1 });
    vi.stubEnv("REPORTING_KRW_PER_USD", "9999");
    expect((await service.getBillingKpiSummary())?.aiCostSharePercent).toBeNull();
  });
});

describe("applyTossPaymentEvent", () => {
  const payment = {
    paymentKey: "pay_key",
    orderId: ORDER_ID,
    status: "DONE",
    totalAmount: 9900,
    currency: "KRW",
    method: "CARD",
    approvedAt: "2026-03-01T00:00:00.000Z",
    lastTransactionKey: "tx1",
  };
  const order = (overrides: Record<string, unknown> = {}) => ({
    id: ORDER_ID, user_id: USER_ID, user_ref_hmac: Buffer.from("r"), product_key: "saju-2027", product_name_snapshot: "N",
    amount: 9900, currency: "KRW", status: "pending", expires_at: new Date(), paid_at: null, viewed_at: null, ...overrides,
  });
  const input = (overrides: Record<string, unknown> = {}) => ({
    eventId: "evt:1", eventType: "PAYMENT_STATUS_CHANGED", payloadHash: Buffer.from("h"), payment: payment as never, ...overrides,
  });

  it("rejects malformed event ids before any query", async () => {
    expect(await code(service.applyTossPaymentEvent(input({ eventId: "bad id" })))).toBe("payment_state_invalid");
    expect(query).not.toHaveBeenCalled();
  });

  it("reports duplicates when the event row already exists", async () => {
    queue(none);
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("duplicate");
  });

  it("ignores unknown orders, non-DONE status, and amount or currency mismatches", async () => {
    queue(rows({ id: "e" }), none, none);
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("ignored");
    expect(sqlOf(2)).toContain("status = 'ignored'");
    queue(rows({ id: "e" }), rows(order()), none);
    await expect(service.applyTossPaymentEvent(input({ payment: { ...payment, status: "CANCELED" } }))).resolves.toBe("ignored");
    queue(rows({ id: "e" }), rows(order({ amount: 1 })), none);
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("ignored");
    queue(rows({ id: "e" }), rows(order({ currency: "USD" })), none);
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("ignored");
  });

  it("ignores an already paid order without further writes and marks other states ignored", async () => {
    query.mockReset();
    queue(rows({ id: "e" }), rows(order({ status: "paid" })));
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("ignored");
    expect(query).toHaveBeenCalledTimes(2);
    queue(rows({ id: "e" }), rows(order({ status: "cancelled" })), none);
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("ignored");
  });

  it("applies a DONE payment: payment row, paid order, entitlement, receipt event", async () => {
    query.mockReset();
    queue(rows({ id: "e" }), rows(order()), none, none, none, none);
    await expect(service.applyTossPaymentEvent(input())).resolves.toBe("applied");
    expect(query).toHaveBeenCalledTimes(6);
    expect(sqlOf(2)).toContain("insert into billing.payments");
    const paymentParams = query.mock.calls[2]?.[1] as unknown[];
    expect(paymentParams[0]).toBe(ORDER_ID);
    expect(paymentParams[1]).not.toContain("pay_key");
    expect(paymentParams[7]).toBe("tx1");
    expect((paymentParams[8] as Date).toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(sqlOf(4)).toContain("billing.entitlements");
    expect(sqlOf(5)).toContain("receipt_email_events");
  });

  it("skips the entitlement for orders without a user and defaults approval time and transaction key", async () => {
    query.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T00:00:00Z"));
    try {
      queue(rows({ id: "e" }), rows(order({ user_id: null })), none, none, none);
      const result = await service.applyTossPaymentEvent(input({ payment: { ...payment, approvedAt: null, lastTransactionKey: undefined } }));
      expect(result).toBe("applied");
    } finally {
      vi.useRealTimers();
    }
    expect(query).toHaveBeenCalledTimes(5);
    const params = query.mock.calls[2]?.[1] as unknown[];
    expect(params[7]).toBeNull();
    expect((params[8] as Date).toISOString()).toBe("2026-05-05T00:00:00.000Z");
  });
});

describe("cancellations", () => {
  it("applyTossCancellation finalizes a plain order and writes an audit event", async () => {
    queue(
      rows({ id: ORDER_ID, status: "refunding", subscription_invoice_id: null }),
      rows({ id: "pay-1" }),
      rows({ actor_user_id: USER_ID, actor_ref_hmac: null, reason_code: "customer" }),
      none, none, none, none,
    );
    await service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r1", providerRefundId: "pr1" });
    expect(query).toHaveBeenCalledTimes(7);
    expect(sqlOf(6)).toContain("refund.succeeded");
    expect(query.mock.calls[6]?.[1]).toEqual([USER_ID, null, ORDER_ID, "customer"]);
  });

  it("applyTossCancellation cascades to a subscription and queues an ended notice", async () => {
    queue(
      rows({ id: ORDER_ID, status: "refunding", subscription_invoice_id: "inv-1" }),
      rows({ id: "pay-1" }),
      rows({ actor_user_id: null, actor_ref_hmac: null, reason_code: "customer" }),
      none, none, none,
      rows({ id: "sub-1" }), none, none, none, none,
    );
    await service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r1", providerRefundId: null });
    const sqls = query.mock.calls.map(([sql]) => sql as string);
    expect(sqls.some((sql) => sql.includes("update billing.subscriptions"))).toBe(true);
    expect(sqls.some((sql) => sql.includes("subscription_ended"))).toBe(true);
  });

  it("applyTossCancellation skips the ended notice when no subscription row was updated", async () => {
    queue(
      rows({ id: ORDER_ID, status: "refunding", subscription_invoice_id: "inv-1" }),
      rows({ id: "pay-1" }),
      rows({ actor_user_id: null, actor_ref_hmac: null, reason_code: "c" }),
      none, none, none, none, none, none, none,
    );
    await service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r1", providerRefundId: null });
    expect(query.mock.calls.some(([sql]) => (sql as string).includes("subscription_ended"))).toBe(false);
  });

  it("applyTossCancellation refuses wrong state, missing payment and missing pending refund", async () => {
    queue(none);
    expect(await code(service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r", providerRefundId: null }))).toBe("payment_state_invalid");
    queue(rows({ id: ORDER_ID, status: "paid", subscription_invoice_id: null }));
    expect(await code(service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r", providerRefundId: null }))).toBe("payment_state_invalid");
    queue(rows({ id: ORDER_ID, status: "refunding", subscription_invoice_id: null }), none);
    expect(await code(service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r", providerRefundId: null }))).toBe("payment_state_invalid");
    queue(rows({ id: ORDER_ID, status: "refunding", subscription_invoice_id: null }), rows({ id: "p" }), none);
    expect(await code(service.applyTossCancellation({ orderId: ORDER_ID, refundId: "r", providerRefundId: null }))).toBe("payment_state_invalid");
  });

  it("applyDashboardCancellation ignores anything but a paid order with a payment", async () => {
    queue(none);
    await expect(service.applyDashboardCancellation({ orderId: ORDER_ID, amount: 1, providerRefundId: null })).resolves.toBe("ignored");
    queue(rows({ id: ORDER_ID, status: "refunded", subscription_invoice_id: null }));
    await expect(service.applyDashboardCancellation({ orderId: ORDER_ID, amount: 1, providerRefundId: null })).resolves.toBe("ignored");
    queue(rows({ id: ORDER_ID, status: "paid", subscription_invoice_id: null }), none);
    await expect(service.applyDashboardCancellation({ orderId: ORDER_ID, amount: 1, providerRefundId: null })).resolves.toBe("ignored");
  });

  it("applyDashboardCancellation records a provider-initiated refund and finalizes", async () => {
    queue(rows({ id: ORDER_ID, status: "paid", subscription_invoice_id: null }), rows({ id: "pay-1" }), none, none, none, none, none);
    await expect(service.applyDashboardCancellation({ orderId: ORDER_ID, amount: 900, providerRefundId: "x" })).resolves.toBe("applied");
    expect(query.mock.calls[2]?.[1]).toEqual(["pay-1", 900, "x"]);
    expect(sqlOf(6)).toContain("refund.provider_initiated");
  });
});

describe("refund reservations", () => {
  const paymentKey = "pay_key_secret";
  function reservationRow(overrides: Record<string, unknown> = {}) {
    const encrypted = encryptBillingValue(paymentKey, "payment-key", ORDER_ID);
    return {
      id: ORDER_ID, user_id: USER_ID, user_ref_hmac: Buffer.from("ref"), status: "paid",
      paid_at: new Date(Date.now() - 60_000), viewed_at: null, amount: 9900, payment_id: "pay-1",
      encrypted_key: encrypted.ciphertext, key_version: encrypted.keyVersion, subscription_invoice_id: null, ...overrides,
    };
  }

  it("validates order id and reason code shapes", async () => {
    expect(await code(service.reserveAdminRefund("bad", "admin", "customer"))).toBe("refund_unavailable");
    expect(await code(service.reserveAdminRefund(ORDER_ID, "admin", "Bad Reason"))).toBe("refund_unavailable");
    expect(query).not.toHaveBeenCalled();
  });

  it("reserves a new refund for an eligible own order and decrypts the payment key", async () => {
    queue(rows(reservationRow()), rows({ id: "refund-1" }), none);
    const reserved = await service.reserveOwnRefund(ORDER_ID, "customer_request");
    expect(reserved).toEqual({ id: "refund-1", orderId: ORDER_ID, paymentKey, reasonCode: "customer_request" });
    expect(query.mock.calls[0]?.[1]).toEqual([ORDER_ID, USER_ID]);
    expect(sqlOf(2)).toContain("status = 'refunding'");
  });

  it("enforces the self-service policy for members but not for admins", async () => {
    queue(rows(reservationRow({ viewed_at: new Date() })));
    expect(await code(service.reserveOwnRefund(ORDER_ID, "customer_request"))).toBe("refund_unavailable");
    queue(rows(reservationRow({ viewed_at: new Date() })), rows({ id: "refund-2" }), none);
    const reserved = await service.reserveAdminRefund(ORDER_ID, "admin-1", "operator");
    expect(reserved.id).toBe("refund-2");
    expect(query.mock.calls.at(-3)?.[1]).toEqual([ORDER_ID, null]);
  });

  it("rejects missing, ownerless, or wrongly-stated orders", async () => {
    queue(none);
    expect(await code(service.reserveAdminRefund(ORDER_ID, "a", "operator"))).toBe("refund_unavailable");
    queue(rows(reservationRow({ user_id: null })));
    expect(await code(service.reserveAdminRefund(ORDER_ID, "a", "operator"))).toBe("refund_unavailable");
    queue(rows(reservationRow({ status: "refunded" })));
    expect(await code(service.reserveAdminRefund(ORDER_ID, "a", "operator"))).toBe("refund_unavailable");
  });

  it("reuses an existing pending refund and its reason when already refunding", async () => {
    queue(rows(reservationRow({ status: "refunding" })), rows({ id: "refund-old", reason_code: "earlier_reason" }));
    const reserved = await service.reserveAdminRefund(ORDER_ID, "a", "operator");
    expect(reserved).toMatchObject({ id: "refund-old", reasonCode: "earlier_reason" });
    queue(rows(reservationRow({ status: "refunding" })), none);
    expect(await code(service.reserveAdminRefund(ORDER_ID, "a", "operator"))).toBe("refund_unavailable");
  });

  it("fails if the refund insert returns no row", async () => {
    queue(rows(reservationRow()), none);
    expect(await code(service.reserveAdminRefund(ORDER_ID, "a", "operator"))).toBe("Refund reservation was not created");
  });

  it("failReservedRefund marks the refund failed and restores the order", async () => {
    queue(none, none);
    await service.failReservedRefund({ refundId: "r1", orderId: ORDER_ID, errorCode: "provider_down" });
    expect(query.mock.calls[0]?.[1]).toEqual(["r1", ORDER_ID, "provider_down"]);
    expect(sqlOf(1)).toContain("status = 'paid'");
  });

  it("getStuckRefundReservation returns null or a decrypted reservation", async () => {
    queue(none);
    await expect(service.getStuckRefundReservation(ORDER_ID)).resolves.toBeNull();
    const encrypted = encryptBillingValue(paymentKey, "payment-key", ORDER_ID);
    queue(rows({ refund_id: "r9", reason_code: "why", encrypted_key: encrypted.ciphertext, key_version: encrypted.keyVersion }));
    await expect(service.getStuckRefundReservation(ORDER_ID)).resolves.toEqual({ refundId: "r9", reasonCode: "why", paymentKey });
  });
});

describe("entitlements", () => {
  it("markOwnEntitlementViewed is true when an order was updated", async () => {
    queue(rows({ order_id: "o" }));
    await expect(service.markOwnEntitlementViewed("saju-2027")).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("markOwnEntitlementViewed falls back to plus entitlements only for products included in plus", async () => {
    queue({ rows: [], rowCount: 0 });
    await expect(service.markOwnEntitlementViewed("lumina-plus-monthly")).resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    query.mockReset();
    queue({ rows: [], rowCount: 0 }, rows({ id: "ent" }));
    await expect(service.markOwnEntitlementViewed("saju-2027")).resolves.toBe(true);
    expect(query.mock.calls[1]?.[1]).toEqual([USER_ID, expect.arrayContaining(["lumina-plus-monthly"])]);
  });

  it("markOwnEntitlementViewed handles a null rowCount as no update", async () => {
    queue({ rows: [], rowCount: undefined }, none);
    await expect(service.markOwnEntitlementViewed("saju-2027")).resolves.toBe(false);
  });

  it("hasOwnEntitlement checks direct purchase then plus subscription", async () => {
    queue(rows({ id: "e" }));
    await expect(service.hasOwnEntitlement("saju-2027")).resolves.toBe(true);
    queue(none, none);
    await expect(service.hasOwnEntitlement("saju-2027")).resolves.toBe(false);
    queue(none, rows({ id: "plus" }));
    await expect(service.hasOwnEntitlement("saju-2027")).resolves.toBe(true);
  });

  it("getOwnActiveEntitlementId prefers the direct entitlement over plus", async () => {
    queue(rows({ id: "direct" }));
    await expect(service.getOwnActiveEntitlementId("saju-2027")).resolves.toBe("direct");
    queue(none, rows({ id: "plus" }));
    await expect(service.getOwnActiveEntitlementId("saju-2027")).resolves.toBe("plus");
    queue(none, none);
    await expect(service.getOwnActiveEntitlementId("saju-2027")).resolves.toBeNull();
  });

  it("getOwnDirectEntitlementOrderId never falls back to plus", async () => {
    queue(rows({ order_id: "o1" }));
    await expect(service.getOwnDirectEntitlementOrderId("saju-2027")).resolves.toBe("o1");
    query.mockReset();
    queue(none);
    await expect(service.getOwnDirectEntitlementOrderId("saju-2027")).resolves.toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("worker queries", () => {
  it("listTossReconcileOrders clamps the limit and maps rows", async () => {
    const expiresAt = new Date();
    queue(rows({ id: "o", expires_at: expiresAt }));
    await expect(service.listTossReconcileOrders(1000)).resolves.toEqual([{ id: "o", expiresAt }]);
    expect(query.mock.calls[0]?.[1]).toEqual([100]);
    queue(none);
    await service.listTossReconcileOrders(0);
    expect(query.mock.calls[1]?.[1]).toEqual([1]);
  });

  it("cancelExpiredUnpaidOrder reflects whether a row was cancelled", async () => {
    queue({ rows: [], rowCount: 1 });
    await expect(service.cancelExpiredUnpaidOrder("o")).resolves.toBe(true);
    queue({ rows: [], rowCount: 0 });
    await expect(service.cancelExpiredUnpaidOrder("o")).resolves.toBe(false);
    queue({ rows: [], rowCount: undefined });
    await expect(service.cancelExpiredUnpaidOrder("o")).resolves.toBe(false);
  });

  it("listStuckRefundingOrders clamps the limit and uses the 5-minute floor", async () => {
    queue(rows({ id: "o" }));
    await expect(service.listStuckRefundingOrders(999)).resolves.toEqual([{ id: "o" }]);
    expect(query.mock.calls[0]?.[1]).toEqual([5, 50]);
    queue(none);
    await service.listStuckRefundingOrders();
    expect(query.mock.calls[1]?.[1]).toEqual([5, 20]);
  });
});

describe("receipt email jobs", () => {
  it("claimReceiptEmailJobs clamps the limit and maps rows", async () => {
    const paidAt = new Date();
    queue(rows({
      order_id: "o", attempt_count: 2, ciphertext: "c", key_version: 1, locale: "ko", product_name: "N", amount: 5, currency: "KRW", paid_at: paidAt,
    }));
    await expect(service.claimReceiptEmailJobs(99)).resolves.toEqual([{
      orderId: "o", attemptCount: 2, ciphertext: "c", keyVersion: 1, locale: "ko", productName: "N", amount: 5, currency: "KRW", paidAt,
    }]);
    expect(query.mock.calls[0]?.[1]).toEqual([10]);
    queue(none);
    await service.claimReceiptEmailJobs();
    expect(query.mock.calls[1]?.[1]).toEqual([5]);
  });

  const job = (overrides: Record<string, unknown> = {}) => ({
    orderId: ORDER_ID, attemptCount: 1, ciphertext: null, keyVersion: null, locale: "en", productName: "N", amount: 1, currency: "KRW", paidAt: new Date(), ...overrides,
  }) as unknown as service.ReceiptEmailJob;

  it("getReceiptRecipient returns null without ciphertext and decrypts otherwise", () => {
    expect(service.getReceiptRecipient(job())).toBeNull();
    expect(service.getReceiptRecipient(job({ ciphertext: "x", keyVersion: null }))).toBeNull();
    const encrypted = encryptBillingValue("buyer@example.com", "receipt-email", ORDER_ID);
    expect(service.getReceiptRecipient(job({ ciphertext: encrypted.ciphertext, keyVersion: encrypted.keyVersion }))).toBe("buyer@example.com");
  });

  it("markReceiptEmailSent truncates the message id and reports whether a row changed", async () => {
    queue({ rows: [], rowCount: 1 });
    await expect(service.markReceiptEmailSent("o", 1, "m".repeat(300))).resolves.toBe(true);
    expect((query.mock.calls[0]?.[1] as string[])[2]).toHaveLength(200);
    queue({ rows: [], rowCount: 0 });
    await expect(service.markReceiptEmailSent("o", 1, "m")).resolves.toBe(false);
  });

  it("markReceiptEmailFailed normalizes invalid error codes", async () => {
    queue(none, none);
    await service.markReceiptEmailFailed("o", 1, "rate_limited");
    await service.markReceiptEmailFailed("o", 1, "Bad Code!");
    expect((query.mock.calls[0]?.[1] as string[])[2]).toBe("rate_limited");
    expect((query.mock.calls[1]?.[1] as string[])[2]).toBe("provider_error");
  });

  it("markReceiptEmailUndeliverable marks the event failed", async () => {
    queue(none);
    await service.markReceiptEmailUndeliverable("o", 3);
    expect(query.mock.calls[0]?.[1]).toEqual(["o", 3]);
    expect(sqlOf(0)).toContain("missing_recipient");
  });
});

describe("prepareMemberAccountDeletion", () => {
  it("is a no-op without billing storage", async () => {
    vi.stubEnv("BILLING_DATABASE_URL", "");
    await service.prepareMemberAccountDeletion(USER_ID);
    expect(tx.withBillingTransaction).not.toHaveBeenCalled();
  });

  it("blocks on an unexpired pending order", async () => {
    queue(rows({ id: "o", status: "pending", expires_at: new Date(Date.now() + 60_000), user_ref_hmac: Buffer.from("r") }));
    expect(await code(service.prepareMemberAccountDeletion(USER_ID))).toBe("billing_pending_orders");
  });

  it("blocks on a processing subscription invoice", async () => {
    queue(none, rows({ id: "inv" }));
    expect(await code(service.prepareMemberAccountDeletion(USER_ID))).toBe("billing_pending_orders");
  });

  it("cancels pending subscriptions outright, schedules active ones to end, and scrubs receipt data", async () => {
    const ref = Buffer.from("subref");
    queue(
      rows({ id: "o", status: "paid", expires_at: new Date(0), user_ref_hmac: Buffer.from("orderref") }),
      none,
      rows({ id: "s1", status: "pending", user_ref_hmac: ref }, { id: "s2", status: "active", user_ref_hmac: ref }),
      // per subscription: update, void invoices, fail notices, audit
      none, none, none, none,
      none, none, none, none,
      // orders cancel, receipt events, order scrub, final audit
      none, none, none, none,
    );
    await service.prepareMemberAccountDeletion(USER_ID);
    expect(query).toHaveBeenCalledTimes(15);
    expect(query.mock.calls[3]?.[1]).toEqual(["s1", true]);
    expect(query.mock.calls[7]?.[1]).toEqual(["s2", false]);
    expect(sqlOf(14)).toContain("account.delete_requested");
    expect(query.mock.calls[14]?.[1]).toEqual([USER_ID, Buffer.from("orderref"), Buffer.from("orderref").toString("hex")]);
  });

  it("skips the final audit when the user has no orders or subscriptions", async () => {
    queue(none, none, none, none, none, none);
    await service.prepareMemberAccountDeletion(USER_ID);
    expect(query).toHaveBeenCalledTimes(6);
    expect(query.mock.calls.some(([sql]) => (sql as string).includes("account.delete_requested"))).toBe(false);
  });

  it("uses the subscription ref for the final audit when there are no orders", async () => {
    const ref = Buffer.from("subref");
    queue(none, none, rows({ id: "s1", status: "active", user_ref_hmac: ref }), none, none, none, none, none, none, none, none);
    await service.prepareMemberAccountDeletion(USER_ID);
    expect(query.mock.calls.at(-1)?.[1]).toEqual([USER_ID, ref, ref.toString("hex")]);
  });
});

describe("misc helpers", () => {
  it("paymentEventHash is a deterministic sha256 of the JSON event", () => {
    const first = service.paymentEventHash({ a: 1 });
    expect(first).toHaveLength(32);
    expect(first.equals(service.paymentEventHash({ a: 1 }))).toBe(true);
    expect(first.equals(service.paymentEventHash({ a: 2 }))).toBe(false);
  });

  it("error classes carry their reason and name", () => {
    const access = new service.BillingAccessError("consent_required");
    expect(access).toMatchObject({ reason: "consent_required", name: "BillingAccessError", message: "consent_required" });
    const input = new service.BillingInputError("order_not_found");
    expect(input).toMatchObject({ reason: "order_not_found", name: "BillingInputError" });
  });
});

describe("getSaju2027SaleState with storage", () => {
  const price = { amount: 9900, currency: "KRW", name_ko: "사주", name_en: "Saju" };
  const sale = { amount: 9900, currency: "KRW", nameKo: "사주", nameEn: "Saju" };

  it("is live only when requested and checkout is fully ready, else preview", async () => {
    vi.stubEnv("SAJU_2027_SALE_STATE", "live");
    queue(rows(price));
    await expect(service.getSaju2027SaleState()).resolves.toEqual({ status: "live", sale });
    flags.serverFeatureFlags.billing = false;
    queue(rows(price));
    await expect(service.getSaju2027SaleState()).resolves.toEqual({ status: "preview", sale });
    vi.stubEnv("SAJU_2027_SALE_STATE", "preview");
    flags.serverFeatureFlags.billing = true;
    queue(rows(price));
    await expect(service.getSaju2027SaleState()).resolves.toEqual({ status: "preview", sale });
  });

  it("is hidden when no price exists, the currency is wrong, or the query fails", async () => {
    vi.stubEnv("SAJU_2027_SALE_STATE", "preview");
    queue(none);
    await expect(service.getSaju2027SaleState()).resolves.toEqual({ status: "hidden" });
    queue(rows({ ...price, currency: "USD" }));
    await expect(service.getSaju2027SaleState()).resolves.toEqual({ status: "hidden" });
    queue(new Error("db down"));
    await expect(service.getSaju2027SaleState()).resolves.toEqual({ status: "hidden" });
  });
});
