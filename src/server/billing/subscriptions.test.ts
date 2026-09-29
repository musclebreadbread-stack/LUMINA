import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const flags = vi.hoisted(() => ({ billing: true, luminaPlus: true }));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: flags }));

const getSignedInMember = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth/session", () => ({ getSignedInMember }));

const hasRequiredMemberConsents = vi.hoisted(() => vi.fn());
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents }));

vi.mock("./crypto", () => ({
  encryptBillingValue: (value: string, purpose: string, recordId: string) => ({
    ciphertext: `enc(${purpose}|${recordId}|${value})`,
    keyVersion: 1,
  }),
  decryptBillingValue: (ciphertext: string, purpose: string, recordId: string, version: number) => {
    if (ciphertext === "bad-cipher") throw new Error("decrypt failed");
    return `dec(${ciphertext}|${purpose}|${recordId}|${version})`;
  },
  paymentKeyDigest: (value: string) => Buffer.from(`digest:${value}`),
}));

const provider = vi.hoisted(() => ({
  id: "toss",
  issueBillingKey: vi.fn(),
  deleteBillingKey: vi.fn(),
  chargeBillingKey: vi.fn(),
}));
vi.mock("./paymentProvider", () => ({ getPaymentProvider: async () => provider }));

type QueryResult = { rows: unknown[]; rowCount?: number };
type Route = readonly [RegExp, QueryResult | ((params: readonly unknown[]) => QueryResult)];
type Call = { sql: string; params: readonly unknown[] };

const state = vi.hoisted(() => ({
  routes: [] as unknown[],
  calls: [] as unknown[],
  txCount: 0,
  failTxAt: new Set<number>(),
}));

vi.mock("./workerDatabase", () => ({
  withBillingTransaction: async (operation: (client: unknown) => Promise<unknown>) => {
    state.txCount += 1;
    if (state.failTxAt.has(state.txCount)) throw new Error("tx failed");
    const client = {
      query: async (sql: string, params: readonly unknown[] = []) => {
        state.calls.push({ sql, params });
        for (const [pattern, result] of state.routes as Route[]) {
          if (pattern.test(sql)) return typeof result === "function" ? result(params) : result;
        }
        return { rows: [], rowCount: 0 };
      },
    };
    return operation(client);
  },
}));

import {
  SubscriptionAccessError,
  cancelOwnSubscription,
  cleanupTerminatedSubscriptionBillingKeys,
  completeSubscriptionBillingAuthorization,
  createPendingSubscription,
  decryptSubscriptionEmail,
  expireCancelledSubscriptions,
  expireStalePendingSubscriptions,
  getActiveLuminaPlusSale,
  listOwnSubscriptions,
  processDueSubscriptionInvoices,
  queueSubscriptionRenewals,
} from "./subscriptions";

const USER_ID = "user-1";
const SUB_ID = "3f2b8c1e-6d4a-4b7e-9c1d-2a5e7f8b9c0d";
const HMAC_KEY = "h".repeat(40);

const ENV: Record<string, string> = {
  APP_ENV: "production",
  SUBSCRIPTION_ENABLED: "true",
  BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
  SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED: "true",
  TOSS_BILLING_APPROVED: "true",
  BILLING_DATABASE_URL: "postgres://billing.invalid/db",
  TOSS_CLIENT_KEY: "client-key-fake",
  TOSS_SECRET_KEY: "secret-key-fake",
  BILLING_ENCRYPTION_KEY: "encryption-key-fake",
  BILLING_USER_REF_HMAC_KEY: HMAC_KEY,
  BILLING_TERMS_VERSION: "t1",
  BILLING_WITHDRAWAL_NOTICE_VERSION: "w1",
  MEMBER_TRANSFER_VERSION: "m1",
  SUBSCRIPTION_TERMS_VERSION: "st-1",
  SUBSCRIPTION_RENEWAL_NOTICE_VERSION: "rn-1",
  SUBSCRIPTION_RENEWAL_PRICE_VERSION: "rp-1",
  RESEND_API_KEY: "resend-fake",
  SUBSCRIPTION_FROM: "billing@example.invalid",
  NEXT_PUBLIC_SITE_URL: "https://lumina.example",
};

const savedEnv: Record<string, string | undefined> = {};

function route(pattern: RegExp, result: Route[1]): void {
  (state.routes as Route[]).push([pattern, result]);
}
const calls = (): Call[] => state.calls as Call[];
const callsMatching = (pattern: RegExp): Call[] => calls().filter((c) => pattern.test(c.sql));

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
  flags.billing = true;
  flags.luminaPlus = true;
  state.routes = [];
  state.calls = [];
  state.txCount = 0;
  state.failTxAt = new Set();
  getSignedInMember.mockReset();
  getSignedInMember.mockResolvedValue({ user: { id: USER_ID, email: "member@example.invalid" } });
  hasRequiredMemberConsents.mockReset();
  hasRequiredMemberConsents.mockResolvedValue(true);
  provider.id = "toss";
  provider.issueBillingKey.mockReset();
  provider.deleteBillingKey.mockReset();
  provider.deleteBillingKey.mockResolvedValue(undefined);
  provider.chargeBillingKey.mockReset();
});

