import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { serverFeatureFlags } from "@/lib/flags";
import type { Locale } from "@/i18n/locale";
import { getSignedInMember } from "@/server/auth/session";
import { hasRequiredMemberConsents } from "@/server/member/consents";
import { SUBSCRIPTION_PRODUCT_KEYS, type SubscriptionProductKey } from "./catalog";
import { decryptBillingValue, encryptBillingValue, paymentKeyDigest } from "./crypto";
import { getPaymentProvider } from "./paymentProvider";
import { withBillingTransaction } from "./workerDatabase";

export class SubscriptionAccessError extends Error {
  constructor(readonly reason: "authentication_required" | "consent_required" | "subscription_unavailable") {
    super(reason);
    this.name = "SubscriptionAccessError";
  }
}

export class SubscriptionInputError extends Error {
  constructor(readonly reason: "invalid_request" | "product_unavailable" | "subscription_exists" | "subscription_not_found" | "authorization_expired" | "cancellation_unavailable") {
    super(reason);
    this.name = "SubscriptionInputError";
  }
}

export interface SubscriptionSummary {
  readonly id: string;
  readonly productKey: string;
  readonly productName: string;
  readonly status: "pending" | "active" | "past_due" | "cancelled" | "expired";
  readonly periodEnd: string | null;
  readonly cancelAtPeriodEnd: boolean;
}

function hasConfiguredValue(name: string): boolean {
  const value = process.env[name]?.trim();
  return Boolean(value && value.length <= 200 && !/[\r\n]/u.test(value));
}

function salesReady(): boolean {
  return serverFeatureFlags.billing
    && serverFeatureFlags.luminaPlus
    && process.env.SUBSCRIPTION_ENABLED === "true"
    && process.env.BILLING_LEGAL_DOCUMENTS_APPROVED === "true"
    && process.env.SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED === "true"
    && process.env.TOSS_BILLING_APPROVED === "true"
    && hasConfiguredValue("BILLING_DATABASE_URL")
    && hasConfiguredValue("TOSS_CLIENT_KEY")
    && hasConfiguredValue("TOSS_SECRET_KEY")
    && hasConfiguredValue("BILLING_ENCRYPTION_KEY")
    && hasConfiguredValue("BILLING_USER_REF_HMAC_KEY")
    && hasConfiguredValue("BILLING_TERMS_VERSION")
    && hasConfiguredValue("BILLING_WITHDRAWAL_NOTICE_VERSION")
    && hasConfiguredValue("MEMBER_TRANSFER_VERSION")
    && hasConfiguredValue("SUBSCRIPTION_TERMS_VERSION")
    && hasConfiguredValue("SUBSCRIPTION_RENEWAL_NOTICE_VERSION")
    && hasConfiguredValue("SUBSCRIPTION_RENEWAL_PRICE_VERSION")
    && hasConfiguredValue("RESEND_API_KEY")
    && hasConfiguredValue("SUBSCRIPTION_FROM");
}

function subscriptionWorkerReady(): boolean {
  return process.env.APP_ENV === "production"
    && process.env.SUBSCRIPTION_ENABLED === "true"
    && process.env.TOSS_BILLING_APPROVED === "true"
    && process.env.BILLING_LEGAL_DOCUMENTS_APPROVED === "true"
    && process.env.SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED === "true"
    && hasConfiguredValue("BILLING_DATABASE_URL")
    && hasConfiguredValue("TOSS_SECRET_KEY")
    && hasConfiguredValue("BILLING_ENCRYPTION_KEY")
    && hasConfiguredValue("BILLING_USER_REF_HMAC_KEY");
}

function refFor(userId: string): Buffer {
  const key = process.env.BILLING_USER_REF_HMAC_KEY;
  if (!key || Buffer.byteLength(key, "utf8") < 32 || /[\r\n]/u.test(key)) {
    throw new SubscriptionAccessError("subscription_unavailable");
  }
  return createHmac("sha256", key).update(userId, "utf8").digest();
}

function documentVersion(name: string): string {
  const version = process.env[name]?.trim();
  if (!version || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/u.test(version)) {
    throw new SubscriptionAccessError("subscription_unavailable");
  }
  return version;
}

