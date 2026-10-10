import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  rowCount: number | null;
}>;
type BillingQuery = (statement: string, parameters?: readonly unknown[]) => Promise<QueryResult>;
type BillingTestClient = Readonly<{ query: BillingQuery; release: () => void }>;
type BillingTestPoolOptions = Readonly<{ onConnect: (client: BillingTestClient) => Promise<void> }>;
type EmailRequest = Readonly<{
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}>;
type EmailOptions = Readonly<{ idempotencyKey: string }>;
type EmailResult = Readonly<{ data: Readonly<{ id: string }> | null; error: Readonly<{ name: string }> | null }>;
type ResendSend = (request: EmailRequest, options: EmailOptions) => Promise<EmailResult>;

const {
  billingQueryMock,
  clientReleaseMock,
  poolConstructorMock,
  poolOnMock,
  decryptSubscriptionEmailMock,
  sendMock,
  resendConstructorMock,
} = vi.hoisted(() => ({
  billingQueryMock: vi.fn<BillingQuery>(),
  clientReleaseMock: vi.fn<() => void>(),
  poolConstructorMock: vi.fn<(options: BillingTestPoolOptions) => void>(),
  poolOnMock: vi.fn<(event: string, listener: (error: Error & { readonly code?: string }) => void) => unknown>(),
  decryptSubscriptionEmailMock: vi.fn<(ciphertext: string, subscriptionId: string, version: number) => Promise<string>>(),
  sendMock: vi.fn<ResendSend>(),
  resendConstructorMock: vi.fn<(apiKey: string) => { emails: { send: ResendSend } }>(),
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
vi.mock("resend", () => ({ Resend: resendConstructorMock }));
vi.mock("./subscriptions", () => ({ decryptSubscriptionEmail: decryptSubscriptionEmailMock }));

const subscriptionId = "123e4567-e89b-12d3-a456-426614174000";
const baseJob = {
  id: "notice-1",
  subscriptionId,
  attemptCount: 2,
  noticeType: "renewal_reminder",
  ciphertext: "encrypted-recipient",
  keyVersion: 3,
  locale: "en",
  productName: "LUMINA Plus Monthly",
  amount: 5_900,
  currency: "KRW",
  periodEnd: new Date("2026-11-05T00:00:00.000Z"),
  periodStart: new Date("2026-10-05T00:00:00.000Z"),
  nextAttemptAt: new Date("2026-10-06T00:00:00.000Z"),
};

function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

function setClaimedJobs(jobs: readonly Readonly<Record<string, unknown>>[], sentRowCount = 1): void {
  billingQueryMock.mockImplementation(async (statement) => {
    const sql = normalize(statement);
    if (sql.startsWith("select current_user as role_name")) {
      return { rows: [{ role_name: "lumina_billing_worker", is_superuser: false, bypasses_rls: false }], rowCount: 1 };
    }
    if (sql.startsWith("with exhausted as")) return { rows: jobs, rowCount: jobs.length };
    if (sql.startsWith("update billing.subscription_notices set status = 'sent'")) {
      return { rows: [], rowCount: sentRowCount };
    }
    return { rows: [], rowCount: 1 };
  });
}

async function dispatch(limit?: number) {
  const notices = await import("./subscriptionNotices");
  return notices.dispatchSubscriptionNotices(limit);
}

function statements(): string[] {
  return billingQueryMock.mock.calls.map(([statement]) => normalize(statement));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("BILLING_DATABASE_URL", "postgresql://billing.invalid/database");
  vi.stubEnv("SUBSCRIPTION_ENABLED", "true");
  vi.stubEnv("SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", "true");
  vi.stubEnv("TOSS_BILLING_APPROVED", "true");
  vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
  vi.stubEnv("SUBSCRIPTION_FROM", "LUMINA <subscriptions@example.test>");
  vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "support@example.test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example.test");
  billingQueryMock.mockReset();
  setClaimedJobs([]);
  clientReleaseMock.mockReset();
  poolConstructorMock.mockReset();
  poolOnMock.mockReset();
  decryptSubscriptionEmailMock.mockReset().mockResolvedValue("member@example.test");
  sendMock.mockReset().mockResolvedValue({ data: { id: "resend-message-1" }, error: null });
  resendConstructorMock.mockReset().mockImplementation(() => ({ emails: { send: sendMock } }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LUMINA Plus subscription notices", () => {
  it("claims eligible due notices with a bounded renewable lease", async () => {
    setClaimedJobs([baseJob]);

    await expect(dispatch(99)).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    const claim = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("with exhausted as"));
    expect(claim?.[1]).toEqual([20]);
    const sql = normalize(claim?.[0] ?? "");
    expect(sql).toContain("n.status = 'processing' and n.send_after < now() - interval '10 minutes'");
    expect(sql).toContain("and n.attempt_count >= 10");
    expect(sql).toContain("and n.attempt_count < 10");
    expect(sql).toContain("set status = 'failed', last_error_code = 'attempt_limit'");
    expect(sql).toContain("join billing.subscriptions eligible_s on eligible_s.id = n.subscription_id");
    expect(sql).toContain("eligible_s.receipt_email_ciphertext is not null");
    expect(sql).toContain("eligible_s.receipt_email_key_version > 0");
    expect(sql).toContain("n.status = 'queued' and n.send_after <= now()");
    expect(sql).toContain("set status = 'processing', send_after = now(), attempt_count = n.attempt_count + 1");
    expect(sql).toContain("for update of n skip locked limit $1");
    expect(decryptSubscriptionEmailMock).toHaveBeenCalledWith("encrypted-recipient", subscriptionId, 3);
    expect(clientReleaseMock).toHaveBeenCalledTimes(2);
  });

  it("does not claim or send notices when a subscription has no usable encrypted recipient", async () => {
    setClaimedJobs([]);

    await expect(dispatch()).resolves.toEqual({ claimed: 0, sent: 0, failed: 0 });

    const claim = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("with exhausted as"));
    const sql = normalize(claim?.[0] ?? "");
    expect(sql).toContain("join billing.subscriptions eligible_s on eligible_s.id = n.subscription_id");
    expect(sql).toContain("eligible_s.receipt_email_ciphertext is not null");
    expect(sql).toContain("eligible_s.receipt_email_key_version > 0");
    expect(decryptSubscriptionEmailMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends escaped localized content with a same-site subscription link and an idempotency key", async () => {
    setClaimedJobs([{ ...baseJob, productName: "<img src=x onerror=alert(1)> & Plus" }]);

    await expect(dispatch()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(resendConstructorMock).toHaveBeenCalledWith("synthetic-resend-key");
    const [request, options] = sendMock.mock.calls[0] ?? [];
    expect(request).toMatchObject({
      from: "LUMINA <subscriptions@example.test>",
      to: "member@example.test",
      subject: "Your LUMINA+ renewal is coming up",
      replyTo: "support@example.test",
    });
    expect(request?.html).toContain("&lt;img src=x onerror=alert(1)&gt; &amp; Plus");
    expect(request?.html).not.toContain("<img src=x");
    expect(request?.html).toContain("Renewal date: October 5, 2026");
    expect(request?.html).toContain("https://lumina.example.test/en/account/subscriptions");
    expect(request?.text).toContain("<img src=x onerror=alert(1)> & Plus");
    expect(options).toEqual({ idempotencyKey: "subscription-notice:notice-1" });
    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_notices set status = 'sent'"))?.[1])
      .toEqual(["notice-1", 2, "resend-message-1"]);
  });

  it.each([
    { noticeType: "subscription_receipt", locale: "ko", subject: "LUMINA+ 결제 영수증", dateLabel: "이용 기간:" },
    { noticeType: "renewal_reminder", locale: "ko", subject: "LUMINA+ 구독 갱신 예정 안내", dateLabel: "갱신 예정일:" },
    { noticeType: "payment_failed_3", locale: "en", subject: "We could not complete your LUMINA+ payment", dateLabel: "Next payment attempt:" },
    { noticeType: "subscription_ended", locale: "en", subject: "Your LUMINA+ subscription has ended", dateLabel: "Renewal date:" },
  ])("renders the $noticeType notice in $locale", async ({ noticeType, locale, subject, dateLabel }) => {
    setClaimedJobs([{ ...baseJob, noticeType, locale }]);

    await dispatch();

    const request = sendMock.mock.calls[0]?.[0];
    expect(request?.subject).toBe(subject);
    expect(request?.html).toContain(dateLabel);
    expect(request?.html).toContain("LUMINA+");
  });

  it("normalizes provider error names before scheduling notice retries", async () => {
    setClaimedJobs([baseJob]);
    sendMock.mockResolvedValue({ data: null, error: { name: "Rate-Limit! private detail" } });

    await expect(dispatch()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    const failedUpdate = billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_notices set status = case"));
    expect(failedUpdate?.[1]).toEqual(["notice-1", 2, "rate-limit__private_detail"]);
    expect(billingQueryMock.mock.calls.flatMap(([, parameters]) => parameters ?? [])).not.toContain("private detail");
  });

  it("marks a missing message ID as a provider error and keeps sending the next claimed notice", async () => {
    const secondJob = { ...baseJob, id: "notice-2" };
    setClaimedJobs([baseJob, secondJob]);
    sendMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "resend-message-2" }, error: null });

    await expect(dispatch(2)).resolves.toEqual({ claimed: 2, sent: 1, failed: 1 });

    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_notices set status = case"))?.[1])
      .toEqual(["notice-1", 2, "provider_error"]);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("records a rejected provider promise with a generic error and continues the batch", async () => {
    setClaimedJobs([baseJob, { ...baseJob, id: "notice-2" }]);
    sendMock
      .mockRejectedValueOnce(new Error("private provider diagnostic"))
      .mockResolvedValueOnce({ data: { id: "resend-message-2" }, error: null });

    await expect(dispatch(2)).resolves.toEqual({ claimed: 2, sent: 1, failed: 1 });

    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_notices set status = case"))?.[1])
      .toEqual(["notice-1", 2, "provider_error"]);
    expect(billingQueryMock.mock.calls.flatMap(([, parameters]) => parameters ?? [])).not.toContain("private provider diagnostic");
  });

  it("does not count an email as sent until the claimed state update succeeds", async () => {
    setClaimedJobs([baseJob], 0);

    await expect(dispatch()).resolves.toEqual({ claimed: 1, sent: 0, failed: 0 });
    expect(sendMock).toHaveBeenCalledOnce();
    expect(statements().some((statement) => statement.startsWith("update billing.subscription_notices set status = 'sent'"))).toBe(true);
  });

  it.each([
    { name: "production", variable: "APP_ENV", value: "development" },
    { name: "subscription flag", variable: "SUBSCRIPTION_ENABLED", value: "false" },
    { name: "legal approval", variable: "SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", value: "false" },
    { name: "Toss approval", variable: "TOSS_BILLING_APPROVED", value: "false" },
  ])("does not claim notices without the $name gate", async ({ variable, value }) => {
    vi.stubEnv(variable, value);

    await expect(dispatch()).rejects.toThrow("subscription_notice_dispatch_disabled");
    expect(poolConstructorMock).not.toHaveBeenCalled();
    expect(resendConstructorMock).not.toHaveBeenCalled();
  });

  it("rejects missing provider configuration and unsafe sender headers before claiming", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(dispatch()).rejects.toThrow("subscription_notice_dispatch_not_configured");

    vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
    vi.stubEnv("SUBSCRIPTION_FROM", "sender@example.test\r\nBcc:attacker@example.test");
    await expect(dispatch()).rejects.toThrow("subscription_notice_dispatch_not_configured");
    expect(poolConstructorMock).not.toHaveBeenCalled();
  });

  it("omits an invalid optional reply-to header", async () => {
    vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "bad\r\nBcc:attacker@example.test");
    setClaimedJobs([baseJob]);

    await dispatch();

    expect(sendMock.mock.calls[0]?.[0]).not.toHaveProperty("replyTo");
  });

  it("marks undecryptable recipients failed without exposing the decryption error", async () => {
    setClaimedJobs([baseJob]);
    decryptSubscriptionEmailMock.mockRejectedValue(new Error("private ciphertext diagnostic"));

    await expect(dispatch()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });

    expect(sendMock).not.toHaveBeenCalled();
    expect(billingQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith("update billing.subscription_notices set status = case"))?.[1])
      .toEqual(["notice-1", 2, "provider_error"]);
    expect(billingQueryMock.mock.calls.flatMap(([, parameters]) => parameters ?? [])).not.toContain("private ciphertext diagnostic");
  });
});
