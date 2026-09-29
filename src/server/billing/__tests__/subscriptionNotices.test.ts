import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const db = vi.hoisted(() => ({ query: vi.fn(), withBillingTransaction: vi.fn() }));
vi.mock("../workerDatabase", () => ({ withBillingTransaction: db.withBillingTransaction }));

const decrypt = vi.hoisted(() => vi.fn());
vi.mock("../subscriptions", () => ({ decryptSubscriptionEmail: decrypt }));

import { dispatchSubscriptionNotices } from "../subscriptionNotices";

type Row = Record<string, unknown>;

function row(overrides: Row = {}): Row {
  return {
    id: "n1",
    subscriptionId: "s1",
    attemptCount: 1,
    noticeType: "subscription_receipt",
    ciphertext: "ct",
    keyVersion: 1,
    locale: "en",
    productName: "LUMINA+ Monthly",
    amount: 4900,
    currency: "KRW",
    periodEnd: new Date("2026-04-01T00:00:00Z"),
    periodStart: new Date("2026-03-01T00:00:00Z"),
    nextAttemptAt: new Date("2026-03-04T00:00:00Z"),
    ...overrides,
  };
}

function enable() {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("TOSS_SECRET_KEY", "live_sk_example");
  vi.stubEnv("SUBSCRIPTION_ENABLED", "true");
  vi.stubEnv("SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", "true");
  vi.stubEnv("TOSS_BILLING_APPROVED", "true");
  vi.stubEnv("RESEND_API_KEY", "re_example");
  vi.stubEnv("SUBSCRIPTION_FROM", "LUMINA <billing@example.com>");
  vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "support@example.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lumina.example");
}

/** First query call is the claim; the rest are updates whose SQL text is used to route results. */
function setupDb(rows: Row[], sentRowCount = 1) {
  db.query.mockImplementation(async (sql: string) => {
    if (sql.startsWith("with due")) return { rows };
    if (sql.includes("status = 'sent'")) return { rowCount: sentRowCount, rows: [] };
    return { rowCount: 1, rows: [] };
  });
}

function updates(fragment: string) {
  return db.query.mock.calls.filter(([sql]) => (sql as string).includes(fragment));
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  send.mockReset();
  db.withBillingTransaction.mockImplementation(async (fn: (client: unknown) => unknown) => fn({ query: db.query }));
  decrypt.mockResolvedValue("user@example.com");
  send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
  enable();
});

describe("dispatchSubscriptionNotices gating", () => {
  it("throws disabled for each missing flag or billing-jobs guard", async () => {
    for (const name of ["SUBSCRIPTION_ENABLED", "SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", "TOSS_BILLING_APPROVED"]) {
      enable();
      vi.stubEnv(name, "false");
      await expect(dispatchSubscriptionNotices()).rejects.toThrow("subscription_notice_dispatch_disabled");
    }
    enable();
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_example");
    await expect(dispatchSubscriptionNotices()).rejects.toThrow("subscription_notice_dispatch_disabled");
    expect(db.withBillingTransaction).not.toHaveBeenCalled();
  });

  it("throws not_configured for missing or unsafe email settings", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(dispatchSubscriptionNotices()).rejects.toThrow("subscription_notice_dispatch_not_configured");
    enable();
    vi.stubEnv("SUBSCRIPTION_FROM", "");
    await expect(dispatchSubscriptionNotices()).rejects.toThrow("subscription_notice_dispatch_not_configured");
    enable();
    vi.stubEnv("SUBSCRIPTION_FROM", "x@example.com\r\nBcc: y@example.com");
    await expect(dispatchSubscriptionNotices()).rejects.toThrow("subscription_notice_dispatch_not_configured");
    enable();
    vi.stubEnv("SUBSCRIPTION_FROM", "f".repeat(255));
    await expect(dispatchSubscriptionNotices()).rejects.toThrow("subscription_notice_dispatch_not_configured");
  });
});

describe("dispatchSubscriptionNotices claiming", () => {
  it("clamps the limit to 1..20 and drops rows lacking ciphertext or key version", async () => {
    setupDb([row({ ciphertext: "" }), row({ id: "n2", keyVersion: 0 }), row({ id: "n3" })]);
    const result = await dispatchSubscriptionNotices(1000);
    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(db.query.mock.calls[0]?.[1]).toEqual([20]);
    setupDb([]);
    await dispatchSubscriptionNotices(-5);
    expect(db.query.mock.calls.at(-1)?.[1]).toEqual([1]);
    setupDb([]);
    await dispatchSubscriptionNotices(7.9);
    expect(db.query.mock.calls.at(-1)?.[1]).toEqual([7]);
  });
});