async function requireMember(forSale: boolean, requireCurrentConsents = true) {
  if (!hasConfiguredValue("BILLING_DATABASE_URL") || (forSale && !salesReady())) {
    throw new SubscriptionAccessError("subscription_unavailable");
  }
  const member = await getSignedInMember();
  if (!member) throw new SubscriptionAccessError("authentication_required");
  if (requireCurrentConsents && !(await hasRequiredMemberConsents(member.user.id))) {
    throw new SubscriptionAccessError("consent_required");
  }
  return { id: member.user.id, email: member.user.email };
}

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new SubscriptionAccessError("subscription_unavailable");
  const site = new URL(raw);
  if (site.username || site.password || site.pathname !== "/" || site.search || site.hash
    || (process.env.APP_ENV !== "development" && site.protocol !== "https:")) {
    throw new SubscriptionAccessError("subscription_unavailable");
  }
  return site.origin;
}

export async function getActiveLuminaPlusSale(): Promise<Readonly<{
  monthly: Readonly<{ amount: number; currency: "KRW"; nameKo: string; nameEn: string }>;
  yearly: Readonly<{ amount: number; currency: "KRW"; nameKo: string; nameEn: string }>;
}> | null> {
  if (!salesReady()) return null;
  try {
    return await withBillingTransaction(async (client) => {
      const result = await client.query<{
        product_key: SubscriptionProductKey;
        amount: number;
        currency: string;
        name_ko: string;
        name_en: string;
      }>(
        `select p.product_key, pr.amount, pr.currency, p.name_ko, p.name_en
           from billing.products p
           join billing.prices pr on pr.product_key = p.product_key and pr.product_type = p.product_type
          where p.product_key = any($1::text[]) and p.product_type = 'subscription'
            and p.enabled and p.license_status = 'verified' and pr.enabled and pr.currency = 'KRW'
            and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
          order by pr.valid_from desc`,
        [SUBSCRIPTION_PRODUCT_KEYS],
      );
      const byProduct = new Map(result.rows.map((row) => [row.product_key, row] as const));
      const monthly = byProduct.get("lumina-plus-monthly");
      const yearly = byProduct.get("lumina-plus-yearly");
      if (!monthly || !yearly || monthly.currency !== "KRW" || yearly.currency !== "KRW") return null;
      return {
        monthly: { amount: monthly.amount, currency: "KRW", nameKo: monthly.name_ko, nameEn: monthly.name_en },
        yearly: { amount: yearly.amount, currency: "KRW", nameKo: yearly.name_ko, nameEn: yearly.name_en },
      };
    });
  } catch {
    return null;
  }
}

