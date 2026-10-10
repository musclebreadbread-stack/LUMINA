import type { PaymentProvider, TossPayment } from "./providerTypes";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  rowCount: number | null;
}>;

type BillingQuery = (statement: string, parameters?: readonly unknown[]) => Promise<QueryResult>;
type BillingTestClient = Readonly<{
  query: BillingQuery;
  release: () => void;
}>;
type BillingTestPoolOptions = Readonly<{
  onConnect: (client: BillingTestClient) => Promise<void>;
}>;

const { billingQueryMock, clientReleaseMock, poolConstructorMock, poolOnMock,
  getSignedInMemberMock, hasRequiredMemberConsentsMock, getPaymentProviderMock,
  encryptBillingValueMock, decryptBillingValueMock, paymentKeyDigestMock } = vi.hoisted(() => ({
  billingQueryMock: vi.fn<BillingQuery>(),
  clientReleaseMock: vi.fn<() => void>(),
  poolConstructorMock: vi.fn<(options: BillingTestPoolOptions) => void>(),
  poolOnMock: vi.fn<(event: string, listener: (error: Error & { readonly code?: string }) => void) => unknown>(),
  getSignedInMemberMock: vi.fn<() => Promise<{ user: { id: string; email: string } } | null>>(),
  hasRequiredMemberConsentsMock: vi.fn<(userId: string) => Promise<boolean>>(),
  getPaymentProviderMock: vi.fn<() => Promise<PaymentProvider>>(),
  encryptBillingValueMock: vi.fn<(value: string, purpose: string, context: string) => { ciphertext: string; keyVersion: number }>(),
  decryptBillingValueMock: vi.fn<(ciphertext: string, purpose: string, context: string, version?: number) => string>(),
  paymentKeyDigestMock: vi.fn<(paymentKey: string) => Buffer>(),
}));

const billingTestClient: BillingTestClient = {
  query: billingQueryMock,
  release: clientReleaseMock,
};

vi.mock("server-only", () => ({}));
vi.mock("pg", () => ({
  Pool: class {
    private readonly options: BillingTestPoolOptions;

    readonly on = poolOnMock;

    constructor(options: BillingTestPoolOptions) {
      this.options = options;
      poolConstructorMock(options);
    }

    readonly connect = async (): Promise<BillingTestClient> => {
      await this.options.onConnect(billingTestClient);
      return billingTestClient;
    };
  },
}));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: hasRequiredMemberConsentsMock }));
vi.mock("./crypto", () => ({
  decryptBillingValue: decryptBillingValueMock,
  encryptBillingValue: encryptBillingValueMock,
  paymentKeyDigest: paymentKeyDigestMock,
}));
vi.mock("./paymentProvider", () => ({ getPaymentProvider: getPaymentProviderMock }));

const memberId = "member-1";
const memberEmail = "member@example.test";
const subscriptionId = "123e4567-e89b-12d3-a456-426614174000";
const customerKey = "customer-key-1";
const salesEnvironment = {
  APP_ENV: "production",
  BILLING_DATABASE_URL: "postgresql://billing.invalid/database",
  BILLING_ENCRYPTION_KEY: "synthetic-billing-encryption-key",
  BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
  BILLING_TERMS_VERSION: "billing-v1",
  BILLING_USER_REF_HMAC_KEY: "synthetic-user-reference-hmac-key-with-more-than-32-bytes",
  MEMBER_TRANSFER_VERSION: "transfer-v1",
  NEXT_PUBLIC_SITE_URL: "https://lumina.example.test",
  RESEND_API_KEY: "synthetic-resend-key",
  SUBSCRIPTION_ENABLED: "true",
  SUBSCRIPTION_FROM: "LUMINA <billing@example.test>",
  SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED: "true",
  SUBSCRIPTION_RENEWAL_NOTICE_VERSION: "renewal-v1",
  SUBSCRIPTION_RENEWAL_PRICE_VERSION: "renewal-price-v1",
  SUBSCRIPTION_TERMS_VERSION: "subscription-terms-v1",
  TOSS_BILLING_APPROVED: "true",
  TOSS_CLIENT_KEY: "synthetic-toss-client-key",
  TOSS_SECRET_KEY: "synthetic-toss-secret-key",
  BILLING_WITHDRAWAL_NOTICE_VERSION: "withdrawal-v1",
  FEATURE_BILLING: "true",
  FEATURE_LUMINA_PLUS: "true",
};