afterEach(() => {
  for (const key of Object.keys(ENV)) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

const checkoutInput = {
  productKey: "lumina-plus-monthly",
  locale: "ko",
  acceptedSubscriptionTerms: true,
  acceptedAutomaticRenewal: true,
  acceptedRenewalPrice: true,
} as const;

describe("getActiveLuminaPlusSale", () => {
  const saleRows = [
    { product_key: "lumina-plus-monthly", amount: 4900, currency: "KRW", name_ko: "월", name_en: "Monthly" },
    { product_key: "lumina-plus-yearly", amount: 49000, currency: "KRW", name_ko: "연", name_en: "Yearly" },
  ];

  it("returns null when sales are not ready", async () => {
    flags.luminaPlus = false;
    expect(await getActiveLuminaPlusSale()).toBeNull();
    expect(state.txCount).toBe(0);
  });

  it("returns null when any required config value is missing or malformed", async () => {
    process.env.RESEND_API_KEY = "   ";
    expect(await getActiveLuminaPlusSale()).toBeNull();
    process.env.RESEND_API_KEY = "line\nbreak";
    expect(await getActiveLuminaPlusSale()).toBeNull();
    process.env.RESEND_API_KEY = "x".repeat(201);
    expect(await getActiveLuminaPlusSale()).toBeNull();
  });

  it("maps monthly and yearly prices", async () => {
    route(/from billing\.products p/, { rows: saleRows });
    expect(await getActiveLuminaPlusSale()).toEqual({
      monthly: { amount: 4900, currency: "KRW", nameKo: "월", nameEn: "Monthly" },
      yearly: { amount: 49000, currency: "KRW", nameKo: "연", nameEn: "Yearly" },
    });
  });

  it("returns null when one plan or the currency is missing", async () => {
    route(/from billing\.products p/, { rows: [saleRows[0]] });
    expect(await getActiveLuminaPlusSale()).toBeNull();
    state.routes = [];
    route(/from billing\.products p/, { rows: [saleRows[0], { ...saleRows[1], currency: "USD" }] });
    expect(await getActiveLuminaPlusSale()).toBeNull();
  });

  it("returns null when the database throws", async () => {
    state.failTxAt.add(1);
    expect(await getActiveLuminaPlusSale()).toBeNull();
  });
});

describe("createPendingSubscription", () => {
  function routeProduct(): void {
    route(/from billing\.products p/, { rows: [{ price_id: "price-1", product_key: "lumina-plus-monthly", product_name: "Plus" }] });
  }

  it("rejects unauthenticated, unconsented, and unavailable states", async () => {
    getSignedInMember.mockResolvedValue(null);
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "authentication_required" });
    getSignedInMember.mockResolvedValue({ user: { id: USER_ID, email: "member@example.invalid" } });
    hasRequiredMemberConsents.mockResolvedValue(false);
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "consent_required" });
    hasRequiredMemberConsents.mockResolvedValue(true);
    flags.billing = false;
    await expect(createPendingSubscription(checkoutInput)).rejects.toBeInstanceOf(SubscriptionAccessError);
    flags.billing = true;
    delete process.env.BILLING_DATABASE_URL;
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_unavailable" });
    expect(state.txCount).toBe(0);
  });

  it("rejects when any acceptance flag is false", async () => {
    await expect(createPendingSubscription({ ...checkoutInput, acceptedRenewalPrice: false as unknown as true }))
      .rejects.toMatchObject({ reason: "invalid_request" });
    await expect(createPendingSubscription({ ...checkoutInput, acceptedAutomaticRenewal: false as unknown as true }))
      .rejects.toMatchObject({ reason: "invalid_request" });
  });

  it("rejects invalid document versions and site origins", async () => {
    process.env.SUBSCRIPTION_TERMS_VERSION = "-bad";
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_unavailable" });
    process.env.SUBSCRIPTION_TERMS_VERSION = "st-1";
    for (const site of ["http://lumina.example", "https://user:pw@lumina.example", "https://lumina.example/app", "https://lumina.example/?q=1", "https://lumina.example/#h"]) {
      process.env.NEXT_PUBLIC_SITE_URL = site;
      await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_unavailable" });
    }
    delete process.env.NEXT_PUBLIC_SITE_URL;
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });

  it("rejects a short or missing HMAC key", async () => {
    routeProduct();
    process.env.BILLING_USER_REF_HMAC_KEY = "short";
    // salesReady() only checks presence, so the failure surfaces in refFor().
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });

  it("inserts subscription, three consents and audit event, and returns return URLs", async () => {
    routeProduct();
    const result = await createPendingSubscription(checkoutInput);
    expect(result.clientKey).toBe("client-key-fake");
    expect(result.customerKey).toMatch(/^[A-Za-z0-9_-]{32}$/u);
    expect(result.successUrl).toBe(`https://lumina.example/api/billing/toss/billing/return?subscriptionId=${result.subscriptionId}`);
    expect(result.failUrl).toBe(`https://lumina.example/api/billing/toss/billing/fail?subscriptionId=${result.subscriptionId}`);

    const insert = callsMatching(/insert into billing\.subscriptions/)[0]!;
    expect(insert.params[0]).toBe(result.subscriptionId);
    expect(insert.params[1]).toBe(USER_ID);
    expect(Buffer.isBuffer(insert.params[2])).toBe(true);
    expect(insert.params[5]).toBe(result.customerKey);
    expect(insert.params[6]).toBe(`enc(receipt-email|${result.subscriptionId}|member@example.invalid)`);
    expect(insert.params[8]).toBe("ko");
    const consents = callsMatching(/insert into billing\.subscription_consents/).map((c) => c.params);
    expect(consents).toEqual([
      [result.subscriptionId, "subscription_terms", "st-1"],
      [result.subscriptionId, "automatic_renewal", "rn-1"],
      [result.subscriptionId, "renewal_price", "rp-1"],
    ]);
    expect(callsMatching(/subscription\.checkout_started/)).toHaveLength(1);
  });

  it("throws product_unavailable when no price row exists", async () => {
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "product_unavailable" });
    expect(callsMatching(/insert into/)).toHaveLength(0);
  });

  it("throws subscription_exists for an existing live subscription", async () => {
    routeProduct();
    route(/from billing\.subscriptions\s+where user_id/, { rows: [{ id: "existing" }] });
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_exists" });
    expect(callsMatching(/insert into/)).toHaveLength(0);
  });

  it("maps unique violations to subscription_exists and rethrows other errors", async () => {
    routeProduct();
    route(/insert into billing\.subscriptions/, () => {
      throw Object.assign(new Error("dup"), { code: "23505" });
    });
    await expect(createPendingSubscription(checkoutInput)).rejects.toMatchObject({ reason: "subscription_exists" });

    state.routes = [];
    routeProduct();
    route(/insert into billing\.subscriptions/, () => {
      throw Object.assign(new Error("other"), { code: "40001" });
    });
    await expect(createPendingSubscription(checkoutInput)).rejects.toThrow("other");
    state.routes = [];
    routeProduct();
    route(/insert into billing\.subscriptions/, () => {
      throw new Error("plain");
    });
    await expect(createPendingSubscription(checkoutInput)).rejects.toThrow("plain");
  });
});