describe("dispatchSubscriptionNotices sending", () => {
  it("sends an English receipt with access-through date, account link and reply-to", async () => {
    setupDb([row()]);
    const result = await dispatchSubscriptionNotices();
    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(decrypt).toHaveBeenCalledWith("ct", "s1", 1);
    const [payload, options] = send.mock.calls[0] as [Record<string, string>, Record<string, string>];
    expect(payload.subject).toBe("Your LUMINA+ payment receipt");
    expect(payload.to).toBe("user@example.com");
    expect(payload.replyTo).toBe("support@example.com");
    expect(payload.text).toContain("Your payment of 4,900 KRW is complete.");
    expect(payload.text).toContain("Access through: April 1, 2026");
    expect(payload.text).toContain("https://lumina.example/en/account/subscriptions");
    expect(payload.html).toContain("Open account");
    expect(options.idempotencyKey).toBe("subscription-notice:n1");
    expect(updates("status = 'sent'")[0]?.[1]).toEqual(["n1", 1, "msg_1"]);
  });

  it("renders Korean copy and a locale-specific account URL", async () => {
    setupDb([row({ locale: "ko" })]);
    await dispatchSubscriptionNotices();
    const [payload] = send.mock.calls[0] as [Record<string, string>];
    expect(payload.subject).toBe("LUMINA+ 결제 영수증");
    expect(payload.html).toContain("계정 열기");
    expect(payload.text).toContain("이용 기간: ");
    expect(payload.text).toContain("https://lumina.example/account/subscriptions");
  });

  it("uses the right date and label for each notice type and locale", async () => {
    const cases: Array<[Row, string, string]> = [
      [{ noticeType: "renewal_reminder" }, "Renewal date: March 1, 2026", "LUMINA+ Monthly will renew for 4,900 KRW."],
      [{ noticeType: "payment_failed_1" }, "Next payment attempt: March 4, 2026", "A payment of 4,900 KRW did not go through."],
      [{ noticeType: "payment_failed_3" }, "Next payment attempt: March 4, 2026", "did not go through"],
      [{ noticeType: "payment_failed_7" }, "Next payment attempt: March 4, 2026", "did not go through"],
      [{ noticeType: "subscription_ended" }, "Renewal date: April 1, 2026", "LUMINA+ Monthly is no longer active."],
      [{ noticeType: "renewal_reminder", locale: "ko" }, "갱신 예정일: ", "갱신될 예정입니다"],
      [{ noticeType: "payment_failed_1", locale: "ko" }, "다음 결제 재시도: ", "승인되지 않았습니다"],
      [{ noticeType: "subscription_ended", locale: "ko" }, "갱신 예정일: ", "이용이 종료되었습니다"],
    ];
    for (const [overrides, dateText, introText] of cases) {
      send.mockClear();
      setupDb([row(overrides)]);
      const result = await dispatchSubscriptionNotices();
      expect(result.sent).toBe(1);
      const [payload] = send.mock.calls[0] as [Record<string, string>];
      expect(payload.text).toContain(dateText);
      expect(payload.text).toContain(introText);
    }
  });

  it("omits the detail line when the relevant date is null", async () => {
    setupDb([row({ noticeType: "payment_failed_1", nextAttemptAt: null })]);
    await dispatchSubscriptionNotices();
    const [payload] = send.mock.calls[0] as [Record<string, string>];
    expect(payload.text).not.toContain("Next payment attempt");
    expect(payload.html).toContain("<p></p>");
  });

  it("escapes html in product names and skips invalid reply-to", async () => {
    vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "nope");
    setupDb([row({ noticeType: "subscription_ended", productName: "<b>\"x\" & 'y'</b>" })]);
    await dispatchSubscriptionNotices();
    const [payload] = send.mock.calls[0] as [Record<string, string>];
    expect(payload.html).toContain("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;");
    expect(payload).not.toHaveProperty("replyTo");
  });

  it("blocks staging recipients that are not allowlisted and marks the notice failed", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_example");
    vi.stubEnv("BILLING_STAGING_RECEIPT_ALLOWLIST", "qa@example.com");
    setupDb([row()]);
    const result = await dispatchSubscriptionNotices();
    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(send).not.toHaveBeenCalled();
    expect(updates("status = case")[0]?.[1]).toEqual(["n1", 1, "staging_recipient_blocked"]);
  });

  it("marks failed with a sanitized code when the provider returns an error or no id", async () => {
    setupDb([row(), row({ id: "n2" })]);
    send
      .mockResolvedValueOnce({ data: null, error: { name: "Validation Error" } })
      .mockResolvedValueOnce({ data: {}, error: null });
    const result = await dispatchSubscriptionNotices();
    expect(result).toEqual({ claimed: 2, sent: 0, failed: 2 });
    const calls = updates("status = case");
    expect(calls[0]?.[1]).toEqual(["n1", 1, "validation_error"]);
    expect(calls[1]?.[1]).toEqual(["n2", 1, "provider_error"]);
  });

  it("does not count sent (or failed) when the processing claim was lost", async () => {
    setupDb([row()], 0);
    expect(await dispatchSubscriptionNotices()).toEqual({ claimed: 1, sent: 0, failed: 0 });
  });

  it("records provider_error on thrown errors and tolerates a failing failure-record", async () => {
    setupDb([row(), row({ id: "n2" })]);
    decrypt.mockRejectedValueOnce(new Error("bad key")).mockResolvedValueOnce("user@example.com");
    send.mockRejectedValueOnce(new Error("network"));
    const original = db.query.getMockImplementation();
    let failedUpdates = 0;
    db.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("status = case")) {
        failedUpdates += 1;
        if (failedUpdates === 2) throw new Error("db down");
      }
      return original!(sql, params);
    });
    const result = await dispatchSubscriptionNotices();
    expect(result).toEqual({ claimed: 2, sent: 0, failed: 2 });
    expect(failedUpdates).toBe(2);
  });
});
