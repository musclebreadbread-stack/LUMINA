import "server-only";

import { Resend } from "resend";
import {
  claimReceiptEmailJobs,
  getReceiptRecipient,
  markReceiptEmailFailed,
  markReceiptEmailSent,
  markReceiptEmailUndeliverable,
  type ReceiptEmailJob,
} from "./service";

export interface ReceiptDispatchResult {
  readonly claimed: number;
  readonly sent: number;
  readonly failed: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

function validAddress(value: string | undefined): string | null {
  if (!value || value.length > 254 || /[\r\n]/u.test(value)) return null;
  return /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/u.test(value.trim()) ? value.trim() : null;
}

function emailContent(job: ReceiptEmailJob): Readonly<{ subject: string; html: string; text: string }> {
  const english = job.locale !== "ko";
  const formatter = new Intl.NumberFormat(english ? "en-US" : "ko-KR", {
    style: "currency",
    currency: job.currency,
    maximumFractionDigits: 0,
  });
  const date = new Intl.DateTimeFormat(english ? "en-US" : "ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(job.paidAt);
  const title = english ? "Your LUMINA payment receipt" : "LUMINA 결제 영수증";
  const intro = english ? "Your payment has been completed." : "결제가 완료되었습니다.";
  const productLabel = english ? "Product" : "상품";
  const amountLabel = english ? "Amount" : "결제 금액";
  const dateLabel = english ? "Payment date" : "결제 일시";
  const orderLabel = english ? "Order number" : "주문 번호";
  const product = escapeHtml(job.productName);
  const amount = formatter.format(job.amount);
  const escapedDate = escapeHtml(date);
  const orderId = escapeHtml(job.orderId);
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#302c28;max-width:560px;margin:auto"><h1 style="font-size:22px">${title}</h1><p>${intro}</p><table style="width:100%;border-collapse:collapse"><tr><th align="left">${productLabel}</th><td>${product}</td></tr><tr><th align="left">${amountLabel}</th><td>${amount}</td></tr><tr><th align="left">${dateLabel}</th><td>${escapedDate}</td></tr><tr><th align="left">${orderLabel}</th><td>${orderId}</td></tr></table><p style="font-size:12px;color:#716b63">${english ? "Keep this email for your records." : "이 메일을 결제 내역 확인을 위해 보관해 주세요."}</p></div>`;
  const text = `${title}\n\n${intro}\n${productLabel}: ${job.productName}\n${amountLabel}: ${amount}\n${dateLabel}: ${date}\n${orderLabel}: ${job.orderId}`;
  return { subject: title, html, text };
}

function safeErrorCode(name: string | undefined): string {
  const candidate = name?.toLowerCase().replace(/[^a-z0-9_-]/gu, "_").slice(0, 40);
  return candidate && /^[a-z0-9][a-z0-9_-]{0,39}$/u.test(candidate) ? candidate : "provider_error";
}

async function sendReceipt(resend: Resend, from: string, replyTo: string | null, job: ReceiptEmailJob): Promise<boolean> {
  const recipient = getReceiptRecipient(job);
  if (!recipient) {
    await markReceiptEmailUndeliverable(job.orderId, job.attemptCount);
    return false;
  }
  const content = emailContent(job);
  const result = await resend.emails.send({
    from,
    to: recipient,
    subject: content.subject,
    html: content.html,
    text: content.text,
    ...(replyTo ? { replyTo } : {}),
  }, { idempotencyKey: `billing-receipt:${job.orderId}` });

  if (result.error || !result.data?.id) {
    await markReceiptEmailFailed(job.orderId, job.attemptCount, safeErrorCode(result.error?.name));
    return false;
  }
  return markReceiptEmailSent(job.orderId, job.attemptCount, result.data.id);
}

export async function dispatchReceiptEmails(limit = 5): Promise<ReceiptDispatchResult> {
  if (process.env.APP_ENV !== "production"
    || process.env.BILLING_RECEIPTS_ENABLED !== "true"
    || process.env.BILLING_LEGAL_DOCUMENTS_APPROVED !== "true") {
    throw new Error("receipt_dispatch_disabled");
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BILLING_RECEIPT_FROM?.trim();
  const replyTo = validAddress(process.env.BILLING_RECEIPT_REPLY_TO);
  if (!apiKey || !from || /[\r\n]/u.test(from) || from.length > 254) {
    throw new Error("receipt_dispatch_not_configured");
  }
  const jobs = await claimReceiptEmailJobs(limit);
  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      if (await sendReceipt(resend, from, replyTo, job)) sent += 1;
      else failed += 1;
    } catch {
      try {
        await markReceiptEmailFailed(job.orderId, job.attemptCount, "provider_error");
      } catch {
        // The lease expires for retry if the failure cannot be recorded.
      }
      failed += 1;
    }
  }
  return { claimed: jobs.length, sent, failed };
}