export async function createPendingSubscription(input: Readonly<{
  productKey: SubscriptionProductKey;
  locale: Locale;
  acceptedSubscriptionTerms: true;
  acceptedAutomaticRenewal: true;
  acceptedRenewalPrice: true;
}>): Promise<Readonly<{ subscriptionId: string; customerKey: string; clientKey: string; successUrl: string; failUrl: string }>> {
  const member = await requireMember(true);
  if (!input.acceptedSubscriptionTerms || !input.acceptedAutomaticRenewal || !input.acceptedRenewalPrice) {
    throw new SubscriptionInputError("invalid_request");
  }
  const termsVersion = documentVersion("SUBSCRIPTION_TERMS_VERSION");
  const renewalVersion = documentVersion("SUBSCRIPTION_RENEWAL_NOTICE_VERSION");
  const priceVersion = documentVersion("SUBSCRIPTION_RENEWAL_PRICE_VERSION");
  const origin = siteOrigin();
  const clientKey = process.env.TOSS_CLIENT_KEY;
  if (!clientKey) throw new SubscriptionAccessError("subscription_unavailable");
  const subscriptionId = randomUUID();
  const customerKey = randomBytes(24).toString("base64url");
  const email = encryptBillingValue(member.email, "receipt-email", subscriptionId);

  try {
    await withBillingTransaction(async (client) => {
      const productResult = await client.query<{
        price_id: string;
        product_key: SubscriptionProductKey;
        product_name: string;
      }>(
        `select pr.id::text as price_id, p.product_key,
                case when $2 = 'ko' then p.name_ko else p.name_en end as product_name
           from billing.products p
           join billing.prices pr on pr.product_key = p.product_key and pr.product_type = p.product_type
          where p.product_key = $1 and p.product_type = 'subscription'
            and p.enabled and p.license_status = 'verified' and pr.enabled and pr.currency = 'KRW'
            and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
          order by pr.valid_from desc limit 1`,
        [input.productKey, input.locale],
      );
      const product = productResult.rows[0];
      if (!product) throw new SubscriptionInputError("product_unavailable");

      const existing = await client.query<{ id: string }>(
        `select id::text from billing.subscriptions
          where user_id = $1 and product_key = $2 and status in ('pending', 'active', 'past_due')
          limit 1 for update`,
        [member.id, product.product_key],
      );
      if (existing.rows[0]) throw new SubscriptionInputError("subscription_exists");

      await client.query(
        `insert into billing.subscriptions
          (id, user_id, user_ref_hmac, product_key, price_id, provider, provider_customer_id,
           status, receipt_email_ciphertext, receipt_email_key_version, receipt_locale)
         values ($1, $2, $3, $4, $5, 'toss', $6, 'pending', $7, $8, $9)`,
        [subscriptionId, member.id, refFor(member.id), product.product_key, product.price_id, customerKey,
          email.ciphertext, email.keyVersion, input.locale],
      );
      for (const [consentType, version] of [
        ["subscription_terms", termsVersion],
        ["automatic_renewal", renewalVersion],
        ["renewal_price", priceVersion],
      ] as const) {
        await client.query(
          `insert into billing.subscription_consents (subscription_id, consent_type, document_version)
           values ($1, $2, $3)`,
          [subscriptionId, consentType, version],
        );
      }
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, $2, 'subscription.checkout_started', 'subscription', $3, $4)`,
        [member.id, refFor(member.id), subscriptionId, product.product_key],
      );
    });
  } catch (error) {
    if (error instanceof SubscriptionInputError) throw error;
    if (error instanceof Error && "code" in error && error.code === "23505") {
      throw new SubscriptionInputError("subscription_exists");
    }
    throw error;
  }

  const successUrl = new URL("/api/billing/toss/billing/return", origin);
  successUrl.searchParams.set("subscriptionId", subscriptionId);
  const failUrl = new URL("/api/billing/toss/billing/fail", origin);
  failUrl.searchParams.set("subscriptionId", subscriptionId);
  return { subscriptionId, customerKey, clientKey, successUrl: successUrl.toString(), failUrl: failUrl.toString() };
}

export async function completeSubscriptionBillingAuthorization(input: Readonly<{
  subscriptionId: string;
  authKey: string;
  customerKey: string;
}>): Promise<void> {
  const member = await requireMember(false);
  if (!subscriptionWorkerReady()) throw new SubscriptionAccessError("subscription_unavailable");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.subscriptionId)
    || input.authKey.length < 1 || input.authKey.length > 300
    || input.customerKey.length < 2 || input.customerKey.length > 50) {
    throw new SubscriptionInputError("invalid_request");
  }

  const provider = await getPaymentProvider();
  if (provider.id !== "toss") throw new SubscriptionAccessError("subscription_unavailable");
  let issuedBillingKey: string | null = null;
  const claim = await withBillingTransaction(async (client) => {
    const result = await client.query<{ provider_customer_id: string }>(
      `update billing.subscriptions
          set billing_auth_claimed_at = now(), updated_at = now()
        where id = $1 and user_id = $2 and status = 'pending'
          and provider = 'toss' and provider_customer_id = $3
          and billing_key_ciphertext is null
          and (billing_auth_claimed_at is null or billing_auth_claimed_at < now() - interval '10 minutes')
      returning provider_customer_id`,
      [input.subscriptionId, member.id, input.customerKey],
    );
    return result.rows[0] ?? null;
  });
  if (!claim || claim.provider_customer_id !== input.customerKey) {
    throw new SubscriptionInputError("authorization_expired");
  }

  try {
    const authorization = await provider.issueBillingKey({ authKey: input.authKey, customerKey: input.customerKey });
    issuedBillingKey = authorization.billingKey;
    if (authorization.customerKey !== input.customerKey) throw new SubscriptionInputError("authorization_expired");
    const encrypted = encryptBillingValue(authorization.billingKey, "payment-key", input.subscriptionId);
    await withBillingTransaction(async (client) => {
      const priceResult = await client.query<{ amount: number; billing_interval: "month" | "year"; product_name: string }>(
        `select pr.amount, pr.billing_interval,
                case when s.receipt_locale = 'ko' then p.name_ko else p.name_en end as product_name
           from billing.subscriptions s
           join billing.products p on p.product_key = s.product_key
           join billing.prices pr on pr.id = s.price_id
          where s.id = $1 and s.user_id = $2 and s.status = 'pending' and s.billing_auth_claimed_at is not null
          for update of s`,
        [input.subscriptionId, member.id],
      );
      const price = priceResult.rows[0];
      if (!price || (price.billing_interval !== "month" && price.billing_interval !== "year")) {
        throw new SubscriptionInputError("authorization_expired");
      }
      const updated = await client.query(
        `update billing.subscriptions
            set billing_key_ciphertext = $3, billing_key_version = $4, billing_auth_claimed_at = null, updated_at = now()
          where id = $1 and user_id = $2 and status = 'pending' and billing_key_ciphertext is null`,
        [input.subscriptionId, member.id, encrypted.ciphertext, encrypted.keyVersion],
      );
      if ((updated.rowCount ?? 0) !== 1) throw new SubscriptionInputError("authorization_expired");
      await client.query(
        `insert into billing.subscription_invoices
          (subscription_id, period_start, period_end, due_at, amount, currency, next_attempt_at)
         values ($1, now(), now() + case when $3 = 'month' then interval '1 month' else interval '1 year' end,
                 now(), $2, 'KRW', now())
         on conflict (subscription_id, period_start, period_end) do nothing`,
        [input.subscriptionId, price.amount, price.billing_interval],
      );
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, $2, 'subscription.billing_method_registered', 'subscription', $3, 'toss_billing')`,
        [member.id, refFor(member.id), input.subscriptionId],
      );
    });
  } catch (error) {
    if (issuedBillingKey) await provider.deleteBillingKey(issuedBillingKey).catch(() => undefined);
    await withBillingTransaction(async (client) => {
      await client.query(
        `update billing.subscriptions set billing_auth_claimed_at = null, updated_at = now()
          where id = $1 and user_id = $2 and status = 'pending' and billing_key_ciphertext is null`,
        [input.subscriptionId, member.id],
      );
    }).catch(() => undefined);
    throw error;
  }
}