describe("completeSubscriptionBillingAuthorization", () => {
  const input = { subscriptionId: SUB_ID, authKey: "auth-key", customerKey: "cust-key-1" };

  function routeClaim(): void {
    route(/set billing_auth_claimed_at = now\(\)/, { rows: [{ provider_customer_id: "cust-key-1" }] });
  }
  function routePrice(interval: string | null = "month"): void {
    route(/select pr\.amount, pr\.billing_interval/, { rows: interval ? [{ amount: 4900, billing_interval: interval, product_name: "Plus" }] : [] });
  }

  it("requires worker readiness and a signed-in member", async () => {
    process.env.APP_ENV = "development";
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "subscription_unavailable" });
    process.env.APP_ENV = "production";
    getSignedInMember.mockResolvedValue(null);
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authentication_required" });
  });

  it("validates input shape", async () => {
    for (const bad of [
      { ...input, subscriptionId: "not-a-uuid" },
      { ...input, authKey: "" },
      { ...input, authKey: "a".repeat(301) },
      { ...input, customerKey: "c" },
      { ...input, customerKey: "c".repeat(51) },
    ]) {
      await expect(completeSubscriptionBillingAuthorization(bad)).rejects.toMatchObject({ reason: "invalid_request" });
    }
    expect(provider.issueBillingKey).not.toHaveBeenCalled();
  });

  it("rejects non-toss providers", async () => {
    provider.id = "other";
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });

  it("throws authorization_expired when the claim matches nothing, without calling the provider", async () => {
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authorization_expired" });
    expect(provider.issueBillingKey).not.toHaveBeenCalled();
    const claim = callsMatching(/billing_auth_claimed_at = now\(\)/)[0]!;
    expect(claim.params).toEqual([SUB_ID, USER_ID, "cust-key-1"]);
  });

  it("throws authorization_expired when the returned customer key differs", async () => {
    route(/set billing_auth_claimed_at = now\(\)/, { rows: [{ provider_customer_id: "other" }] });
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authorization_expired" });
  });

  it("stores the encrypted billing key, first invoice and audit event", async () => {
    routeClaim();
    routePrice("year");
    route(/set billing_key_ciphertext/, { rows: [], rowCount: 1 });
    provider.issueBillingKey.mockResolvedValue({ billingKey: "bk-fake", customerKey: "cust-key-1" });
    await completeSubscriptionBillingAuthorization(input);
    expect(provider.issueBillingKey).toHaveBeenCalledWith({ authKey: "auth-key", customerKey: "cust-key-1" });
    const store = callsMatching(/set billing_key_ciphertext/)[0]!;
    expect(store.params).toEqual([SUB_ID, USER_ID, `enc(payment-key|${SUB_ID}|bk-fake)`, 1]);
    expect(callsMatching(/insert into billing\.subscription_invoices/)[0]!.params).toEqual([SUB_ID, 4900, "year"]);
    expect(callsMatching(/billing_method_registered/)).toHaveLength(1);
    expect(provider.deleteBillingKey).not.toHaveBeenCalled();
  });

  it("deletes the issued key and releases the claim when the provider customer key mismatches", async () => {
    routeClaim();
    provider.issueBillingKey.mockResolvedValue({ billingKey: "bk-fake", customerKey: "someone-else" });
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authorization_expired" });
    expect(provider.deleteBillingKey).toHaveBeenCalledWith("bk-fake");
    expect(callsMatching(/set billing_auth_claimed_at = null/)).toHaveLength(1);
  });

  it("does not delete a key when issuing fails, but releases the claim", async () => {
    routeClaim();
    provider.issueBillingKey.mockRejectedValue(new Error("toss down"));
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toThrow("toss down");
    expect(provider.deleteBillingKey).not.toHaveBeenCalled();
    expect(callsMatching(/set billing_auth_claimed_at = null/)).toHaveLength(1);
  });

  it.each([
    ["no price row", () => routePrice(null)],
    ["unsupported interval", () => routePrice("week")],
  ])("rolls back with %s", async (_name, setup) => {
    routeClaim();
    setup();
    provider.issueBillingKey.mockResolvedValue({ billingKey: "bk-fake", customerKey: "cust-key-1" });
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authorization_expired" });
    expect(provider.deleteBillingKey).toHaveBeenCalledWith("bk-fake");
  });

  it("fails when the billing key update touches no row", async () => {
    routeClaim();
    routePrice();
    route(/set billing_key_ciphertext/, { rows: [], rowCount: 0 });
    provider.issueBillingKey.mockResolvedValue({ billingKey: "bk-fake", customerKey: "cust-key-1" });
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authorization_expired" });
    expect(callsMatching(/insert into billing\.subscription_invoices/)).toHaveLength(0);
  });

  it("preserves the original error when cleanup itself fails", async () => {
    routeClaim();
    routePrice();
    route(/set billing_key_ciphertext/, { rows: [], rowCount: 0 });
    provider.issueBillingKey.mockResolvedValue({ billingKey: "bk-fake", customerKey: "cust-key-1" });
    provider.deleteBillingKey.mockRejectedValue(new Error("delete failed"));
    state.failTxAt.add(3); // claim (1), store (2), then the cleanup transaction (3)
    await expect(completeSubscriptionBillingAuthorization(input)).rejects.toMatchObject({ reason: "authorization_expired" });
    expect(provider.deleteBillingKey).toHaveBeenCalledWith("bk-fake");
  });
});

