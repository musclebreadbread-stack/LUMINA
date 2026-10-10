import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  queryMock,
  getSignedInMemberMock,
  hasRequiredMemberConsentsMock,
  serverFeatureFlagsMock,
  withBillingTransactionMock,
  isMemberAuthConfiguredMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getSignedInMemberMock: vi.fn(),
  hasRequiredMemberConsentsMock: vi.fn(),
  serverFeatureFlagsMock: { billing: true, memberAuth: true },
  withBillingTransactionMock: vi.fn(),
  isMemberAuthConfiguredMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: serverFeatureFlagsMock }));
vi.mock("@/server/auth", () => ({ isMemberAuthConfigured: isMemberAuthConfiguredMock }));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: hasRequiredMemberConsentsMock }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: withBillingTransactionMock }));
vi.mock("./orderAttribution", () => ({ recordOrderAttribution: vi.fn() }));
vi.mock("@/server/member/profileSnapshot", () => ({
  snapshotOwnProfile: vi.fn(async () => ({
    id: "profile-snapshot-1",
    profile: {
      year: 1990, month: 1, day: 20, calendar: "solar", isLeapMonth: false, hour: 12, minute: 30,
      gender: "female", dayBoundaryRule: "zi23", placeLabel: "Seoul", placeLabelEn: "Seoul",
      lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul",
    },
  })),
}));
vi.mock("./crypto", () => ({
  decryptBillingValue: vi.fn(),
  encryptBillingValue: vi.fn(() => ({ ciphertext: "encrypted-receipt-email", keyVersion: 1 })),
  encryptPaymentKey: vi.fn(() => ({ ciphertext: "encrypted-payment-key", keyVersion: 1 })),
  paymentKeyDigest: vi.fn(() => Buffer.alloc(32, 1)),
}));

import { BillingAccessError, createPendingOrder, getSaju2027SaleState } from "./service";
import { withMemberTransaction } from "@/server/member/database";
import { CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION } from "@/server/yearForecastApproval";

const memberClient = { query: queryMock } as unknown as PoolClient;
const productPrice = {
  id: "price-1",
  product_key: "saju-2027",
  name_ko: "2027 Report",
  name_en: "2027 Annual Report",
  amount: 9_900,
  currency: "KRW",
};

function configureDatabase(): string[] {
  const statements: string[] = [];
  queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
    const normalized = statement.replace(/\s+/gu, " ").trim().toLowerCase();
    statements.push(normalized);

    if (normalized.startsWith("select id::text from member.profiles")) return { rows: [{ id: "profile-1" }] };
    if (normalized.startsWith("select pr.id::text")) return { rows: [productPrice] };
    if (normalized.startsWith("insert into billing.orders")) {
      expect(parameters).toEqual(expect.arrayContaining([productPrice.amount, productPrice.currency]));
      return { rows: [{ id: "order-1" }] };
    }
    return { rows: [] };
  });

  const runInTransaction = async <T>(_userId: string, operation: (client: PoolClient) => Promise<T>): Promise<T> =>
    operation(memberClient);
  vi.mocked(withMemberTransaction).mockImplementation(runInTransaction);
  return statements;
}

const validInput = {
  productKey: "saju-2027",
  locale: "en",
  acceptedPurchaseTerms: true,
  acceptedWithdrawalNotice: true,
  acceptedEuWithdrawalWaiver: false,
  countryCode: "KR",
} as const;