export async function listOwnSubscriptions(): Promise<readonly SubscriptionSummary[]> {
  const member = await requireMember(false, false);
  return withBillingTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      product_key: string;
      product_name: string;
      status: SubscriptionSummary["status"];
      current_period_end: Date | null;
      cancel_at_period_end: boolean;
    }>(
      `select s.id::text, s.product_key,
              case when s.receipt_locale = 'ko' then p.name_ko else p.name_en end as product_name,
              s.status, s.current_period_end, s.cancel_at_period_end
         from billing.subscriptions s
         join billing.products p on p.product_key = s.product_key
        where s.user_id = $1
        order by s.created_at desc limit 20`,
      [member.id],
    );
    return result.rows.map((row) => ({
      id: row.id,
      productKey: row.product_key,
      productName: row.product_name,
      status: row.status,
      periodEnd: row.current_period_end?.toISOString() ?? null,
      cancelAtPeriodEnd: row.cancel_at_period_end,
    }));
  });
}

export async function cancelOwnSubscription(subscriptionId: string): Promise<"cancelled" | "scheduled" | "processing"> {
  const member = await requireMember(false, false);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(subscriptionId)) {
    throw new SubscriptionInputError("subscription_not_found");
  }
  return withBillingTransaction(async (client) => {
    const result = await client.query<{
      status: SubscriptionSummary["status"];
      current_period_end: Date | null;
      cancel_at_period_end: boolean;
      invoice_processing: boolean;
    }>(
      `select s.status, s.current_period_end, s.cancel_at_period_end,
              exists (select 1 from billing.subscription_invoices i
                       where i.subscription_id = s.id and i.status = 'processing') as invoice_processing
         from billing.subscriptions
          s where s.id = $1 and s.user_id = $2
        for update`,
      [subscriptionId, member.id],
    );
    const subscription = result.rows[0];
    if (!subscription) throw new SubscriptionInputError("subscription_not_found");
    if (subscription.status === "cancelled" || subscription.status === "expired") return "cancelled";
    if (subscription.cancel_at_period_end) return "scheduled";
    if (!["pending", "active", "past_due"].includes(subscription.status)) {
      throw new SubscriptionInputError("cancellation_unavailable");
    }

    if (subscription.status === "pending" && subscription.invoice_processing) {
      await client.query(
        `update billing.subscriptions
            set cancel_at_period_end = true, cancellation_requested_at = now(), updated_at = now()
          where id = $1 and user_id = $2`,
        [subscriptionId, member.id],
      );
      await client.query(
        `update billing.subscription_invoices set status = 'void', updated_at = now()
          where subscription_id = $1 and status = 'queued'`,
        [subscriptionId],
      );
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, $2, 'subscription.cancellation_scheduled', 'subscription', $3, 'initial_payment_processing')`,
        [member.id, refFor(member.id), subscriptionId],
      );
      return "processing";
    }
    if (subscription.status === "pending" || !subscription.current_period_end) {
      await client.query(
        `update billing.subscriptions
            set status = 'cancelled', cancel_at_period_end = false,
                cancelled_at = now(), cancellation_requested_at = now(), updated_at = now()
          where id = $1 and user_id = $2`,
        [subscriptionId, member.id],
      );
      await client.query(
        `update billing.subscription_invoices set status = 'void', updated_at = now()
          where subscription_id = $1 and status = 'queued'`,
        [subscriptionId],
      );
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, $2, 'subscription.cancelled', 'subscription', $3, 'member_request')`,
        [member.id, refFor(member.id), subscriptionId],
      );
      return "cancelled";
    }

    await client.query(
      `update billing.subscriptions
          set cancel_at_period_end = true, cancellation_requested_at = now(), updated_at = now()
        where id = $1 and user_id = $2`,
      [subscriptionId, member.id],
    );
    await client.query(
      `update billing.subscription_invoices set status = 'void', updated_at = now()
        where subscription_id = $1 and status = 'queued'`,
      [subscriptionId],
    );
    await client.query(
      `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
       values ($1, $2, 'subscription.cancellation_scheduled', 'subscription', $3, 'member_request')`,
      [member.id, refFor(member.id), subscriptionId],
    );
    return "scheduled";
  });
}