describe("listOwnSubscriptions", () => {
  it("does not require current consents and maps rows", async () => {
    hasRequiredMemberConsents.mockResolvedValue(false);
    route(/from billing\.subscriptions s/, {
      rows: [
        { id: "a", product_key: "lumina-plus-monthly", product_name: "Plus", status: "active", current_period_end: new Date("2026-10-01T00:00:00Z"), cancel_at_period_end: true },
        { id: "b", product_key: "lumina-plus-yearly", product_name: "Plus Y", status: "pending", current_period_end: null, cancel_at_period_end: false },
      ],
    });
    const list = await listOwnSubscriptions();
    expect(hasRequiredMemberConsents).not.toHaveBeenCalled();
    expect(list).toEqual([
      { id: "a", productKey: "lumina-plus-monthly", productName: "Plus", status: "active", periodEnd: "2026-10-01T00:00:00.000Z", cancelAtPeriodEnd: true },
      { id: "b", productKey: "lumina-plus-yearly", productName: "Plus Y", status: "pending", periodEnd: null, cancelAtPeriodEnd: false },
    ]);
    expect(calls()[0]!.params).toEqual([USER_ID]);
  });

  it("requires authentication and a configured billing database", async () => {
    getSignedInMember.mockResolvedValue(null);
    await expect(listOwnSubscriptions()).rejects.toMatchObject({ reason: "authentication_required" });
    delete process.env.BILLING_DATABASE_URL;
    await expect(listOwnSubscriptions()).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });
});