function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

function makePayment(orderId: string, totalAmount: number): TossPayment {
  return {
    paymentKey: "payment-key-1",
    orderId,
    status: "DONE",
    totalAmount,
    currency: "KRW",
    method: "카드",
    approvedAt: "2026-10-01T03:00:00.000Z",
  };
}

function makeTossProvider(overrides: Partial<PaymentProvider> = {}): PaymentProvider {
  return {
    id: "toss",
    confirmPayment: vi.fn(async () => makePayment("order-1", 9_900)),
    getPaymentByOrder: vi.fn(async () => makePayment("order-1", 9_900)),
    cancelPayment: vi.fn(async () => makePayment("order-1", 9_900)),
    issueBillingKey: vi.fn(async ({ customerKey: requestedCustomerKey }) => ({
      billingKey: "billing-key-1",
      customerKey: requestedCustomerKey,
      method: "카드",
    })),
    chargeBillingKey: vi.fn(async ({ orderId, amount }) => makePayment(orderId, amount)),
    deleteBillingKey: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function loadSubscriptions() {
  return import("./subscriptions");
}

function statements(): string[] {
  return billingQueryMock.mock.calls.map(([statement]) => normalize(statement));
}

beforeEach(() => {
  vi.resetModules();
  for (const [name, value] of Object.entries(salesEnvironment)) vi.stubEnv(name, value);
  billingQueryMock.mockReset().mockImplementation(async (statement) => {
    if (normalize(statement).startsWith("select current_user as role_name")) {
      return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  clientReleaseMock.mockReset();
  poolConstructorMock.mockReset();
  poolOnMock.mockReset();
  getSignedInMemberMock.mockReset().mockResolvedValue({ user: { id: memberId, email: memberEmail } });
  hasRequiredMemberConsentsMock.mockReset().mockResolvedValue(true);
  getPaymentProviderMock.mockReset().mockResolvedValue(makeTossProvider());
  encryptBillingValueMock.mockReset().mockReturnValue({ ciphertext: "encrypted-value", keyVersion: 3 });
  decryptBillingValueMock.mockReset().mockImplementation((ciphertext) => `decrypted:${ciphertext}`);
  paymentKeyDigestMock.mockReset().mockReturnValue(Buffer.alloc(32, 7));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LUMINA Plus sale and subscription checkout", () => {
  it.each([
    { gate: "FEATURE_BILLING", value: "false" },
    { gate: "FEATURE_LUMINA_PLUS", value: "false" },
    { gate: "BILLING_LEGAL_DOCUMENTS_APPROVED", value: "false" },
    { gate: "SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", value: "false" },
    { gate: "TOSS_BILLING_APPROVED", value: "false" },
    { gate: "SUBSCRIPTION_ENABLED", value: "false" },
    { gate: "TOSS_SECRET_KEY", value: "" },
  ])("fails closed when $gate is unavailable", async ({ gate, value }) => {
    vi.stubEnv(gate, value);
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.getActiveLuminaPlusSale()).resolves.toBeNull();
    expect(poolConstructorMock).not.toHaveBeenCalled();
  });

  it("returns the current monthly and yearly KRW prices", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      return {
        rows: [
          { product_key: "lumina-plus-monthly", amount: 5_900, currency: "KRW", name_ko: "월간 플러스", name_en: "Monthly Plus" },
          { product_key: "lumina-plus-yearly", amount: 59_000, currency: "KRW", name_ko: "연간 플러스", name_en: "Yearly Plus" },
        ],
        rowCount: 2,
      };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.getActiveLuminaPlusSale()).resolves.toEqual({
      monthly: { amount: 5_900, currency: "KRW", nameKo: "월간 플러스", nameEn: "Monthly Plus" },
      yearly: { amount: 59_000, currency: "KRW", nameKo: "연간 플러스", nameEn: "Yearly Plus" },
    });
    const saleQuery = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("select p.product_key"));
    expect(saleQuery?.[1]).toEqual([["lumina-plus-monthly", "lumina-plus-yearly"]]);
    expect(statements()).toContain("commit");
  });

  it("returns no sale when one approved subscription product is missing or billing is unavailable", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      return { rows: [{ product_key: "lumina-plus-monthly", amount: 5_900, currency: "KRW", name_ko: "월간", name_en: "Monthly" }], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();
    await expect(subscriptions.getActiveLuminaPlusSale()).resolves.toBeNull();

    billingQueryMock.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(subscriptions.getActiveLuminaPlusSale()).resolves.toBeNull();
  });

  it("creates a pending checkout with current consent versions and same-origin return URLs", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select pr.id::text as price_id")) {
        return { rows: [{ price_id: "price-1", product_key: "lumina-plus-monthly", product_name: "LUMINA Plus Monthly" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();

    const result = await subscriptions.createPendingSubscription({
      productKey: "lumina-plus-monthly",
      locale: "en",
      acceptedSubscriptionTerms: true,
      acceptedAutomaticRenewal: true,
      acceptedRenewalPrice: true,
    });

    const successUrl = new URL(result.successUrl);
    const failUrl = new URL(result.failUrl);
    expect(result.clientKey).toBe("synthetic-toss-client-key");
    expect(result.customerKey).toMatch(/^[A-Za-z0-9_-]{32}$/u);
    expect(successUrl.origin).toBe("https://lumina.example.test");
    expect(successUrl.pathname).toBe("/api/billing/toss/billing/return");
    expect(failUrl.origin).toBe(successUrl.origin);
    expect(failUrl.pathname).toBe("/api/billing/toss/billing/fail");
    expect(successUrl.searchParams.get("subscriptionId")).toBe(result.subscriptionId);
    expect(failUrl.searchParams.get("subscriptionId")).toBe(result.subscriptionId);
    expect(encryptBillingValueMock).toHaveBeenCalledWith(memberEmail, "receipt-email", result.subscriptionId);
    expect(hasRequiredMemberConsentsMock).toHaveBeenCalledWith(memberId);
    const subscriptionWrite = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.subscriptions"));
    expect(subscriptionWrite?.[1]).toEqual([
      result.subscriptionId,
      memberId,
      createHmac("sha256", salesEnvironment.BILLING_USER_REF_HMAC_KEY).update(memberId, "utf8").digest(),
      "lumina-plus-monthly",
      "price-1",
      result.customerKey,
      "encrypted-value",
      3,
      "en",
    ]);
    const consentWrites = billingQueryMock.mock.calls
      .filter(([statement]) => normalize(statement).startsWith("insert into billing.subscription_consents"))
      .map(([, parameters]) => parameters);
    expect(consentWrites).toEqual([
      [result.subscriptionId, "subscription_terms", "subscription-terms-v1"],
      [result.subscriptionId, "automatic_renewal", "renewal-v1"],
      [result.subscriptionId, "renewal_price", "renewal-price-v1"],
    ]);
    expect(statements()).toContain("commit");
  });

  it("rejects checkout until the member has current required consents", async () => {
    hasRequiredMemberConsentsMock.mockResolvedValue(false);
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.createPendingSubscription({
      productKey: "lumina-plus-monthly",
      locale: "ko",
      acceptedSubscriptionTerms: true,
      acceptedAutomaticRenewal: true,
      acceptedRenewalPrice: true,
    })).rejects.toMatchObject({ name: "SubscriptionAccessError", reason: "consent_required" });
    expect(poolConstructorMock).not.toHaveBeenCalled();
  });

  it("maps unavailable products and duplicate active subscriptions to stable input errors", async () => {
    const subscriptions = await loadSubscriptions();
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select pr.id::text as price_id")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 0 };
    });
    const input = {
      productKey: "lumina-plus-monthly" as const,
      locale: "ko" as const,
      acceptedSubscriptionTerms: true as const,
      acceptedAutomaticRenewal: true as const,
      acceptedRenewalPrice: true as const,
    };
    await expect(subscriptions.createPendingSubscription(input)).rejects.toMatchObject({ reason: "product_unavailable" });
    expect(statements()).toContain("rollback");

    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select pr.id::text as price_id")) {
        return { rows: [{ price_id: "price-1", product_key: "lumina-plus-monthly", product_name: "Monthly" }], rowCount: 1 };
      }
      if (sql.startsWith("select id::text from billing.subscriptions")) return { rows: [{ id: "existing-subscription" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    await expect(subscriptions.createPendingSubscription(input)).rejects.toMatchObject({ reason: "subscription_exists" });
    expect(statements().some((statement) => statement.startsWith("insert into billing.subscriptions"))).toBe(false);
  });

  it("requires a signed-in member and valid secure site origin", async () => {
    getSignedInMemberMock.mockResolvedValue(null);
    const subscriptions = await loadSubscriptions();
    await expect(subscriptions.createPendingSubscription({
      productKey: "lumina-plus-monthly",
      locale: "ko",
      acceptedSubscriptionTerms: true,
      acceptedAutomaticRenewal: true,
      acceptedRenewalPrice: true,
    })).rejects.toMatchObject({ reason: "authentication_required" });

    getSignedInMemberMock.mockResolvedValue({ user: { id: memberId, email: memberEmail } });
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://lumina.example.test");
    await expect(subscriptions.createPendingSubscription({
      productKey: "lumina-plus-monthly",
      locale: "ko",
      acceptedSubscriptionTerms: true,
      acceptedAutomaticRenewal: true,
      acceptedRenewalPrice: true,
    })).rejects.toMatchObject({ reason: "subscription_unavailable" });
  });
});

describe("subscription billing authorization and member account", () => {
  it("completes billing authorization once and creates the first invoice", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("update billing.subscriptions set billing_auth_claimed_at")) {
        return { rows: [{ provider_customer_id: customerKey }], rowCount: 1 };
      }
      if (sql.startsWith("select pr.amount, pr.billing_interval")) {
        return { rows: [{ amount: 5_900, billing_interval: "month", product_name: "Monthly Plus" }], rowCount: 1 };
      }
      if (sql.startsWith("update billing.subscriptions set billing_key_ciphertext")) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();
    const provider = await getPaymentProviderMock();

    await expect(subscriptions.completeSubscriptionBillingAuthorization({
      subscriptionId,
      authKey: "toss-auth-key",
      customerKey,
    })).resolves.toBeUndefined();

    expect(provider.issueBillingKey).toHaveBeenCalledWith({ authKey: "toss-auth-key", customerKey });
    expect(encryptBillingValueMock).toHaveBeenCalledWith("billing-key-1", "payment-key", subscriptionId);
    expect(statements().some((statement) => statement.startsWith("insert into billing.subscription_invoices"))).toBe(true);
    expect(statements().some((statement) => statement.includes("subscription.billing_method_registered"))).toBe(true);
    expect(statements()).toContain("commit");
  });

  it("rejects expired claims and releases a provider key when the provider returns a different customer", async () => {
    const subscriptions = await loadSubscriptions();
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    await expect(subscriptions.completeSubscriptionBillingAuthorization({ subscriptionId, authKey: "auth", customerKey }))
      .rejects.toMatchObject({ reason: "authorization_expired" });
    const provider = makeTossProvider({
      issueBillingKey: vi.fn(async () => ({ billingKey: "issued-key", customerKey: "different-customer", method: "카드" })),
    });
    getPaymentProviderMock.mockResolvedValue(provider);
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("update billing.subscriptions set billing_auth_claimed_at")) {
        return { rows: [{ provider_customer_id: customerKey }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(subscriptions.completeSubscriptionBillingAuthorization({ subscriptionId, authKey: "auth", customerKey }))
      .rejects.toMatchObject({ reason: "authorization_expired" });
    expect(provider.deleteBillingKey).toHaveBeenCalledWith("issued-key");
    expect(statements().some((statement) => statement.startsWith("update billing.subscriptions set billing_auth_claimed_at = null"))).toBe(true);
  });

  it("rejects malformed authorization input before requesting a provider key", async () => {
    const subscriptions = await loadSubscriptions();
    await expect(subscriptions.completeSubscriptionBillingAuthorization({
      subscriptionId: "not-a-uuid",
      authKey: "auth",
      customerKey,
    })).rejects.toMatchObject({ reason: "invalid_request" });
    expect(getPaymentProviderMock).not.toHaveBeenCalled();
  });

  it("maps only the signed-in member's subscriptions and skips unnecessary consent checks", async () => {
    const periodEnd = new Date("2026-11-01T00:00:00.000Z");
    billingQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      return {
        rows: [{ id: subscriptionId, product_key: "lumina-plus-monthly", product_name: "Monthly Plus", status: "active", current_period_end: periodEnd, cancel_at_period_end: true }],
        rowCount: 1,
      };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.listOwnSubscriptions()).resolves.toEqual([{
      id: subscriptionId,
      productKey: "lumina-plus-monthly",
      productName: "Monthly Plus",
      status: "active",
      periodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: true,
    }]);
    expect(hasRequiredMemberConsentsMock).not.toHaveBeenCalled();
    const query = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("select s.id::text, s.product_key"));
    expect(query?.[1]).toEqual([memberId]);
  });

  it("cancels pending checkouts immediately and schedules active plans through period end", async () => {
    let selectedStatus: string = "pending";
    let currentPeriodEnd: Date | null = null;
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select s.status, s.current_period_end")) {
        return { rows: [{ status: selectedStatus, current_period_end: currentPeriodEnd, cancel_at_period_end: false, invoice_processing: false }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.cancelOwnSubscription(subscriptionId)).resolves.toBe("cancelled");
    expect(statements().some((statement) => statement.includes("set status = 'cancelled'"))).toBe(true);
    expect(statements().some((statement) => statement.includes("set status = 'void'"))).toBe(true);

    selectedStatus = "active";
    currentPeriodEnd = new Date("2026-11-01T00:00:00.000Z");
    billingQueryMock.mockClear();
    await expect(subscriptions.cancelOwnSubscription(subscriptionId)).resolves.toBe("scheduled");
    expect(statements().some((statement) => statement.includes("set cancel_at_period_end = true"))).toBe(true);
    expect(hasRequiredMemberConsentsMock).not.toHaveBeenCalled();
  });

  it("defers cancellation while the initial invoice is processing and rejects unknown subscriptions", async () => {
    let subscription: Readonly<Record<string, unknown>> | null = {
      status: "pending", current_period_end: null, cancel_at_period_end: false, invoice_processing: true,
    };
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select s.status, s.current_period_end")) return { rows: subscription ? [subscription] : [], rowCount: subscription ? 1 : 0 };
      return { rows: [], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.cancelOwnSubscription(subscriptionId)).resolves.toBe("processing");
    expect(statements().some((statement) => statement.includes("subscription.cancellation_scheduled"))).toBe(true);

    subscription = null;
    await expect(subscriptions.cancelOwnSubscription(subscriptionId)).rejects.toMatchObject({ reason: "subscription_not_found" });
    await expect(subscriptions.cancelOwnSubscription("invalid-id")).rejects.toMatchObject({ reason: "subscription_not_found" });
  });
});

describe("subscription renewal and cleanup workers", () => {
  it("charges a claimed renewal once and atomically records paid order, entitlement, and receipt notice", async () => {
    const invoiceClaim = {
      invoice_id: "invoice-1",
      subscription_id: subscriptionId,
      user_id: memberId,
      user_ref_hmac: Buffer.alloc(32, 8),
      product_key: "lumina-plus-monthly",
      price_id: "price-1",
      order_name: "Monthly Plus",
      customer_key: customerKey,
      billing_key_ciphertext: "billing-key-ciphertext",
      billing_key_version: 2,
      receipt_email_ciphertext: "receipt-email-ciphertext",
      receipt_email_key_version: 3,
      amount: 5_900,
      period_end: new Date("2026-11-01T00:00:00.000Z"),
      attempt_count: 1,
      locale: "ko",
    };
    let claims = 0;
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("with due as")) {
        claims += 1;
        return { rows: claims === 1 ? [invoiceClaim] : [], rowCount: claims === 1 ? 1 : 0 };
      }
      if (sql.startsWith("select status, user_id from billing.subscriptions")) {
        return { rows: [{ status: "pending", user_id: memberId }], rowCount: 1 };
      }
      if (sql.startsWith("insert into billing.orders")) return { rows: [{ id: "invoice-1" }], rowCount: 1 };
      if (sql.startsWith("insert into billing.payments")) return { rows: [{ id: "payment-1" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const provider = await getPaymentProviderMock();
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.processDueSubscriptionInvoices(1)).resolves.toEqual({ checked: 1, paid: 1, failed: 0 });

    expect(provider.chargeBillingKey).toHaveBeenCalledWith({
      billingKey: "decrypted:billing-key-ciphertext",
      customerKey,
      orderId: "invoice-1",
      orderName: "Monthly Plus",
      amount: 5_900,
      customerEmail: "decrypted:receipt-email-ciphertext",
    }, "subscription:invoice-1:1");
    expect(provider.chargeBillingKey).toHaveBeenCalledTimes(1);
    expect(encryptBillingValueMock).toHaveBeenCalledWith("payment-key-1", "payment-key", "invoice-1");
    expect(paymentKeyDigestMock).toHaveBeenCalledWith("payment-key-1");
    const orderWrite = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.orders"));
    expect(orderWrite?.[1]).toEqual([
      "invoice-1", memberId, Buffer.alloc(32, 8), "lumina-plus-monthly", "price-1", "Monthly Plus", 5_900,
    ]);
    const paymentWrite = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.payments"));
    expect(paymentWrite?.[1]).toEqual([
      "invoice-1", "encrypted-value", Buffer.alloc(32, 7), 3, 5_900, "카드", null, new Date("2026-10-01T03:00:00.000Z"),
    ]);
    const subscriptionPaymentWrite = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.subscription_payments"));
    expect(subscriptionPaymentWrite?.[1]).toEqual([
      "invoice-1", "payment-1", 5_900, "카드", null, new Date("2026-10-01T03:00:00.000Z"),
    ]);
    const entitlementWrite = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.entitlements"));
    expect(entitlementWrite?.[1]).toEqual([
      memberId, Buffer.alloc(32, 8), "lumina-plus-monthly", "invoice-1", new Date("2026-11-01T00:00:00.000Z"),
    ]);
    const paidInvoiceUpdate = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_invoices"));
    expect(paidInvoiceUpdate?.[1]).toEqual(["invoice-1"]);
    const receiptNoticeWrite = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.subscription_notices"));
    expect(receiptNoticeWrite?.[1]).toEqual([subscriptionId, "invoice-1"]);
    const activationUpdate = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscriptions s"));
    expect(activationUpdate?.[1]).toEqual(["invoice-1"]);
    expect(normalize(activationUpdate?.[0] ?? "")).toContain("current_period_start = i.period_start, current_period_end = i.period_end");
    expect(normalize(activationUpdate?.[0] ?? "")).toContain("where i.id = $1 and s.id = i.subscription_id");
    expect(statements().some((statement) => statement.includes("set status = 'paid'"))).toBe(true);
    expect(statements().some((statement) => statement.includes("'subscription_receipt'"))).toBe(true);
    expect(statements().some((statement) => statement.startsWith("update billing.subscriptions s") && statement.includes("set status = 'active'"))).toBe(true);
  });

  it.each([
    { mismatch: "order id", payment: makePayment("different-invoice", 5_900) },
    { mismatch: "amount", payment: makePayment("invoice-1", 5_901) },
    { mismatch: "currency", payment: { ...makePayment("invoice-1", 5_900), currency: "USD" } },
    { mismatch: "provider status", payment: { ...makePayment("invoice-1", 5_900), status: "AUTHORIZED" } },
  ])("does not grant access when the provider response has a $mismatch mismatch", async ({ payment }) => {
    const invoiceClaim = {
      invoice_id: "invoice-1",
      subscription_id: subscriptionId,
      user_id: memberId,
      user_ref_hmac: Buffer.alloc(32, 8),
      product_key: "lumina-plus-monthly",
      price_id: "price-1",
      order_name: "Monthly Plus",
      customer_key: customerKey,
      billing_key_ciphertext: "billing-key-ciphertext",
      billing_key_version: 2,
      receipt_email_ciphertext: "receipt-email-ciphertext",
      receipt_email_key_version: 3,
      amount: 5_900,
      period_end: new Date("2026-11-01T00:00:00.000Z"),
      attempt_count: 1,
      locale: "ko",
    };
    let claims = 0;
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("with due as")) {
        claims += 1;
        return { rows: claims === 1 ? [invoiceClaim] : [], rowCount: claims === 1 ? 1 : 0 };
      }
      return { rows: [], rowCount: 1 };
    });
    getPaymentProviderMock.mockResolvedValue(makeTossProvider({ chargeBillingKey: vi.fn(async () => payment) }));
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.processDueSubscriptionInvoices(1)).resolves.toEqual({ checked: 1, paid: 0, failed: 1 });

    expect(statements().some((statement) => statement.startsWith("insert into billing.orders"))).toBe(false);
    expect(statements().some((statement) => statement.startsWith("insert into billing.payments"))).toBe(false);
    expect(statements().some((statement) => statement.startsWith("insert into billing.entitlements"))).toBe(false);
    const failedInvoiceUpdate = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_invoices"));
    expect(failedInvoiceUpdate?.[1]).toEqual(["invoice-1", "queued", 1, "provider_payment_mismatch"]);
  });

  it.each([
    { attempt: 1, nextDays: 1, notice: "payment_failed_1" },
    { attempt: 2, nextDays: 2, notice: "payment_failed_3" },
    { attempt: 3, nextDays: 4, notice: "payment_failed_7" },
  ])("requeues attempt $attempt with its matching backoff and notice", async ({ attempt, nextDays, notice }) => {
    const invoiceClaim = {
      invoice_id: "invoice-retry",
      subscription_id: subscriptionId,
      user_id: memberId,
      user_ref_hmac: Buffer.alloc(32, 8),
      product_key: "lumina-plus-monthly",
      price_id: "price-1",
      order_name: "Monthly Plus",
      customer_key: customerKey,
      billing_key_ciphertext: "billing-key-ciphertext",
      billing_key_version: 2,
      receipt_email_ciphertext: "receipt-email-ciphertext",
      receipt_email_key_version: 3,
      amount: 5_900,
      period_end: new Date("2026-11-01T00:00:00.000Z"),
      attempt_count: attempt,
      locale: "ko",
    };
    let claims = 0;
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("with due as")) {
        claims += 1;
        return { rows: claims === 1 ? [invoiceClaim] : [], rowCount: claims === 1 ? 1 : 0 };
      }
      return { rows: [], rowCount: 1 };
    });
    getPaymentProviderMock.mockResolvedValue(makeTossProvider({
      chargeBillingKey: vi.fn(async () => { throw Object.assign(new Error("provider declined"), { code: "CARD_DECLINED" }); }),
    }));
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.processDueSubscriptionInvoices(1)).resolves.toEqual({ checked: 1, paid: 0, failed: 1 });

    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_invoices"))?.[1])
      .toEqual(["invoice-retry", "queued", nextDays, "card_declined"]);
    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("insert into billing.subscription_notices"))?.[1])
      .toEqual([subscriptionId, "invoice-retry", notice, nextDays]);
    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscriptions set status = $2"))?.[1])
      .toEqual([subscriptionId, "past_due"]);
  });

  it("ends a subscription after its final failed invoice attempt and stores only a normalized provider code", async () => {
    const invoiceClaim = {
      invoice_id: "invoice-2",
      subscription_id: subscriptionId,
      user_id: memberId,
      user_ref_hmac: Buffer.alloc(32, 8),
      product_key: "lumina-plus-monthly",
      price_id: "price-1",
      order_name: "Monthly Plus",
      customer_key: customerKey,
      billing_key_ciphertext: "billing-key-ciphertext",
      billing_key_version: 2,
      receipt_email_ciphertext: "receipt-email-ciphertext",
      receipt_email_key_version: 3,
      amount: 5_900,
      period_end: new Date("2026-11-01T00:00:00.000Z"),
      attempt_count: 4,
      locale: "ko",
    };
    let claims = 0;
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("with due as")) {
        claims += 1;
        return { rows: claims === 1 ? [invoiceClaim] : [], rowCount: claims === 1 ? 1 : 0 };
      }
      return { rows: [], rowCount: 1 };
    });
    const provider = makeTossProvider({
      chargeBillingKey: vi.fn(async () => {
        throw Object.assign(new Error("private provider diagnostic"), { code: "CARD_DECLINED" });
      }),
    });
    getPaymentProviderMock.mockResolvedValue(provider);
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.processDueSubscriptionInvoices(1)).resolves.toEqual({ checked: 1, paid: 0, failed: 1 });

    const failedInvoiceUpdate = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_invoices"));
    expect(failedInvoiceUpdate?.[1]).toEqual(["invoice-2", "failed", 4, "card_declined"]);
    expect(billingQueryMock.mock.calls.flatMap(([, parameters]) => parameters ?? [])).not.toContain("private provider diagnostic");
    expect(statements().some((statement) => statement.includes("'subscription_ended'"))).toBe(true);
    const terminalSubscriptionUpdate = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscriptions set status = $2"));
    expect(terminalSubscriptionUpdate?.[1]).toEqual([subscriptionId, "expired"]);
  });

  it("queues bounded renewal invoices and skips duplicate invoice windows", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select s.id::text, s.user_id")) {
        return { rows: [{ id: subscriptionId, user_id: memberId, user_ref_hmac: Buffer.alloc(32, 4), product_key: "lumina-plus-monthly", billing_interval: "month", amount: 5_900, period_end: new Date("2026-10-05T00:00:00.000Z") }], rowCount: 1 };
      }
      if (sql.startsWith("insert into billing.subscription_invoices")) return { rows: [{ id: "invoice-1" }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.queueSubscriptionRenewals(500)).resolves.toBe(1);
    const dueQuery = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("select s.id::text, s.user_id"));
    expect(dueQuery?.[1]).toEqual([100]);
    expect(statements().some((statement) => statement.includes("not exists"))).toBe(true);
    expect(statements().some((statement) => statement.includes("subscription.renewal_queued"))).toBe(true);

    billingQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    billingQueryMock.mockClear();
    await expect(subscriptions.queueSubscriptionRenewals(-5)).resolves.toBe(0);
    const emptyDueQuery = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("select s.id::text, s.user_id"));
    expect(emptyDueQuery?.[1]).toEqual([1]);
  });

  it("expires cancelled and stale pending plans in bounded batches with audit events", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("with ended as")) return { rows: [{ id: "ended-1", user_ref_hmac: Buffer.alloc(32, 5) }], rowCount: 1 };
      if (sql.startsWith("with stale as")) return { rows: [{ id: "stale-1", user_ref_hmac: Buffer.alloc(32, 6) }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.expireCancelledSubscriptions(250)).resolves.toBe(1);
    expect(statements().some((statement) => statement.includes("subscription.ended"))).toBe(true);
    const cancelledLimit = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("with ended as"));
    expect(cancelledLimit?.[1]).toEqual([100]);

    billingQueryMock.mockClear();
    await expect(subscriptions.expireStalePendingSubscriptions()).resolves.toBe(1);
    expect(statements().some((statement) => statement.startsWith("update billing.subscription_invoices set status = 'void'"))).toBe(true);
    expect(statements().some((statement) => statement.includes("subscription.pending_expired"))).toBe(true);
  });

  it("deletes terminated billing keys before clearing their encrypted database copy", async () => {
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select id::text, billing_key_ciphertext")) {
        return { rows: [{ id: subscriptionId, billing_key_ciphertext: "ciphertext", billing_key_version: 2 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();
    const provider = await getPaymentProviderMock();

    await expect(subscriptions.cleanupTerminatedSubscriptionBillingKeys(99)).resolves.toBe(1);
    expect(decryptBillingValueMock).toHaveBeenCalledWith("ciphertext", "payment-key", subscriptionId, 2);
    expect(provider.deleteBillingKey).toHaveBeenCalledWith("decrypted:ciphertext");
    expect(statements().some((statement) => statement.includes("set billing_key_ciphertext = null"))).toBe(true);
  });

  it("keeps an encrypted billing key when provider deletion fails, so a later run can retry", async () => {
    const provider = makeTossProvider({ deleteBillingKey: vi.fn(async () => { throw new Error("provider unavailable"); }) });
    getPaymentProviderMock.mockResolvedValue(provider);
    billingQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select current_user as role_name")) {
        return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
      }
      if (sql.startsWith("select id::text, billing_key_ciphertext")) {
        return { rows: [{ id: subscriptionId, billing_key_ciphertext: "ciphertext", billing_key_version: 2 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const subscriptions = await loadSubscriptions();

    await expect(subscriptions.cleanupTerminatedSubscriptionBillingKeys()).resolves.toBe(0);
    expect(statements().some((statement) => statement.includes("set billing_key_ciphertext = null"))).toBe(false);
  });
});