export async function processDueSubscriptionInvoices(limit = 3): Promise<Readonly<{ checked: number; paid: number; failed: number }>> {
  if (!subscriptionWorkerReady()) throw new SubscriptionAccessError("subscription_unavailable");
  const provider = await getPaymentProvider();
  if (provider.id !== "toss") throw new SubscriptionAccessError("subscription_unavailable");
  const max = Math.max(1, Math.min(3, Math.trunc(limit)));
  let checked = 0;
  let paid = 0;
  let failed = 0;

  for (let index = 0; index < max; index += 1) {
    const claim = await withBillingTransaction(async (client) => {
      const result = await client.query<{
        invoice_id: string;
        subscription_id: string;
        user_id: string;
        user_ref_hmac: Buffer;
        product_key: SubscriptionProductKey;
        price_id: string;
        order_name: string;
        customer_key: string;
        billing_key_ciphertext: string;
        billing_key_version: number;
        receipt_email_ciphertext: string;
        receipt_email_key_version: number;
        amount: number;
        period_end: Date;
        attempt_count: number;
        locale: Locale;
      }>(
        `with due as (
           select i.id
             from billing.subscription_invoices i
             join billing.subscriptions s on s.id = i.subscription_id
            where (
                (i.status = 'queued' and i.next_attempt_at <= now() and not s.cancel_at_period_end)
                or (i.status = 'processing' and i.last_attempt_at < now() - interval '90 seconds')
              )
              and s.status in ('pending', 'active', 'past_due')
              and s.billing_key_ciphertext is not null
            order by i.next_attempt_at, i.created_at
            for update of i skip locked
            limit 1
         )
         update billing.subscription_invoices i
            set status = 'processing',
                attempt_count = case when i.status = 'queued' then i.attempt_count + 1 else i.attempt_count end,
                last_attempt_at = now(), updated_at = now()
           from due, billing.subscriptions s, billing.products p
          where i.id = due.id and s.id = i.subscription_id and p.product_key = s.product_key
         returning i.id::text as invoice_id, s.id::text as subscription_id, s.user_id,
           s.user_ref_hmac, s.product_key, s.price_id::text as price_id, i.period_end,
           case when s.receipt_locale = 'ko' then p.name_ko else p.name_en end as order_name,
           s.provider_customer_id as customer_key, s.billing_key_ciphertext, s.billing_key_version,
           s.receipt_email_ciphertext, s.receipt_email_key_version, i.amount,
           i.attempt_count, s.receipt_locale as locale`,
        [],
      );
      const row = result.rows[0];
      if (!row?.user_id || !row.billing_key_ciphertext || !row.billing_key_version
        || !row.receipt_email_ciphertext || !row.receipt_email_key_version || !row.customer_key) return null;
      return row;
    });
    if (!claim) break;
    checked += 1;

    let payment;
    try {
      const billingKey = decryptBillingValue(
        claim.billing_key_ciphertext,
        "payment-key",
        claim.subscription_id,
        claim.billing_key_version,
      );
      const email = decryptBillingValue(
        claim.receipt_email_ciphertext,
        "receipt-email",
        claim.subscription_id,
        claim.receipt_email_key_version,
      );
      payment = await provider.chargeBillingKey({
        billingKey,
        customerKey: claim.customer_key,
        orderId: claim.invoice_id,
        orderName: claim.order_name,
        amount: claim.amount,
        customerEmail: email,
      }, `subscription:${claim.invoice_id}:${claim.attempt_count}`);
      if (payment.orderId !== claim.invoice_id || payment.totalAmount !== claim.amount
        || payment.currency !== "KRW" || payment.status !== "DONE") {
        throw new Error("provider_payment_mismatch");
      }
    } catch (error) {
      const code = error instanceof Error && error.message === "provider_payment_mismatch"
        ? "provider_payment_mismatch"
        : error instanceof Error && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]{2,60}$/u.test(error.code)
          ? error.code.toLowerCase()
          : "provider_unavailable";
      const attempt = claim.attempt_count;
      await withBillingTransaction(async (client) => {
        const isFinal = attempt >= 4;
        const nextDays = attempt === 1 ? 1 : attempt === 2 ? 2 : 4;
        await client.query(
          `update billing.subscription_invoices
              set status = $2,
                  next_attempt_at = case when $2 = 'queued' then now() + ($3::text || ' days')::interval else next_attempt_at end,
                  last_failure_code = $4, updated_at = now()
            where id = $1 and status = 'processing'`,
          [claim.invoice_id, isFinal ? "failed" : "queued", nextDays, code],
        );
        await client.query(
          `update billing.subscriptions set status = $2, updated_at = now()
            where id = $1 and status in ('pending', 'active', 'past_due')`,
          [claim.subscription_id, isFinal ? "expired" : "past_due"],
        );
        if (!isFinal) {
          const noticeType = attempt === 1 ? "payment_failed_1" : attempt === 2 ? "payment_failed_3" : "payment_failed_7";
          await client.query(
            `insert into billing.subscription_notices (subscription_id, invoice_id, notice_type, send_after)
             values ($1, $2, $3, now() + ($4::text || ' days')::interval)
             on conflict do nothing`,
            [claim.subscription_id, claim.invoice_id, noticeType, nextDays],
          );
        } else {
          await client.query(
            `insert into billing.subscription_notices (subscription_id, invoice_id, notice_type, send_after)
             values ($1, $2, 'subscription_ended', now()) on conflict do nothing`,
            [claim.subscription_id, claim.invoice_id],
          );
        }
      });
      failed += 1;
      continue;
    }

    const encryptedKey = encryptBillingValue(payment.paymentKey, "payment-key", claim.invoice_id);
    await withBillingTransaction(async (client) => {
      const current = await client.query<{ status: SubscriptionSummary["status"]; user_id: string | null }>(
        `select status, user_id from billing.subscriptions where id = $1 for update`,
        [claim.subscription_id],
      );
      const subscription = current.rows[0];
      if (!subscription || subscription.user_id !== claim.user_id
        || subscription.status === "cancelled" || subscription.status === "expired") {
        throw new Error("subscription_state_changed");
      }
      const order = await client.query<{ id: string }>(
        `insert into billing.orders
          (id, subscription_invoice_id, user_id, user_ref_hmac, product_key, price_id, provider,
           product_name_snapshot, amount, currency, status, expires_at, paid_at)
         values ($1, $1, $2, $3, $4, $5, 'toss', $6, $7, 'KRW', 'paid', now() + interval '30 minutes', now())
         on conflict (subscription_invoice_id) do nothing
         returning id::text`,
        [claim.invoice_id, claim.user_id, claim.user_ref_hmac, claim.product_key, claim.price_id,
          claim.order_name, claim.amount],
      );
      if (!order.rows[0]) throw new Error("subscription_order_not_created");
      const paymentRecord = await client.query<{ id: string }>(
        `insert into billing.payments
          (order_id, provider, provider_payment_key_ciphertext, provider_payment_key_digest, key_version,
           amount, currency, method, status, provider_transaction_id, approved_at)
         values ($1, 'toss', $2, $3, $4, $5, 'KRW', $6, 'approved', $7, $8)
         on conflict (order_id) do nothing
         returning id::text`,
        [claim.invoice_id, encryptedKey.ciphertext, paymentKeyDigest(payment.paymentKey), encryptedKey.keyVersion,
          claim.amount, payment.method, payment.lastTransactionKey ?? null,
          payment.approvedAt ? new Date(payment.approvedAt) : null],
      );
      const paymentId = paymentRecord.rows[0]?.id ?? (await client.query<{ id: string }>(
        `select id::text from billing.payments where order_id = $1`,
        [claim.invoice_id],
      )).rows[0]?.id;
      if (!paymentId) throw new Error("subscription_payment_not_created");
      await client.query(
        `insert into billing.subscription_payments
          (invoice_id, payment_id, provider, amount, currency, method, status, provider_transaction_id, approved_at)
         values ($1, $2, 'toss', $3, 'KRW', $4, 'approved', $5, $6)
         on conflict (invoice_id) do nothing`,
        [claim.invoice_id, paymentId, claim.amount, payment.method, payment.lastTransactionKey ?? null,
          payment.approvedAt ? new Date(payment.approvedAt) : null],
      );
      await client.query(
        `insert into billing.entitlements (user_id, user_ref_hmac, product_key, order_id, expires_at)
         values ($1, $2, $3, $4, $5)
         on conflict (order_id) do nothing`,
        [claim.user_id, claim.user_ref_hmac, claim.product_key, claim.invoice_id, claim.period_end],
      );
      await client.query(
        `update billing.subscription_invoices
            set status = 'paid', paid_at = now(), last_failure_code = null, updated_at = now()
          where id = $1 and status = 'processing'`,
        [claim.invoice_id],
      );
      await client.query(
        `insert into billing.subscription_notices (subscription_id, invoice_id, notice_type, send_after)
         values ($1, $2, 'subscription_receipt', now()) on conflict do nothing`,
        [claim.subscription_id, claim.invoice_id],
      );
      await client.query(
        `update billing.subscriptions s
            set status = 'active', current_period_start = i.period_start, current_period_end = i.period_end,
                updated_at = now()
           from billing.subscription_invoices i
          where i.id = $1 and s.id = i.subscription_id`,
        [claim.invoice_id],
      );
    });
    paid += 1;
  }

  return { checked, paid, failed };
}