describe("cancelOwnSubscription", () => {
  function routeSub(row: Record<string, unknown> | null): void {
    route(/from billing\.subscriptions\s+s where/, { rows: row ? [row] : [] });
  }
  const base = { status: "active", current_period_end: new Date("2026-11-01T00:00:00Z"), cancel_at_period_end: false, invoice_processing: false };

  it("rejects malformed ids before touching the database", async () => {
    await expect(cancelOwnSubscription("nope")).rejects.toMatchObject({ reason: "subscription_not_found" });
    expect(state.txCount).toBe(0);
  });

  it("scopes the lookup to the caller and reports not found for other users' subscriptions", async () => {
    routeSub(null);
    await expect(cancelOwnSubscription(SUB_ID)).rejects.toMatchObject({ reason: "subscription_not_found" });
    expect(calls()[0]!.params).toEqual([SUB_ID, USER_ID]);
  });

  it.each(["cancelled", "expired"])("is idempotent for %s subscriptions", async (status) => {
    routeSub({ ...base, status });
    expect(await cancelOwnSubscription(SUB_ID)).toBe("cancelled");
    expect(calls()).toHaveLength(1);
  });

  it("returns scheduled when already scheduled", async () => {
    routeSub({ ...base, cancel_at_period_end: true });
    expect(await cancelOwnSubscription(SUB_ID)).toBe("scheduled");
    expect(calls()).toHaveLength(1);
  });

  it("rejects unknown statuses", async () => {
    routeSub({ ...base, status: "weird" });
    await expect(cancelOwnSubscription(SUB_ID)).rejects.toMatchObject({ reason: "cancellation_unavailable" });
  });

  it("schedules cancellation while the initial payment is processing", async () => {
    routeSub({ ...base, status: "pending", invoice_processing: true });
    expect(await cancelOwnSubscription(SUB_ID)).toBe("processing");
    expect(callsMatching(/cancel_at_period_end = true/)).toHaveLength(1);
    expect(callsMatching(/initial_payment_processing/)).toHaveLength(1);
    expect(callsMatching(/status = 'cancelled'/)).toHaveLength(0);
  });

  it("cancels immediately when pending, or when there is no period end", async () => {
    routeSub({ ...base, status: "pending", current_period_end: null });
    expect(await cancelOwnSubscription(SUB_ID)).toBe("cancelled");
    expect(callsMatching(/status = 'cancelled'/)).toHaveLength(1);
    expect(callsMatching(/set status = 'void'/)).toHaveLength(1);
    expect(callsMatching(/member_request/)[0]!.sql).toContain("subscription.cancelled");

    state.routes = [];
    state.calls = [];
    routeSub({ ...base, status: "active", current_period_end: null });
    expect(await cancelOwnSubscription(SUB_ID)).toBe("cancelled");
  });

  it.each(["active", "past_due"])("schedules end-of-period cancellation for %s", async (status) => {
    routeSub({ ...base, status });
    expect(await cancelOwnSubscription(SUB_ID)).toBe("scheduled");
    expect(callsMatching(/subscription\.cancellation_scheduled/)).toHaveLength(1);
    expect(callsMatching(/status = 'cancelled'/)).toHaveLength(0);
  });
});

