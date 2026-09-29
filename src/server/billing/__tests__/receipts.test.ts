import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const send = vi.fn();
const resendCtor = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    constructor(key: string) {
      resendCtor(key);
    }
  },
}));

const service = vi.hoisted(() => ({
  claimReceiptEmailJobs: vi.fn(),
  getReceiptRecipient: vi.fn(),
  markReceiptEmailFailed: vi.fn(),
  markReceiptEmailSent: vi.fn(),
  markReceiptEmailUndeliverable: vi.fn(),
}));
vi.mock("../service", () => service);

import { dispatchReceiptEmails } from "../receipts";

function job(overrides: Record<string, unknown> = {}) {
  return {
    orderId: "order-1",
    attemptCount: 1,
    locale: "en",
    currency: "KRW",
    amount: 9900,
    productName: "Deep <Reading> & \"more\"",
    paidAt: new Date("2026-03-01T03:00:00Z"),
    ...overrides,
  };
}

function enable() {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("TOSS_SECRET_KEY", "live_sk_example");
  vi.stubEnv("BILLING_RECEIPTS_ENABLED", "true");
  vi.stubEnv("BILLING_LEGAL_DOCUMENTS_APPROVED", "true");
  vi.stubEnv("RESEND_API_KEY", "re_example");
  vi.stubEnv("BILLING_RECEIPT_FROM", "LUMINA <receipts@example.com>");
  vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "support@example.com");
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  send.mockReset();
  service.claimReceiptEmailJobs.mockResolvedValue([]);
  service.getReceiptRecipient.mockReturnValue("user@example.com");
  service.markReceiptEmailSent.mockResolvedValue(true);
  enable();
});

describe("dispatchReceiptEmails gating", () => {
  it("throws disabled when jobs are not allowed, flags are off or unapproved", async () => {
    vi.stubEnv("APP_ENV", "development");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_disabled");
    enable();
    vi.stubEnv("BILLING_RECEIPTS_ENABLED", "false");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_disabled");
    enable();
    vi.stubEnv("BILLING_LEGAL_DOCUMENTS_APPROVED", "");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_disabled");
    expect(service.claimReceiptEmailJobs).not.toHaveBeenCalled();
  });

  it("throws not_configured for missing key, missing from, or header-injecting from", async () => {
    vi.stubEnv("RESEND_API_KEY", " ");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_not_configured");
    enable();
    vi.stubEnv("BILLING_RECEIPT_FROM", "");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_not_configured");
    enable();
    vi.stubEnv("BILLING_RECEIPT_FROM", "a@example.com\nBcc: x@example.com");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_not_configured");
    enable();
    vi.stubEnv("BILLING_RECEIPT_FROM", "a".repeat(255));
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_not_configured");
  });
});