export async function decryptSubscriptionEmail(ciphertext: string, subscriptionId: string, version: number): Promise<string> {
  return decryptBillingValue(ciphertext, "receipt-email", subscriptionId, version);
}

export async function queueSubscriptionRenewals(limit = 50): Promise<number> {
  if (!subscriptionWorkerReady()) throw new SubscriptionAccessError("subscription_unavailable");
  const max = Math.max(1, Math.min(100, Math.trunc(limit)));
  return withBillingTransaction(async (client) => {
    const due = await client.query<{
      id: string;
      user_id: string;
      user_ref_hmac: Buffer;
      product_key: string;
      billing_interval: "month" | "year";
      amount: number;
      period_end: Date;
    }>(
      `select s.id::text, s.user_id, s.user_ref_hmac, s.product_key, pr.billing_interval,
              pr.amount, s.current_period_end as period_end
         from billing.subscriptions s
         join billing.prices pr on pr.id = s.price_id
        where s.status = 'active' and not s.cancel_at_period_end
          and s.current_period_end > now()
          and s.current_period_end <= now() + interval '7 days'
          and s.billing_key_ciphertext is not null
          and pr.billing_interval in ('month', 'year')
          and not exists (
            select 1 from billing.subscription_invoices i
             where i.subscription_id = s.id and i.period_start = s.current_period_end
          )
        order by s.current_period_end
        for update of s skip locked
        limit $1`,
      [max],
    );
    let queued = 0;
    for (const subscription of due.rows) {
      const periodEnd = new Date(subscription.period_end);
      const invoice = await client.query<{ id: string }>(
        `insert into billing.subscription_invoices
          (subscription_id, period_start, period_end, due_at, amount, currency, next_attempt_at)
         values ($1, $2, $2 + case when $4 = 'month' then interval '1 month' else interval '1 year' end,
                 $2, $3, 'KRW', $2)
         on conflict (subscription_id, period_start, period_end) do nothing
         returning id::text`,
        [subscription.id, periodEnd, subscription.amount, subscription.billing_interval],
      );
      if (invoice.rows[0]) {
        await client.query(
          `insert into billing.subscription_notices (subscription_id, invoice_id, notice_type, send_after)
           values ($1, $2, 'renewal_reminder', now())
           on conflict do nothing`,
          [subscription.id, invoice.rows[0].id],
        );
        await client.query(
          `insert into billing.audit_events (actor_ref_hmac, action, entity_type, entity_id, reason_code)
           values ($1, 'subscription.renewal_queued', 'subscription', $2, $3)`,
          [subscription.user_ref_hmac, subscription.id, subscription.product_key],
        );
        queued += 1;
      }
    }
    return queued;
  });
}