describe("pending billing order creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverFeatureFlagsMock.billing = true;
    serverFeatureFlagsMock.memberAuth = true;
    isMemberAuthConfiguredMock.mockImplementation(() =>
      serverFeatureFlagsMock.memberAuth && process.env.MEMBER_LEGAL_DOCUMENTS_APPROVED === "true");
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://member.invalid/billing");
    vi.stubEnv("MEMBER_LEGAL_DOCUMENTS_APPROVED", "true");
    vi.stubEnv("BILLING_LEGAL_DOCUMENTS_APPROVED", "true");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "true");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION);
    vi.stubEnv("TOSS_CLIENT_KEY", "test-client-key");
    vi.stubEnv("TOSS_SECRET_KEY", "test-secret-key");
    vi.stubEnv("BILLING_ENCRYPTION_KEY", "synthetic-test-key");
    vi.stubEnv("BILLING_USER_REF_HMAC_KEY", "synthetic-user-reference-key-32-bytes");
    vi.stubEnv("BILLING_TERMS_VERSION", "terms-v1");
    vi.stubEnv("BILLING_WITHDRAWAL_NOTICE_VERSION", "withdrawal-v1");
    vi.stubEnv("MEMBER_TRANSFER_VERSION", "transfer-v1");
    vi.stubEnv("BILLING_EU_WITHDRAWAL_WAIVER_VERSION", "eu-waiver-v1");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example/");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("SAJU_2027_SALE_STATE", "live");

    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["member authentication feature flag", "feature"],
    ["member legal document approval", "member-approval"],
    ["billing legal document approval", "billing-approval"],
    ["forecast expert review approval", "forecast-review-approval"],
    ["current forecast expert review version", "forecast-review-version"],
  ] as const)("keeps the sale in preview and creates no order without %s", async (_label, missingGate) => {
    withBillingTransactionMock.mockResolvedValue({ amount: 9_900, currency: "KRW", nameKo: "2027 리포트", nameEn: "2027 Report" });
    if (missingGate === "feature") {
      serverFeatureFlagsMock.memberAuth = false;
    } else if (missingGate === "member-approval") {
      vi.stubEnv("MEMBER_LEGAL_DOCUMENTS_APPROVED", "false");
    } else if (missingGate === "billing-approval") {
      vi.stubEnv("BILLING_LEGAL_DOCUMENTS_APPROVED", "false");
    } else if (missingGate === "forecast-review-approval") {
      vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "false");
    } else {
      vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", "2027-saju-report-v0");
    }

    // origin/master's three-stage rollout: a requested "live" sale downgrades to
    // "preview" (price visible, checkout disabled) whenever a checkout gate is closed.
    await expect(getSaju2027SaleState()).resolves.toMatchObject({ status: "preview" });
    await expect(createPendingOrder(validInput)).rejects.toMatchObject({
      name: "BillingAccessError",
      reason: "billing_unavailable",
    });

    expect(getSignedInMemberMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("uses the active server price and records the order consents", async () => {
    const statements = configureDatabase();

    const order = await createPendingOrder(validInput);

    expect(order.amount).toBe(productPrice.amount);
    expect(order.currency).toBe("KRW");
    expect(order.orderName).toBe(productPrice.name_en);
    expect(order.successUrl).toBe("https://lumina.example/api/billing/toss/return?locale=en");
    expect(order.failUrl).toBe("https://lumina.example/api/billing/toss/fail?locale=en");
    expect(statements.filter((statement) => statement.startsWith("insert into billing.order_consents"))).toHaveLength(3);
  });

  it("rejects an EU checkout without the withdrawal waiver before any database write", async () => {
    configureDatabase();

    await expect(createPendingOrder({ ...validInput, countryCode: "DE" }))
      .rejects.toMatchObject({ name: "BillingInputError", reason: "payment_state_invalid" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid site origin before creating an expiring pending order", async () => {
    configureDatabase();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example/checkout");

    await expect(createPendingOrder(validInput))
      .rejects.toBeInstanceOf(BillingAccessError);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid user-reference key before creating an expiring pending order", async () => {
    configureDatabase();
    vi.stubEnv("BILLING_USER_REF_HMAC_KEY", "short-test-key");

    await expect(createPendingOrder(validInput)).rejects.toThrow("BILLING_USER_REF_HMAC_KEY is not configured");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("records the EU waiver version when the required waiver is accepted", async () => {
    const statements = configureDatabase();

    await createPendingOrder({ ...validInput, countryCode: "DE", acceptedEuWithdrawalWaiver: true });

    expect(statements.filter((statement) => statement.startsWith("insert into billing.order_consents"))).toHaveLength(4);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into billing.order_consents"),
      expect.arrayContaining(["eu_withdrawal_waiver", "eu-waiver-v1"]),
    );
  });
});