describe("processDueSubscriptionInvoices", () => {
  const paidAt = "2026-09-29T00:00:00Z";
  function claimRow(overrides: Record<string, unknown> = {}) {
    return {
      invoice_id: "inv-1",
      subscription_id: "sub-1",
      user_id: USER_ID,
      user_ref_hmac: Buffer.from("ref"),
      product_key: "lumina-plus-monthly",
      price_id: "price-1",
      order_name: "Plus",
      customer_key: "cust-key-1",
      billing_key_ciphertext: "bk-cipher",
      billing_key_version: 1,
      receipt_email_ciphertext: "em-cipher",
      receipt_email_key_version: 1,
      amount: 4900,
      period_end: new Date("2026-11-01T00:00:00Z"),
      attempt_count: 1,
      locale: "ko",
      ...overrides,
    };
  }
  const donePayment = {
    orderId: "inv-1", totalAmount: 4900, currency: "KRW", status: "DONE",
    paymentKey: "pay-fake", method: "card", lastTransactionKey: "txn-1", approvedAt: paidAt,
  };
  function routeClaimOnce(row: unknown): void {
    let used = false;
    route(/with due as/, () => {
      if (used) return { rows: [] };
      used = true;
      return { rows: row ? [row as never] : [] };
    });
  }

  it("throws when the worker is not ready or provider is not toss", async () => {
    process.env.SUBSCRIPTION_ENABLED = "false";
    await expect(processDueSubscriptionInvoices()).rejects.toMatchObject({ reason: "subscription_unavailable" });
    process.env.SUBSCRIPTION_ENABLED = "true";
    provider.id = "x";
    await expect(processDueSubscriptionInvoices()).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });

  it("returns zeros when nothing is due", async () => {
    expect(await processDueSubscriptionInvoices()).toEqual({ checked: 0, paid: 0, failed: 0 });
  });

  it("treats an incomplete claim row as nothing due", async () => {
    routeClaimOnce(claimRow({ billing_key_ciphertext: "" }));
    expect(await processDueSubscriptionInvoices()).toEqual({ checked: 0, paid: 0, failed: 0 });
    expect(provider.chargeBillingKey).not.toHaveBeenCalled();
  });

  it("clamps the loop to at most three invoices", async () => {
    route(/with due as/, () => ({ rows: [claimRow()] }));
    route(/select status, user_id from billing\.subscriptions/, { rows: [{ status: "active", user_id: USER_ID }] });
    route(/insert into billing\.orders/, { rows: [{ id: "inv-1" }] });
    route(/insert into billing\.payments/, { rows: [{ id: "pay-1" }] });
    provider.chargeBillingKey.mockResolvedValue(donePayment);
    expect(await processDueSubscriptionInvoices(99)).toEqual({ checked: 3, paid: 3, failed: 0 });
    state.calls = [];
    state.txCount = 0;
    expect(await processDueSubscriptionInvoices(-5)).toEqual({ checked: 1, paid: 1, failed: 0 });
  });

  it("charges with an idempotency key and records the paid state", async () => {
    routeClaimOnce(claimRow({ attempt_count: 2 }));
    route(/select status, user_id from billing\.subscriptions/, { rows: [{ status: "past_due", user_id: USER_ID }] });
    route(/insert into billing\.orders/, { rows: [{ id: "inv-1" }] });
    route(/insert into billing\.payments/, { rows: [{ id: "pay-1" }] });
    provider.chargeBillingKey.mockResolvedValue(donePayment);
    expect(await processDueSubscriptionInvoices()).toEqual({ checked: 1, paid: 1, failed: 0 });
    expect(provider.chargeBillingKey).toHaveBeenCalledWith({
      billingKey: "dec(bk-cipher|payment-key|sub-1|1)",
      customerKey: "cust-key-1",
      orderId: "inv-1",
      orderName: "Plus",
      amount: 4900,
      customerEmail: "dec(em-cipher|receipt-email|sub-1|1)",
    }, "subscription:inv-1:2");
    const payment = callsMatching(/insert into billing\.payments/)[0]!;
    expect(payment.params[1]).toBe("enc(payment-key|inv-1|pay-fake)");
    expect(payment.params[6]).toBe("txn-1");
    expect(payment.params[7]).toEqual(new Date(paidAt));
    expect(callsMatching(/insert into billing\.subscription_payments/)[0]!.params[1]).toBe("pay-1");
    expect(callsMatching(/insert into billing\.entitlements/)[0]!.params[4]).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(callsMatching(/set status = 'paid'/)).toHaveLength(1);
    expect(callsMatching(/subscription_receipt/)).toHaveLength(1);
    expect(callsMatching(/set status = 'active', current_period_start/)).toHaveLength(1);
  });

  it("falls back to the existing payment row and null optional fields", async () => {
    routeClaimOnce(claimRow());
    route(/select status, user_id from billing\.subscriptions/, { rows: [{ status: "pending", user_id: USER_ID }] });
    route(/insert into billing\.orders/, { rows: [{ id: "inv-1" }] });
    route(/insert into billing\.payments/, { rows: [] });
    route(/select id::text from billing\.payments/, { rows: [{ id: "existing-pay" }] });
    provider.chargeBillingKey.mockResolvedValue({ ...donePayment, lastTransactionKey: undefined, approvedAt: undefined });
    expect(await processDueSubscriptionInvoices(1)).toEqual({ checked: 1, paid: 1, failed: 0 });
    const payment = callsMatching(/insert into billing\.payments/)[0]!;
    expect(payment.params[6]).toBeNull();
    expect(payment.params[7]).toBeNull();
    expect(callsMatching(/insert into billing\.subscription_payments/)[0]!.params[1]).toBe("existing-pay");
  });

  it.each([
    ["subscription vanished", [] as unknown[], "subscription_state_changed"],
    ["owner changed", [{ status: "active", user_id: "someone-else" }], "subscription_state_changed"],
    ["cancelled meanwhile", [{ status: "cancelled", user_id: USER_ID }], "subscription_state_changed"],
    ["expired meanwhile", [{ status: "expired", user_id: USER_ID }], "subscription_state_changed"],
  ])("aborts recording when %s", async (_n, rows, message) => {
    routeClaimOnce(claimRow());
    route(/select status, user_id from billing\.subscriptions/, { rows });
    provider.chargeBillingKey.mockResolvedValue(donePayment);
    await expect(processDueSubscriptionInvoices(1)).rejects.toThrow(message);
    expect(callsMatching(/insert into billing\.orders/)).toHaveLength(0);
  });

  it("fails when the order or payment cannot be created or found", async () => {
    routeClaimOnce(claimRow());
    route(/select status, user_id from billing\.subscriptions/, { rows: [{ status: "active", user_id: USER_ID }] });
    provider.chargeBillingKey.mockResolvedValue(donePayment);
    await expect(processDueSubscriptionInvoices(1)).rejects.toThrow("subscription_order_not_created");

    state.routes = [];
    routeClaimOnce(claimRow());
    route(/select status, user_id from billing\.subscriptions/, { rows: [{ status: "active", user_id: USER_ID }] });
    route(/insert into billing\.orders/, { rows: [{ id: "inv-1" }] });
    await expect(processDueSubscriptionInvoices(1)).rejects.toThrow("subscription_payment_not_created");
  });

  describe("failure handling", () => {
    async function runFailure(attempt: number, charge: () => Promise<unknown>) {
      state.routes = [];
      state.calls = [];
      routeClaimOnce(claimRow({ attempt_count: attempt }));
      provider.chargeBillingKey.mockImplementation(charge);
      const result = await processDueSubscriptionInvoices(1);
      return result;
    }

    it.each([
      [1, 1, "past_due", "payment_failed_1"],
      [2, 2, "past_due", "payment_failed_3"],
      [3, 4, "past_due", "payment_failed_7"],
    ])("retries attempt %i in %i day(s)", async (attempt, days, subStatus, notice) => {
      const result = await runFailure(attempt, async () => { throw new Error("boom"); });
      expect(result).toEqual({ checked: 1, paid: 0, failed: 1 });
      const invoice = callsMatching(/last_failure_code = \$4/)[0]!;
      expect(invoice.params).toEqual(["inv-1", "queued", days, "provider_unavailable"]);
      expect(callsMatching(/update billing\.subscriptions set status/)[0]!.params).toEqual(["sub-1", subStatus]);
      expect(callsMatching(/insert into billing\.subscription_notices/)[0]!.params).toEqual(["sub-1", "inv-1", notice, days]);
    });

    it("expires the subscription after the fourth failed attempt", async () => {
      await runFailure(4, async () => { throw new Error("boom"); });
      expect(callsMatching(/last_failure_code = \$4/)[0]!.params[1]).toBe("failed");
      expect(callsMatching(/update billing\.subscriptions set status/)[0]!.params).toEqual(["sub-1", "expired"]);
      expect(callsMatching(/subscription_ended/)).toHaveLength(1);
    });

    it("uses a sanitized provider error code", async () => {
      await runFailure(1, async () => { throw Object.assign(new Error("declined"), { code: "REJECT_CARD_PAYMENT" }); });
      expect(callsMatching(/last_failure_code = \$4/)[0]!.params[3]).toBe("reject_card_payment");
    });

    it.each([
      ["lowercase", "not-valid"],
      ["too short", "X"],
      ["non-string", 42],
    ])("ignores unusable provider error codes (%s)", async (_n, code) => {
      await runFailure(1, async () => { throw Object.assign(new Error("declined"), { code }); });
      expect(callsMatching(/last_failure_code = \$4/)[0]!.params[3]).toBe("provider_unavailable");
    });

    it("treats a non-Error rejection as provider_unavailable", async () => {
      await runFailure(1, async () => { throw "string failure"; });
      expect(callsMatching(/last_failure_code = \$4/)[0]!.params[3]).toBe("provider_unavailable");
    });

    it.each([
      ["wrong order id", { orderId: "other" }],
      ["wrong amount", { totalAmount: 1 }],
      ["wrong currency", { currency: "USD" }],
      ["not done", { status: "CANCELED" }],
    ])("flags a payment mismatch (%s) as failure", async (_n, patch) => {
      await runFailure(1, async () => ({ ...donePayment, ...patch }));
      expect(callsMatching(/last_failure_code = \$4/)[0]!.params[3]).toBe("provider_payment_mismatch");
      expect(callsMatching(/insert into billing\.orders/)).toHaveLength(0);
    });

    it("counts decryption failures as failed attempts without charging", async () => {
      state.routes = [];
      routeClaimOnce(claimRow({ billing_key_ciphertext: "bad-cipher" }));
      expect(await processDueSubscriptionInvoices(1)).toEqual({ checked: 1, paid: 0, failed: 1 });
      expect(provider.chargeBillingKey).not.toHaveBeenCalled();
    });
  });
});