export async function expireCancelledSubscriptions(limit = 50): Promise<number> {
  if (!subscriptionWorkerReady()) throw new SubscriptionAccessError("subscription_unavailable");
  const max = Math.max(1, Math.min(100, Math.trunc(limit)));
  return withBillingTransaction(async (client) => {
    const result = await client.query<{ id: string; user_ref_hmac: Buffer }>(
      `with ended as (
         select id
           from billing.subscriptions
          where status in ('active', 'past_due') and cancel_at_period_end
            and current_period_end <= now()
          order by current_period_end
          for update skip locked
          limit $1
       )
       update billing.subscriptions s
          set status = 'expired', cancelled_at = coalesce(cancelled_at, now()), updated_at = now()
         from ended
        where s.id = ended.id
       returning s.id::text, s.user_ref_hmac`,
      [max],
    );
    for (const subscription of result.rows) {
      await client.query(
        `insert into billing.subscription_notices (subscription_id, notice_type, send_after)
         values ($1, 'subscription_ended', now()) on conflict do nothing`,
        [subscription.id],
      );
      await client.query(
        `insert into billing.audit_events (actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, 'subscription.ended', 'subscription', $2, 'period_end')`,
        [subscription.user_ref_hmac, subscription.id],
      );
    }
    return result.rowCount ?? 0;
  });
}

