import "server-only";

import { Resend } from "resend";
import { intlLocale, localePath, type Locale } from "@/i18n/locale";
import { decryptSubscriptionEmail } from "./subscriptions";
import { withBillingTransaction } from "./workerDatabase";

interface NoticeJob {
  readonly id: string;
  readonly subscriptionId: string;
  readonly attemptCount: number;
  readonly noticeType: "subscription_receipt" | "renewal_reminder" | "payment_failed_1" | "payment_failed_3" | "payment_failed_7" | "subscription_ended";
  readonly ciphertext: string;
  readonly keyVersion: number;
  readonly locale: Locale;
  readonly productName: string;
  readonly amount: number;
  readonly currency: string;
  readonly periodEnd: Date | null;
  readonly periodStart: Date | null;
  readonly nextAttemptAt: Date | null;
}

function validAddress(value: string | undefined): string | null {
  if (!value || value.length > 254 || /[\r\n]/u.test(value)) return null;
  const address = value.trim();
  return /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/u.test(address) ? address : null;
}

function safeErrorCode(name: string | undefined): string {
  const candidate = name?.toLowerCase().replace(/[^a-z0-9_-]/gu, "_").slice(0, 40);
  return candidate && /^[a-z0-9][a-z0-9_-]{0,39}$/u.test(candidate) ? candidate : "provider_error";
}

async function claimNoticeJobs(limit: number): Promise<readonly NoticeJob[]> {
  return withBillingTransaction(async (client) => {
    const sql = [
      "with due as (",
      "  select n.id from billing.subscription_notices n",
      "   where (n.status = 'queued' and n.send_after <= now())",
      "      or (n.status = 'processing' and n.created_at < now() - interval '10 minutes')",
      "   order by n.send_after, n.created_at",
      "   for update of n skip locked limit $1",
      "), claimed as (",
      "  update billing.subscription_notices n set status = 'processing', attempt_count = n.attempt_count + 1",
      "    from due where n.id = due.id",
      "  returning n.id, n.subscription_id, n.invoice_id, n.attempt_count, n.notice_type",
      ")",
      "select c.id::text as id, s.id::text as \"subscriptionId\", c.attempt_count as \"attemptCount\",",
      "       c.notice_type as \"noticeType\", s.receipt_email_ciphertext as ciphertext,",
      "       s.receipt_email_key_version as \"keyVersion\", s.receipt_locale as locale,",
      "       case when s.receipt_locale = 'ko' then p.name_ko else p.name_en end as \"productName\",",
      "       coalesce(i.amount, pr.amount) as amount, coalesce(i.currency, pr.currency) as currency,",
      "       i.period_end as \"periodEnd\", i.period_start as \"periodStart\",",
      "       i.next_attempt_at as \"nextAttemptAt\"",
      "  from claimed c join billing.subscriptions s on s.id = c.subscription_id",
      "  join billing.products p on p.product_key = s.product_key",
      "  join billing.prices pr on pr.id = s.price_id",
      "  left join billing.subscription_invoices i on i.id = c.invoice_id",
    ].join("\n");
    const result = await client.query<NoticeJob>(sql, [Math.max(1, Math.min(20, Math.trunc(limit)))]);
    return result.rows.filter((job) => Boolean(job.ciphertext && job.keyVersion));
  });
}

async function markNoticeSent(id: string, attemptCount: number, messageId: string): Promise<boolean> {
  return withBillingTransaction(async (client) => {
    const result = await client.query(
      "update billing.subscription_notices set status = 'sent', provider_message_id = $3, sent_at = now(), last_error_code = null where id = $1 and status = 'processing' and attempt_count = $2",
      [id, attemptCount, messageId],
    );
    return (result.rowCount ?? 0) === 1;
  });
}

async function markNoticeFailed(id: string, attemptCount: number, errorCode: string): Promise<void> {
  await withBillingTransaction(async (client) => {
    await client.query(
      "update billing.subscription_notices set status = case when attempt_count >= 10 then 'failed' else 'queued' end, send_after = now() + interval '1 hour', last_error_code = $3 where id = $1 and status = 'processing' and attempt_count = $2",
      [id, attemptCount, errorCode],
    );
  });
}