describe("decryptSubscriptionEmail", () => {
  it("delegates to the receipt-email purpose", async () => {
    expect(await decryptSubscriptionEmail("c", "sub", 3)).toBe("dec(c|receipt-email|sub|3)");
  });
});

describe("queueSubscriptionRenewals", () => {
  const due = {
    id: "sub-1", user_id: USER_ID, user_ref_hmac: Buffer.from("ref"), product_key: "lumina-plus-monthly",
    billing_interval: "month", amount: 4900, period_end: "2026-10-05T00:00:00Z",
  };

  it("requires worker readiness", async () => {
    process.env.TOSS_BILLING_APPROVED = "false";
    await expect(queueSubscriptionRenewals()).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });

  it.each([[0, 1], [1000, 100], [7.9, 7], [50, 50]])("clamps limit %s to %s", async (limit, expected) => {
    await queueSubscriptionRenewals(limit);
    expect(calls()[0]!.params).toEqual([expected]);
  });

  it("queues invoices, reminders, and audit events only for newly inserted invoices", async () => {
    route(/from billing\.subscriptions s\s+join billing\.prices/, { rows: [due, { ...due, id: "sub-2", billing_interval: "year" }] });
    let n = 0;
    route(/insert into billing\.subscription_invoices/, () => (n++ === 0 ? { rows: [{ id: "inv-9" }] } : { rows: [] }));
    expect(await queueSubscriptionRenewals()).toBe(1);
    const insert = callsMatching(/insert into billing\.subscription_invoices/)[0]!;
    expect(insert.params).toEqual(["sub-1", new Date("2026-10-05T00:00:00Z"), 4900, "month"]);
    expect(callsMatching(/renewal_reminder/)[0]!.params).toEqual(["sub-1", "inv-9"]);
    expect(callsMatching(/subscription\.renewal_queued/)).toHaveLength(1);
  });

  it("returns 0 when nothing is due", async () => {
    expect(await queueSubscriptionRenewals()).toBe(0);
  });
});