describe("dispatchReceiptEmails sending", () => {
  it("sends an English receipt with escaped html, idempotency key and reply-to", async () => {
    service.claimReceiptEmailJobs.mockResolvedValue([job()]);
    send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const result = await dispatchReceiptEmails(3);
    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(service.claimReceiptEmailJobs).toHaveBeenCalledWith(3);
    expect(resendCtor).toHaveBeenCalledWith("re_example");
    const [payload, options] = send.mock.calls[0] as [Record<string, string>, Record<string, string>];
    expect(payload.from).toBe("LUMINA <receipts@example.com>");
    expect(payload.to).toBe("user@example.com");
    expect(payload.subject).toBe("Your LUMINA payment receipt");
    expect(payload.replyTo).toBe("support@example.com");
    expect(payload.html).toContain("Deep &lt;Reading&gt; &amp; &quot;more&quot;");
    expect(payload.html).not.toContain("<Reading>");
    expect(payload.text).toContain("Amount: ₩9,900");
    expect(payload.text).toContain("Order number: order-1");
    expect(options.idempotencyKey).toBe("billing-receipt:order-1");
    expect(service.markReceiptEmailSent).toHaveBeenCalledWith("order-1", 1, "msg_1");
  });

  it("renders Korean content for ko locale and omits invalid reply-to", async () => {
    vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "bad address");
    service.claimReceiptEmailJobs.mockResolvedValue([job({ locale: "ko", productName: "P'" })]);
    send.mockResolvedValue({ data: { id: "m" }, error: null });
    await dispatchReceiptEmails();
    const [payload] = send.mock.calls[0] as [Record<string, string>];
    expect(payload.subject).toBe("LUMINA 결제 영수증");
    expect(payload.text).toContain("결제 금액");
    expect(payload.html).toContain("P&#39;");
    expect(payload).not.toHaveProperty("replyTo");
  });

  it("omits reply-to for newline-containing or too-long values", async () => {
    service.claimReceiptEmailJobs.mockResolvedValue([job()]);
    send.mockResolvedValue({ data: { id: "m" }, error: null });
    vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "a@b.co\nBcc: x@y.co");
    await dispatchReceiptEmails();
    expect(send.mock.calls[0]?.[0]).not.toHaveProperty("replyTo");
    vi.stubEnv("BILLING_RECEIPT_REPLY_TO", `${"a".repeat(250)}@b.co`);
    await dispatchReceiptEmails();
    expect(send.mock.calls[1]?.[0]).not.toHaveProperty("replyTo");
  });

  it("marks undeliverable and counts failure when the recipient is missing or blocked", async () => {
    service.claimReceiptEmailJobs.mockResolvedValue([job(), job({ orderId: "order-2", attemptCount: 2 })]);
    service.getReceiptRecipient.mockReturnValueOnce(null);
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_example");
    vi.stubEnv("BILLING_STAGING_RECEIPT_ALLOWLIST", "other@example.com");
    const result = await dispatchReceiptEmails();
    expect(result).toEqual({ claimed: 2, sent: 0, failed: 2 });
    expect(service.markReceiptEmailUndeliverable).toHaveBeenNthCalledWith(1, "order-1", 1);
    expect(service.markReceiptEmailUndeliverable).toHaveBeenNthCalledWith(2, "order-2", 2);
    expect(send).not.toHaveBeenCalled();
  });

  it("records a sanitized provider error code on error results", async () => {
    service.claimReceiptEmailJobs.mockResolvedValue([job(), job({ orderId: "o2" }), job({ orderId: "o3" })]);
    send
      .mockResolvedValueOnce({ data: null, error: { name: "Rate Limit!" } })
      .mockResolvedValueOnce({ data: null, error: { name: "" } })
      .mockResolvedValueOnce({ data: {}, error: null });
    const result = await dispatchReceiptEmails();
    expect(result).toEqual({ claimed: 3, sent: 0, failed: 3 });
    expect(service.markReceiptEmailFailed).toHaveBeenNthCalledWith(1, "order-1", 1, "rate_limit_");
    expect(service.markReceiptEmailFailed).toHaveBeenNthCalledWith(2, "o2", 1, "provider_error");
    expect(service.markReceiptEmailFailed).toHaveBeenNthCalledWith(3, "o3", 1, "provider_error");
  });

  it("counts a failed markSent as not sent", async () => {
    service.claimReceiptEmailJobs.mockResolvedValue([job()]);
    send.mockResolvedValue({ data: { id: "m" }, error: null });
    service.markReceiptEmailSent.mockResolvedValue(false);
    expect(await dispatchReceiptEmails()).toEqual({ claimed: 1, sent: 0, failed: 1 });
  });

  it("survives thrown errors, even if recording the failure also throws", async () => {
    service.claimReceiptEmailJobs.mockResolvedValue([job(), job({ orderId: "o2" })]);
    send.mockRejectedValue(new Error("network"));
    service.markReceiptEmailFailed.mockRejectedValueOnce(new Error("db down"));
    const result = await dispatchReceiptEmails();
    expect(result).toEqual({ claimed: 2, sent: 0, failed: 2 });
    expect(service.markReceiptEmailFailed).toHaveBeenLastCalledWith("o2", 1, "provider_error");
  });
});