function messageFor(job: NoticeJob): Readonly<{ subject: string; intro: string; action: string }> {
  const english = job.locale !== "ko";
  switch (job.noticeType) {
    case "subscription_receipt":
      return english
        ? { subject: "Your LUMINA+ payment receipt", intro: "Your payment of " + job.amount.toLocaleString("en-US") + " " + job.currency + " is complete.", action: "Keep this message for your records. Manage or cancel your subscription from your account." }
        : { subject: "LUMINA+ 결제 영수증", intro: job.amount.toLocaleString("ko-KR") + " " + job.currency + " 결제가 완료되었습니다.", action: "이 메일을 결제 내역 확인을 위해 보관하고, 계정에서 구독을 관리할 수 있습니다." };
    case "renewal_reminder":
      return english
        ? { subject: "Your LUMINA+ renewal is coming up", intro: job.productName + " will renew for " + job.amount.toLocaleString("en-US") + " " + job.currency + ".", action: "You can cancel any time from your account before the renewal date." }
        : { subject: "LUMINA+ 구독 갱신 예정 안내", intro: job.productName + " 구독이 " + job.amount.toLocaleString("ko-KR") + " " + job.currency + "에 갱신될 예정입니다.", action: "갱신일 전까지 계정에서 언제든 구독을 취소할 수 있습니다." };
    case "payment_failed_1":
    case "payment_failed_3":
    case "payment_failed_7":
      return english
        ? { subject: "We could not complete your LUMINA+ payment", intro: "A payment of " + job.amount.toLocaleString("en-US") + " " + job.currency + " did not go through.", action: "We will try again on the date below. Cancel from your account to stop future attempts." }
        : { subject: "LUMINA+ 구독 결제가 완료되지 않았습니다", intro: job.amount.toLocaleString("ko-KR") + " " + job.currency + " 결제가 승인되지 않았습니다.", action: "아래 일정에 다시 시도합니다. 이후 결제를 중단하려면 계정에서 구독을 해지해 주세요." };
    case "subscription_ended":
      return english
        ? { subject: "Your LUMINA+ subscription has ended", intro: job.productName + " is no longer active.", action: "You can review your account or subscribe again when the service is available." }
        : { subject: "LUMINA+ 구독이 종료되었습니다", intro: job.productName + " 이용이 종료되었습니다.", action: "계정에서 이용 내역을 확인할 수 있습니다." };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      default: return "&#39;";
    }
  });
}

export async function dispatchSubscriptionNotices(limit = 10): Promise<Readonly<{ claimed: number; sent: number; failed: number }>> {
  if (process.env.APP_ENV !== "production"
    || process.env.SUBSCRIPTION_ENABLED !== "true"
    || process.env.SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED !== "true"
    || process.env.TOSS_BILLING_APPROVED !== "true") {
    throw new Error("subscription_notice_dispatch_disabled");
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SUBSCRIPTION_FROM?.trim();
  const replyTo = validAddress(process.env.BILLING_RECEIPT_REPLY_TO);
  if (!apiKey || !from || /[\r\n]/u.test(from) || from.length > 254) {
    throw new Error("subscription_notice_dispatch_not_configured");
  }
  const jobs = await claimNoticeJobs(limit);
  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      const recipient = await decryptSubscriptionEmail(job.ciphertext, job.subscriptionId, job.keyVersion);
      const content = messageFor(job);
      const detailDate = job.noticeType === "renewal_reminder"
        ? job.periodStart
        : job.noticeType.startsWith("payment_failed_")
          ? job.nextAttemptAt
          : job.periodEnd;
      const date = detailDate
        ? new Intl.DateTimeFormat(intlLocale(job.locale), {
          dateStyle: "long",
          timeZone: "Asia/Seoul",
          }).format(detailDate)
        : "";
      const dateLabel = job.noticeType.startsWith("payment_failed_")
        ? (job.locale !== "ko" ? "Next payment attempt: " : "다음 결제 재시도: ")
        : job.noticeType === "subscription_receipt"
          ? (job.locale !== "ko" ? "Access through: " : "이용 기간: ")
          : (job.locale !== "ko" ? "Renewal date: " : "갱신 예정일: ");
      const details = date ? dateLabel + date : "";
      const accountPath = localePath("/account/subscriptions", job.locale);
      const accountUrl = new URL(accountPath, process.env.NEXT_PUBLIC_SITE_URL).toString();
      const html = "<div style=\"font-family:Arial,sans-serif;line-height:1.7;color:#302c28;max-width:560px;margin:auto\"><h1 style=\"font-size:22px\">LUMINA+</h1><p>" +
        escapeHtml(content.intro) + "</p><p>" + escapeHtml(details) + "</p><p>" + escapeHtml(content.action) +
        "</p><p><a href=\"" + escapeHtml(accountUrl) + "\">" +
        (job.locale !== "ko" ? "Open account" : "계정 열기") + "</a></p></div>";
      const text = ["LUMINA+", content.intro, details, content.action, accountUrl].join("\n\n");
      const result = await resend.emails.send({
        from,
        to: recipient,
        subject: content.subject,
        html,
        text,
        ...(replyTo ? { replyTo } : {}),
      }, { idempotencyKey: "subscription-notice:" + job.id });
      if (result.error || !result.data?.id) {
        await markNoticeFailed(job.id, job.attemptCount, safeErrorCode(result.error?.name));
        failed += 1;
      } else if (await markNoticeSent(job.id, job.attemptCount, result.data.id)) {
        sent += 1;
      }
    } catch {
      try {
        await markNoticeFailed(job.id, job.attemptCount, "provider_error");
      } catch {
        // The claim is eligible for retry after its lease expires.
      }
      failed += 1;
    }
  }
  return { claimed: jobs.length, sent, failed };
}