export async function expireStalePendingSubscriptions(limit = 50): Promise<number> {
  if (!subscriptionWorkerReady()) throw new SubscriptionAccessError("subscription_unavailable");
  const max = Math.max(1, Math.min(100, Math.trunc(limit)));
  return withBillingTransaction(async (client) => {
    const result = await client.query<{ id: string; user_ref_hmac: Buffer }>(
      `with stale as (
         select id
           from billing.subscriptions
          where status = 'pending' and created_at < now() - interval '30 minutes'
          order by created_at
          for update skip locked
          limit $1
       )
       update billing.subscriptions s
          set status = 'cancelled', cancelled_at = now(), cancellation_requested_at = now(), updated_at = now()
         from stale
        where s.id = stale.id
       returning s.id::text, s.user_ref_hmac`,
      [max],
    );
    for (const subscription of result.rows) {
      await client.query(
        `update billing.subscription_invoices set status = 'void', updated_at = now()
          where subscription_id = $1 and status = 'queued'`,
        [subscription.id],
      );
      await client.query(
        `insert into billing.audit_events (actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, 'subscription.pending_expired', 'subscription', $2, 'authorization_timeout')`,
        [subscription.user_ref_hmac, subscription.id],
      );
    }
    return result.rowCount ?? 0;
  });
}

export async function cleanupTerminatedSubscriptionBillingKeys(limit = 5): Promise<number> {
  if (!subscriptionWorkerReady()) throw new SubscriptionAccessError("subscription_unavailable");
  const provider = await getPaymentProvider();
  if (provider.id !== "toss") throw new SubscriptionAccessError("subscription_unavailable");
  const max = Math.max(1, Math.min(10, Math.trunc(limit)));
  const rows = await withBillingTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      billing_key_ciphertext: string;
      billing_key_version: number;
    }>(
      `select id::text, billing_key_ciphertext, billing_key_version
         from billing.subscriptions
        where status in ('cancelled', 'expired') and billing_key_ciphertext is not null
        order by updated_at
        for update skip locked
        limit $1`,
      [max],
    );
    return result.rows;
  });
  let cleaned = 0;
  for (const row of rows) {
    try {
      const billingKey = decryptBillingValue(row.billing_key_ciphertext, "payment-key", row.id, row.billing_key_version);
      await provider.deleteBillingKey(billingKey);
      await withBillingTransaction(async (client) => {
        await client.query(
          `update billing.subscriptions
              set billing_key_ciphertext = null, billing_key_version = null, updated_at = now()
            where id = $1 and status in ('cancelled', 'expired') and billing_key_ciphertext = $2`,
          [row.id, row.billing_key_ciphertext],
        );
      });
      cleaned += 1;
    } catch {
      // Keep the encrypted key so a later scheduled run can retry deletion.
    }
  }
  return cleaned;
}