describe("expireCancelledSubscriptions / expireStalePendingSubscriptions", () => {
  const rows = [
    { id: "s1", user_ref_hmac: Buffer.from("r1") },
    { id: "s2", user_ref_hmac: Buffer.from("r2") },
  ];

  it("requires worker readiness", async () => {
    process.env.BILLING_LEGAL_DOCUMENTS_APPROVED = "false";
    await expect(expireCancelledSubscriptions()).rejects.toBeInstanceOf(SubscriptionAccessError);
    await expect(expireStalePendingSubscriptions()).rejects.toBeInstanceOf(SubscriptionAccessError);
  });

  it("expires cancelled subscriptions and records notices and audit events", async () => {
    route(/with ended as/, { rows, rowCount: 2 });
    expect(await expireCancelledSubscriptions(500)).toBe(2);
    expect(calls()[0]!.params).toEqual([100]);
    expect(callsMatching(/subscription_ended/)).toHaveLength(2);
    expect(callsMatching(/subscription\.ended/).map((c) => c.params[1])).toEqual(["s1", "s2"]);
  });

  it("returns 0 with no ended subscriptions (null rowCount too)", async () => {
    route(/with ended as/, { rows: [] });
    state.routes = [[/with ended as/, { rows: [], rowCount: undefined }]];
    expect(await expireCancelledSubscriptions(0)).toBe(0);
    expect(calls()[0]!.params).toEqual([1]);
  });

  it("cancels stale pending subscriptions and voids queued invoices", async () => {
    route(/with stale as/, { rows, rowCount: 2 });
    expect(await expireStalePendingSubscriptions()).toBe(2);
    expect(callsMatching(/set status = 'void'/).map((c) => c.params[0])).toEqual(["s1", "s2"]);
    expect(callsMatching(/subscription\.pending_expired/)).toHaveLength(2);
  });

  it("returns 0 when nothing is stale", async () => {
    expect(await expireStalePendingSubscriptions()).toBe(0);
  });
});

describe("cleanupTerminatedSubscriptionBillingKeys", () => {
  it("requires readiness and a toss provider", async () => {
    process.env.SUBSCRIPTION_ENABLED = "false";
    await expect(cleanupTerminatedSubscriptionBillingKeys()).rejects.toBeInstanceOf(SubscriptionAccessError);
    process.env.SUBSCRIPTION_ENABLED = "true";
    provider.id = "x";
    await expect(cleanupTerminatedSubscriptionBillingKeys()).rejects.toBeInstanceOf(SubscriptionAccessError);
  });

  it("deletes provider keys, clears them locally, and keeps failures for retry", async () => {
    route(/from billing\.subscriptions\s+where status in/, {
      rows: [
        { id: "a", billing_key_ciphertext: "cipher-a", billing_key_version: 1 },
        { id: "b", billing_key_ciphertext: "bad-cipher", billing_key_version: 1 },
        { id: "c", billing_key_ciphertext: "cipher-c", billing_key_version: 2 },
      ],
    });
    provider.deleteBillingKey.mockImplementation(async (key: string) => {
      if (key.startsWith("dec(cipher-c")) throw new Error("provider down");
    });
    expect(await cleanupTerminatedSubscriptionBillingKeys(50)).toBe(1);
    expect(calls()[0]!.params).toEqual([10]);
    expect(provider.deleteBillingKey).toHaveBeenCalledWith("dec(cipher-a|payment-key|a|1)");
    const clears = callsMatching(/set billing_key_ciphertext = null/);
    expect(clears).toHaveLength(1);
    expect(clears[0]!.params).toEqual(["a", "cipher-a"]);
  });

  it("clamps the lower bound", async () => {
    await cleanupTerminatedSubscriptionBillingKeys(0);
    expect(calls()[0]!.params).toEqual([1]);
  });
});
