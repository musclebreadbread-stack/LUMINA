import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReceiptEmailJob } from "./service";

const {
  claimReceiptEmailJobsMock,
  getReceiptRecipientMock,
  markReceiptEmailFailedMock,
  markReceiptEmailSentMock,
  markReceiptEmailUndeliverableMock,
  sendMock,
  resendConstructorMock,
} = vi.hoisted(() => ({
  claimReceiptEmailJobsMock: vi.fn(),
  getReceiptRecipientMock: vi.fn(),
  markReceiptEmailFailedMock: vi.fn(),
  markReceiptEmailSentMock: vi.fn(),
  markReceiptEmailUndeliverableMock: vi.fn(),
  sendMock: vi.fn(),
  resendConstructorMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({ Resend: resendConstructorMock }));
vi.mock("./service", () => ({
  claimReceiptEmailJobs: claimReceiptEmailJobsMock,
  getReceiptRecipient: getReceiptRecipientMock,
  markReceiptEmailFailed: markReceiptEmailFailedMock,
  markReceiptEmailSent: markReceiptEmailSentMock,
  markReceiptEmailUndeliverable: markReceiptEmailUndeliverableMock,
}));

import { dispatchReceiptEmails } from "./receipts";

const job: ReceiptEmailJob = {
  orderId: "123e4567-e89b-42d3-a456-426614174000",
  attemptCount: 2,
  ciphertext: "encrypted-email-fixture",
  keyVersion: 1,
  locale: "ko",
  productName: "<script>alert('x')</script> & report",
  amount: 9_900,
  currency: "KRW",
  paidAt: new Date("2026-09-30T03:00:00.000Z"),
};

function enabledReceiptDispatch(): void {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("BILLING_RECEIPTS_ENABLED", "true");
  vi.stubEnv("BILLING_LEGAL_DOCUMENTS_APPROVED", "true");
  vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
  vi.stubEnv("BILLING_RECEIPT_FROM", "LUMINA <receipts@example.test>");
  vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "support@example.test");
}

describe("billing receipt dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enabledReceiptDispatch();
    claimReceiptEmailJobsMock.mockResolvedValue([job]);
    getReceiptRecipientMock.mockReturnValue("member@example.test");
    markReceiptEmailFailedMock.mockResolvedValue(undefined);
    markReceiptEmailSentMock.mockResolvedValue(true);
    markReceiptEmailUndeliverableMock.mockResolvedValue(undefined);
    sendMock.mockResolvedValue({ data: { id: "resend-message-1" }, error: null });
    resendConstructorMock.mockImplementation(() => ({ emails: { send: sendMock } }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends an escaped, localized receipt with an idempotency key and marks it sent", async () => {
    const result = await dispatchReceiptEmails(3);

    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(claimReceiptEmailJobsMock).toHaveBeenCalledWith(3);
    expect(resendConstructorMock).toHaveBeenCalledWith("synthetic-resend-key");
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      from: "LUMINA <receipts@example.test>",
      to: "member@example.test",
      subject: "LUMINA 결제 영수증",
      replyTo: "support@example.test",
      html: expect.stringContaining("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; report"),
      text: expect.stringContaining("<script>alert('x')</script> & report"),
    }), { idempotencyKey: `billing-receipt:${job.orderId}` });
    expect(markReceiptEmailSentMock).toHaveBeenCalledWith(job.orderId, job.attemptCount, "resend-message-1");
  });

  it("does not send a receipt when the encrypted recipient cannot be resolved", async () => {
    getReceiptRecipientMock.mockReturnValue(null);

    const result = await dispatchReceiptEmails();

    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(sendMock).not.toHaveBeenCalled();
    expect(markReceiptEmailUndeliverableMock).toHaveBeenCalledWith(job.orderId, job.attemptCount);
  });

  it("records provider failures using a bounded sanitized error code", async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: "Gateway Timeout!" } });

    const result = await dispatchReceiptEmails();

    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(markReceiptEmailFailedMock).toHaveBeenCalledWith(job.orderId, job.attemptCount, "gateway_timeout_");
    expect(markReceiptEmailSentMock).not.toHaveBeenCalled();
  });

  it("marks a job failed when the email provider throws and continues through the queue", async () => {
    const secondJob: ReceiptEmailJob = { ...job, orderId: "123e4567-e89b-42d3-a456-426614174001" };
    claimReceiptEmailJobsMock.mockResolvedValue([job, secondJob]);
    sendMock.mockRejectedValueOnce(new Error("private provider detail"));
    sendMock.mockResolvedValueOnce({ data: { id: "resend-message-2" }, error: null });

    const result = await dispatchReceiptEmails(2);

    expect(result).toEqual({ claimed: 2, sent: 1, failed: 1 });
    expect(markReceiptEmailFailedMock).toHaveBeenCalledWith(job.orderId, job.attemptCount, "provider_error");
    expect(markReceiptEmailSentMock).toHaveBeenCalledWith(secondJob.orderId, secondJob.attemptCount, "resend-message-2");
  });

  it("counts an email as failed when the sent state cannot be committed", async () => {
    markReceiptEmailSentMock.mockResolvedValue(false);

    await expect(dispatchReceiptEmails()).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });
  });

  it("requires production, receipt, and legal gates before claiming jobs", async () => {
    vi.stubEnv("APP_ENV", "development");

    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_disabled");
    expect(claimReceiptEmailJobsMock).not.toHaveBeenCalled();
    expect(resendConstructorMock).not.toHaveBeenCalled();
  });

  it("requires a configured provider and safe sender before claiming jobs", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_not_configured");
    expect(claimReceiptEmailJobsMock).not.toHaveBeenCalled();

    vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
    vi.stubEnv("BILLING_RECEIPT_FROM", "receipt@example.test\r\nBcc:attacker@example.test");
    await expect(dispatchReceiptEmails()).rejects.toThrow("receipt_dispatch_not_configured");
    expect(claimReceiptEmailJobsMock).not.toHaveBeenCalled();
  });

  it("ignores an invalid optional reply-to address", async () => {
    vi.stubEnv("BILLING_RECEIPT_REPLY_TO", "bad\naddress@example.test");

    await dispatchReceiptEmails();

    expect(sendMock.mock.calls[0]?.[0]).not.toHaveProperty("replyTo");
  });
});
