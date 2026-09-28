import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { serverFeatureFlags } from "@/lib/flags";
import type { Locale } from "@/i18n/locale";
import { getSignedInMember } from "@/server/auth/session";
import { hasRequiredMemberConsents } from "@/server/member/consents";
import { withMemberTransaction } from "@/server/member/database";
import { isOneTimeProductKey, PRODUCT_CATALOG, type OneTimeProductKey, type ProductKey } from "./catalog";
import { decryptBillingValue, encryptBillingValue, encryptPaymentKey, paymentKeyDigest } from "./crypto";
import { isSelfServiceRefundEligible } from "./refundPolicy";
import type { TossPayment } from "./toss";
import { withBillingTransaction } from "./workerDatabase";

// getActiveSaju2027Sale() below is inherently single-product by name and design.
// Typed against the catalog's OneTimeProductKey union, so removing "saju-2027"
// from the catalog would fail this line at compile time.
const PRODUCT_KEY: OneTimeProductKey = "saju-2027";

export class BillingAccessError extends Error {
  constructor(readonly reason: "authentication_required" | "consent_required" | "billing_unavailable") {
    super(reason);
    this.name = "BillingAccessError";
  }
}

export class BillingInputError extends Error {
  constructor(readonly reason: "product_unavailable" | "order_not_found" | "amount_mismatch" | "payment_state_invalid" | "profile_required" | "refund_unavailable" | "billing_pending_orders") {
    super(reason);
    this.name = "BillingInputError";
  }
}

type Member = Readonly<{ id: string; email: string }>;
type OrderRow = Readonly<{
  id: string;
  user_id: string | null;
  user_ref_hmac: Buffer;
  product_key: string;
  product_name_snapshot: string;
  amount: number;
  currency: string;
  status: string;
  expires_at: Date;
  paid_at: Date | null;
  viewed_at: Date | null;
}>;

function billingStorageReady(): boolean {
  return Boolean(process.env.BILLING_DATABASE_URL?.trim());
}

function billingCheckoutReady(): boolean {
  return billingStorageReady()
    && serverFeatureFlags.billing
    && process.env.BILLING_LEGAL_DOCUMENTS_APPROVED === "true"
    && Boolean(process.env.TOSS_CLIENT_KEY?.trim())
    && Boolean(process.env.TOSS_SECRET_KEY?.trim())
    && Boolean(process.env.BILLING_ENCRYPTION_KEY?.trim())
    && Boolean(process.env.BILLING_USER_REF_HMAC_KEY?.trim())
    && Boolean(process.env.BILLING_TERMS_VERSION?.trim())
    && Boolean(process.env.BILLING_WITHDRAWAL_NOTICE_VERSION?.trim())
    && Boolean(process.env.MEMBER_TRANSFER_VERSION?.trim());
}

async function requireBillingMember(requireCheckout = false): Promise<Member> {
  if (!billingStorageReady() || (requireCheckout && !billingCheckoutReady())) {
    throw new BillingAccessError("billing_unavailable");
  }
  const session = await getSignedInMember();
  if (!session) throw new BillingAccessError("authentication_required");
  if (!(await hasRequiredMemberConsents(session.user.id))) throw new BillingAccessError("consent_required");
  return { id: session.user.id, email: session.user.email };
}

function userReference(userId: string): Buffer {
  const key = billingHmacKey();
  return createHmac("sha256", key).update(userId, "utf8").digest();
}

function billingHmacKey(): string {
  const key = process.env.BILLING_USER_REF_HMAC_KEY;
  if (!key || Buffer.byteLength(key, "utf8") < 32 || /[\r\n]/u.test(key)) {
    throw new Error("BILLING_USER_REF_HMAC_KEY is not configured");
  }
  return key;
}

function requiredDocumentVersion(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.length > 100 || /[\r\n]/u.test(value)) throw new BillingAccessError("billing_unavailable");
  return value;
}

export interface CreateOrderInput {
  readonly productKey: OneTimeProductKey;
  readonly locale: Locale;
  readonly acceptedPurchaseTerms: true;
  readonly acceptedWithdrawalNotice: true;
  readonly acceptedEuWithdrawalWaiver: boolean;
  readonly countryCode: string | null;
}

export interface ReconcileOrder {
  readonly id: string;
  readonly expiresAt: Date;
}

export interface ReceiptEmailJob {
  readonly orderId: string;
  readonly attemptCount: number;
  readonly ciphertext: string | null;
  readonly keyVersion: number | null;
  readonly locale: Locale;
  readonly productName: string;
  readonly amount: number;
  readonly currency: string;
  readonly paidAt: Date;
}

export interface CreatedOrder {
  readonly orderId: string;
  readonly orderName: string;
  readonly amount: number;
  readonly currency: "KRW";
  readonly customerKey: string;
  readonly clientKey: string;
  readonly successUrl: string;
  readonly failUrl: string;
}

export interface ActiveSaju2027Sale {
  readonly amount: number;
  readonly currency: "KRW";
  readonly nameKo: string;
  readonly nameEn: string;
}

export interface BillingOrderSummary {
  readonly id: string;
  readonly productKey: string;
  readonly productName: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly createdAt: string;
  readonly paidAt: string | null;
  readonly viewedAt: string | null;
  readonly canSelfRefund: boolean;
}

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export async function createPendingOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const member = await requireBillingMember(true);
  if (!isOneTimeProductKey(input.productKey)) throw new BillingInputError("product_unavailable");
  if (!input.acceptedPurchaseTerms || !input.acceptedWithdrawalNotice) throw new BillingInputError("payment_state_invalid");
  const requiresEuWaiver = input.countryCode !== null && EU_COUNTRIES.has(input.countryCode);
  if (requiresEuWaiver && !input.acceptedEuWithdrawalWaiver) {
    throw new BillingInputError("payment_state_invalid");
  }

  const termsVersion = requiredDocumentVersion("BILLING_TERMS_VERSION");
  const withdrawalVersion = requiredDocumentVersion("BILLING_WITHDRAWAL_NOTICE_VERSION");
  const transferVersion = requiredDocumentVersion("MEMBER_TRANSFER_VERSION");
  const euWaiverVersion = requiresEuWaiver
    ? requiredDocumentVersion("BILLING_EU_WITHDRAWAL_WAIVER_VERSION")
    : null;

  const order = await withMemberTransaction(member.id, async (client) => {
    const profileResult = await client.query<{ id: string }>(
      `select id::text from member.profiles where user_id = $1 and source_key = 'local-default' limit 1`,
      [member.id],
    );
    if (!profileResult.rows[0]) throw new BillingInputError("profile_required");

    const productResult = await client.query<{
      id: string;
      product_key: string;
      name_ko: string;
      name_en: string;
      amount: number;
      currency: string;
    }>(
      `select pr.id::text, p.product_key, p.name_ko, p.name_en, pr.amount, pr.currency
         from billing.products p
         join billing.prices pr on pr.product_key = p.product_key and pr.product_type = p.product_type
        where p.product_key = $1 and p.product_type = 'one_time'
          and p.enabled and p.license_status = 'verified' and pr.enabled and pr.currency = 'KRW'
          and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
        order by pr.valid_from desc
        limit 1`,
      [input.productKey],
    );
    const price = productResult.rows[0];
    if (!price || price.currency !== "KRW") throw new BillingInputError("product_unavailable");

    const orderId = randomUUID();
    const orderName = input.locale !== "ko" ? price.name_en : price.name_ko;
    const receiptEmail = encryptBillingValue(member.email, "receipt-email", orderId);
    const orderResult = await client.query<{ id: string }>(
      `insert into billing.orders
        (id, user_id, user_ref_hmac, product_key, price_id, provider, product_name_snapshot, amount, currency,
         receipt_email_ciphertext, receipt_email_key_version, receipt_locale, expires_at)
       values ($1, $2, $3, $4, $5, 'toss', $6, $7, $8, $9, $10, $11, now() + interval '30 minutes')
       returning id::text`,
      [orderId, member.id, userReference(member.id), price.product_key, price.id, orderName, price.amount, price.currency,
        receiptEmail.ciphertext, receiptEmail.keyVersion, input.locale],
    );
    const created = orderResult.rows[0];
    if (!created) throw new Error("Pending order was not created");

    const consents = [
      ["purchase_terms", termsVersion],
      ["withdrawal_restriction", withdrawalVersion],
      ["overseas_transfer", transferVersion],
      ...(euWaiverVersion ? [["eu_withdrawal_waiver", euWaiverVersion]] : []),
    ] as const;
    for (const [consentType, version] of consents) {
      await client.query(
        `insert into billing.order_consents (order_id, consent_type, document_version)
         values ($1, $2, $3)`,
        [orderId, consentType, version],
      );
    }
    return { orderId, orderName, amount: price.amount, currency: "KRW" as const };
  });

  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteOrigin) throw new BillingAccessError("billing_unavailable");
  const siteUrl = new URL(siteOrigin);
  if (siteUrl.username || siteUrl.password || siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash
    || (process.env.APP_ENV !== "development" && siteUrl.protocol !== "https:")) {
    throw new BillingAccessError("billing_unavailable");
  }
  const successUrl = new URL("/api/billing/toss/return", siteUrl.origin);
  const failUrl = new URL("/api/billing/toss/fail", siteUrl.origin);
  const customerKey = createHmac("sha256", billingHmacKey())
    .update(`toss-customer:${member.id}`)
    .digest("base64url");

  return {
    ...order,
    customerKey,
    clientKey: process.env.TOSS_CLIENT_KEY as string,
    successUrl: successUrl.toString(),
    failUrl: failUrl.toString(),
  };
}

export async function getOwnOrder(orderId: string): Promise<Readonly<{
  id: string;
  amount: number;
  currency: string;
  status: string;
}>> {
  const member = await requireBillingMember();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(orderId)) {
    throw new BillingInputError("order_not_found");
  }
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<{ id: string; amount: number; currency: string; status: string }>(
      `select id::text, amount, currency, status from billing.orders where id = $1 and user_id = $2 limit 1`,
      [orderId, member.id],
    );
    const order = result.rows[0];
    if (!order) throw new BillingInputError("order_not_found");
    return order;
  });
}

export async function listOwnBillingOrders(): Promise<readonly BillingOrderSummary[]> {
  const member = await requireBillingMember();
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<{
      id: string;
      product_key: string;
      product_name_snapshot: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
      paid_at: string | null;
      viewed_at: string | null;
      can_self_refund: boolean;
    }>(
      `select id::text, product_key, product_name_snapshot, amount, currency, status,
              created_at::text, paid_at::text, viewed_at::text,
              status = 'paid' and viewed_at is null and paid_at between now() - interval '7 days' and now() as can_self_refund
         from billing.orders where user_id = $1 and subscription_invoice_id is null
        order by created_at desc limit 100`,
      [member.id],
    );
    return result.rows.map((row) => ({
      id: row.id,
      productKey: row.product_key,
      productName: row.product_name_snapshot,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      viewedAt: row.viewed_at,
      canSelfRefund: row.can_self_refund,
    }));
  });
}

export async function listBillingAdminOrders(): Promise<readonly Readonly<{
  id: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  viewedAt: string | null;
  userRef: string;
}>[]> {
  if (!billingStorageReady()) throw new BillingAccessError("billing_unavailable");
  return withBillingTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      product_name_snapshot: string;
      amount: number;
      currency: string;
      status: string;
      created_at: string;
      paid_at: string | null;
      viewed_at: string | null;
      user_ref: string;
    }>(
      `select o.id::text, o.product_name_snapshot, o.amount, o.currency, o.status,
              o.created_at::text, o.paid_at::text, o.viewed_at::text,
              encode(o.user_ref_hmac, 'hex') as user_ref
         from billing.orders o order by o.created_at desc limit 200`,
    );
    return result.rows.map((row) => ({
      id: row.id,
      productName: row.product_name_snapshot,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      viewedAt: row.viewed_at,
      userRef: row.user_ref,
    }));
  });
}

export interface BillingKpiSummary {
  readonly netRevenue30dKrw: number;
  readonly mrrKrw: number;
  readonly arppuKrw: number | null;
  readonly refundRatePercent: number | null;
  readonly activePayers30d: number;
  readonly aiCostUsd30d: number | null;
  readonly aiCostSharePercent: number | null;
  readonly aiEstimatedRequests30d: number | null;
}

export async function getBillingKpiSummary(): Promise<BillingKpiSummary | null> {
  if (!billingStorageReady()) return null;
  const billing = await withBillingTransaction(async (client) => {
    const result = await client.query<{
      mrr_krw: string;
      net_revenue_30d_krw: string;
      active_payers_30d: number;
      paid_orders_30d: number;
      refunded_orders_30d: number;
    }>(
      `with paid_period as (
         select o.id, o.user_ref_hmac, o.amount, o.status
           from billing.orders o
          where o.currency = 'KRW'
            and o.paid_at >= now() - interval '30 days'
            and o.paid_at <= now()
            and o.status in ('paid', 'refunding', 'refunded', 'partially_refunded')
       ), refunds_30d as (
         select r.payment_id, sum(r.amount)::bigint as refunded_amount
           from billing.refunds r
          where r.status = 'succeeded' and r.processed_at >= now() - interval '30 days'
          group by r.payment_id
       ), payment_orders as (
         select p.id as payment_id, p.order_id from billing.payments p
       ), active as (
         select coalesce(sum(case when pr.billing_interval = 'year' then pr.amount / 12.0 else pr.amount end), 0)::text as mrr_krw
           from billing.subscriptions s
           join billing.prices pr on pr.id = s.price_id
          where s.status = 'active' and s.current_period_end > now()
       )
       select active.mrr_krw,
              greatest(coalesce(sum(pp.amount), 0) - coalesce(sum(r.refunded_amount), 0), 0)::text as net_revenue_30d_krw,
              count(distinct pp.user_ref_hmac) filter (where pp.status in ('paid', 'partially_refunded'))::int as active_payers_30d,
              count(*)::int as paid_orders_30d,
              count(*) filter (where pp.status in ('refunded', 'partially_refunded'))::int as refunded_orders_30d
         from paid_period pp
         left join payment_orders po on po.order_id = pp.id
         left join refunds_30d r on r.payment_id = po.payment_id
         cross join active
        group by active.mrr_krw`,
      [],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      mrrKrw: Math.max(0, Number(row.mrr_krw) || 0),
      netRevenue30dKrw: Math.max(0, Number(row.net_revenue_30d_krw) || 0),
      activePayers30d: Math.max(0, row.active_payers_30d),
      paidOrders30d: Math.max(0, row.paid_orders_30d),
      refundedOrders30d: Math.max(0, row.refunded_orders_30d),
    };
  });
  if (!billing) return null;

  let aiCostUsd30d: number | null = null;
  let aiEstimatedRequests30d: number | null = null;
  try {
    const { getAIUsageCostSummary } = await import("@/server/ai/service");
    const ai = await getAIUsageCostSummary(30);
    aiCostUsd30d = ai.costMicrousd / 1_000_000;
    aiEstimatedRequests30d = ai.estimatedRequests;
  } catch {
    // The billing panel remains useful if the separate AI worker database is disabled.
  }

  const exchangeRate = Number(process.env.REPORTING_KRW_PER_USD);
  const validExchangeRate = Number.isFinite(exchangeRate) && exchangeRate >= 500 && exchangeRate <= 5_000
    ? exchangeRate
    : null;
  const aiCostSharePercent = validExchangeRate !== null && aiCostUsd30d !== null && billing.netRevenue30dKrw > 0
    ? Math.round((aiCostUsd30d * validExchangeRate / billing.netRevenue30dKrw) * 100_000) / 1_000
    : null;

  return {
    netRevenue30dKrw: billing.netRevenue30dKrw,
    mrrKrw: billing.mrrKrw,
    arppuKrw: billing.activePayers30d > 0 ? Math.round(billing.netRevenue30dKrw / billing.activePayers30d) : null,
    refundRatePercent: billing.paidOrders30d > 0
      ? Math.round((billing.refundedOrders30d / billing.paidOrders30d) * 100_000) / 1_000
      : null,
    activePayers30d: billing.activePayers30d,
    aiCostUsd30d,
    aiCostSharePercent,
    aiEstimatedRequests30d,
  };
}

export type AppliedPaymentEvent = "applied" | "duplicate" | "ignored";

export async function applyTossPaymentEvent(input: Readonly<{
  eventId: string;
  eventType: string;
  payloadHash: Buffer;
  payment: TossPayment;
}>): Promise<AppliedPaymentEvent> {
  if (!/^[A-Za-z0-9:_-]{1,200}$/u.test(input.eventId)) throw new BillingInputError("payment_state_invalid");
  return withBillingTransaction(async (client) => {
    const event = await client.query<{ id: string }>(
      `insert into billing.webhook_events (provider, provider_event_id, event_type, payload_hash, status)
       values ('toss', $1, $2, $3, 'applied') on conflict (provider, provider_event_id) do nothing returning id::text`,
      [input.eventId, input.eventType.slice(0, 100), input.payloadHash],
    );
    if (!event.rows[0]) return "duplicate";

    const orderResult = await client.query<OrderRow>(
      `select id::text, user_id, user_ref_hmac, product_key, product_name_snapshot, amount, currency,
              status, expires_at, paid_at, viewed_at
         from billing.orders where id = $1 for update`,
      [input.payment.orderId],
    );
    const order = orderResult.rows[0];
    if (!order || input.payment.status !== "DONE" || order.amount !== input.payment.totalAmount || order.currency !== input.payment.currency) {
      await client.query(
        `update billing.webhook_events set status = 'ignored' where provider = 'toss' and provider_event_id = $1`,
        [input.eventId],
      );
      return "ignored";
    }
    if (order.status === "paid") return "ignored";
    // Toss is the settlement authority: a verified DONE payment can arrive after
    // the local checkout window when a webhook or browser return was delayed.
    if (order.status !== "pending") {
      await client.query(
        `update billing.webhook_events set status = 'ignored' where provider = 'toss' and provider_event_id = $1`,
        [input.eventId],
      );
      return "ignored";
    }

    const encrypted = encryptPaymentKey(input.payment.paymentKey, order.id);
    const approvedAt = input.payment.approvedAt ? new Date(input.payment.approvedAt) : new Date();
    await client.query(
      `insert into billing.payments
        (order_id, provider, provider_payment_key_ciphertext, provider_payment_key_digest,
         key_version, amount, currency, method, status, provider_transaction_id, approved_at)
       values ($1, 'toss', $2, $3, $4, $5, $6, $7, 'approved', $8, $9)`,
      [order.id, encrypted.ciphertext, paymentKeyDigest(input.payment.paymentKey), encrypted.keyVersion,
        input.payment.totalAmount, input.payment.currency, input.payment.method,
        input.payment.lastTransactionKey ?? null, approvedAt],
    );
    await client.query(
      `update billing.orders set status = 'paid', paid_at = $2, updated_at = now() where id = $1`,
      [order.id, approvedAt],
    );
    if (order.user_id !== null) {
      await client.query(
        `insert into billing.entitlements (user_id, user_ref_hmac, product_key, order_id)
         values ($1, $2, $3, $4) on conflict (order_id) do nothing`,
        [order.user_id, order.user_ref_hmac, order.product_key, order.id],
      );
    }
    await client.query(
      `insert into billing.receipt_email_events (order_id) values ($1) on conflict (order_id) do nothing`,
      [order.id],
    );
    return "applied";
  });
}

/**
 * The DB-side tail shared by every path that finalizes a cancelled order: mark the
 * payment cancelled, the order refunded, the entitlement revoked, and (for a
 * subscription invoice) cascade into the subscription itself. Callers differ only
 * in how the billing.refunds row and audit event get written, since one path
 * updates an existing app-initiated reservation and the other inserts a new
 * provider-initiated one — everything after that is identical.
 */
async function finalizeCancelledOrder(
  client: PoolClient,
  orderId: string,
  paymentId: string,
  subscriptionInvoiceId: string | null,
): Promise<void> {
  await client.query(`update billing.payments set status = 'cancelled', updated_at = now() where id = $1`, [paymentId]);
  await client.query(`update billing.orders set status = 'refunded', updated_at = now() where id = $1`, [orderId]);
  await client.query(`update billing.entitlements set status = 'revoked', revoked_at = now() where order_id = $1`, [orderId]);
  if (!subscriptionInvoiceId) return;
  const subscription = await client.query<{ id: string }>(
    `update billing.subscriptions
        set status = 'cancelled', cancel_at_period_end = false,
            cancelled_at = coalesce(cancelled_at, now()), cancellation_requested_at = now(), updated_at = now()
      where id = (select subscription_id from billing.subscription_invoices where id = $1)
      returning id::text`,
    [subscriptionInvoiceId],
  );
  await client.query(
    `update billing.subscription_invoices set status = 'void', updated_at = now()
      where id = $1 or subscription_id = (select subscription_id from billing.subscription_invoices where id = $1)
        and status = 'queued'`,
    [subscriptionInvoiceId],
  );
  await client.query(
    `update billing.subscription_payments set status = 'cancelled' where invoice_id = $1`,
    [subscriptionInvoiceId],
  );
  if (subscription.rows[0]) {
    await client.query(
      `insert into billing.subscription_notices (subscription_id, invoice_id, notice_type, send_after)
       values ($1, $2, 'subscription_ended', now()) on conflict do nothing`,
      [subscription.rows[0].id, subscriptionInvoiceId],
    );
  }
}

export async function applyTossCancellation(input: Readonly<{
  orderId: string;
  refundId: string;
  providerRefundId: string | null;
}>): Promise<void> {
  await withBillingTransaction(async (client: PoolClient) => {
    const result = await client.query<{
      id: string;
      status: string;
      subscription_invoice_id: string | null;
    }>(
      `select o.id::text, o.status, o.subscription_invoice_id::text
         from billing.orders o where o.id = $1 for update`,
      [input.orderId],
    );
    const order = result.rows[0];
    if (!order || order.status !== "refunding") throw new BillingInputError("payment_state_invalid");
    const payment = await client.query<{ id: string }>(`select id::text from billing.payments where order_id = $1 for update`, [order.id]);
    const paymentId = payment.rows[0]?.id;
    if (!paymentId) throw new BillingInputError("payment_state_invalid");
    const refund = await client.query<{ actor_user_id: string | null; actor_ref_hmac: Buffer | null; reason_code: string }>(
      `update billing.refunds
          set status = 'succeeded', provider_refund_id = $2, processed_at = now()
        where id = $1 and payment_id = $3 and status = 'pending'
        returning actor_user_id, actor_ref_hmac, reason_code`,
      [input.refundId, input.providerRefundId, paymentId],
    );
    const recordedRefund = refund.rows[0];
    if (!recordedRefund) throw new BillingInputError("payment_state_invalid");
    await finalizeCancelledOrder(client, order.id, paymentId, order.subscription_invoice_id);
    await client.query(
      `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
       values ($1, $2, 'refund.succeeded', 'order', $3, $4)`,
      [recordedRefund.actor_user_id, recordedRefund.actor_ref_hmac, order.id, recordedRefund.reason_code],
    );
  });
}

/**
 * Reflects a cancellation that happened outside this app entirely — an operator
 * cancelling the payment from Toss's own dashboard, rather than through
 * reserveOwnRefund/reserveAdminRefund. There is no pre-existing billing.refunds
 * reservation to finalize (nothing in this app initiated it), so this inserts one
 * directly in 'succeeded' status for the ledger, then runs the same finalize tail.
 * A no-op (returns "ignored") unless the order is still 'paid': if it's already
 * 'refunding'/'refunded', an app-initiated cancellation got there first (or this
 * event is a redundant retry), and that path owns finalizing it.
 */
export async function applyDashboardCancellation(input: Readonly<{
  orderId: string;
  amount: number;
  providerRefundId: string | null;
}>): Promise<"applied" | "ignored"> {
  return withBillingTransaction(async (client: PoolClient) => {
    const result = await client.query<{ id: string; status: string; subscription_invoice_id: string | null }>(
      `select o.id::text, o.status, o.subscription_invoice_id::text
         from billing.orders o where o.id = $1 for update`,
      [input.orderId],
    );
    const order = result.rows[0];
    if (!order || order.status !== "paid") return "ignored";
    const payment = await client.query<{ id: string }>(`select id::text from billing.payments where order_id = $1 for update`, [order.id]);
    const paymentId = payment.rows[0]?.id;
    if (!paymentId) return "ignored";

    await client.query(
      `insert into billing.refunds (payment_id, amount, reason_code, status, provider_refund_id, processed_at)
       values ($1, $2, 'provider_dashboard_cancellation', 'succeeded', $3, now())`,
      [paymentId, input.amount, input.providerRefundId],
    );
    await finalizeCancelledOrder(client, order.id, paymentId, order.subscription_invoice_id);
    await client.query(
      `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
       values (null, null, 'refund.provider_initiated', 'order', $1, 'provider_dashboard_cancellation')`,
      [order.id],
    );
    return "applied";
  });
}

interface ReservedRefund {
  readonly id: string;
  readonly orderId: string;
  readonly paymentKey: string;
  readonly reasonCode: string;
}

async function reserveRefund(input: Readonly<{
  orderId: string;
  actorUserId: string;
  ownerUserId: string | null;
  reasonCode: string;
  enforceSelfServicePolicy: boolean;
}>): Promise<ReservedRefund> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.orderId)
    || !/^[a-z0-9][a-z0-9_-]{1,63}$/u.test(input.reasonCode)) {
    throw new BillingInputError("refund_unavailable");
  }
  return withBillingTransaction(async (client) => {
    let reasonCode = input.reasonCode;
    const query = await client.query<{
      id: string;
      user_id: string | null;
      user_ref_hmac: Buffer;
      status: string;
      paid_at: Date | null;
      viewed_at: Date | null;
      amount: number;
      payment_id: string;
      encrypted_key: string;
      key_version: number;
      subscription_invoice_id: string | null;
    }>(
      `select o.id::text, o.user_id, o.user_ref_hmac, o.status, o.paid_at, o.viewed_at, o.amount,
              p.id::text as payment_id, p.provider_payment_key_ciphertext as encrypted_key, p.key_version,
              o.subscription_invoice_id::text
         from billing.orders o
         join billing.payments p on p.order_id = o.id
        where o.id = $1 and ($2::text is null or o.user_id = $2)
        for update of o, p`,
      [input.orderId, input.ownerUserId],
    );
    const order = query.rows[0];
    if (!order || order.user_id === null || order.status !== "paid" && order.status !== "refunding") {
      throw new BillingInputError("refund_unavailable");
    }
    if (input.enforceSelfServicePolicy && !isSelfServiceRefundEligible({
      status: order.status,
      viewedAt: order.viewed_at,
      paidAt: order.paid_at,
      subscriptionInvoiceId: order.subscription_invoice_id,
    }, new Date())) {
      throw new BillingInputError("refund_unavailable");
    }

    let refundId: string;
    if (order.status === "refunding") {
      const pending = await client.query<{ id: string; reason_code: string }>(
        `select r.id::text, r.reason_code from billing.refunds r
          where r.payment_id = $1 and r.status = 'pending' order by r.created_at desc limit 1 for update`,
        [order.payment_id],
      );
      const existing = pending.rows[0];
      if (!existing) throw new BillingInputError("refund_unavailable");
      refundId = existing.id;
      reasonCode = existing.reason_code;
    } else {
      const created = await client.query<{ id: string }>(
        `insert into billing.refunds (payment_id, amount, reason_code, status, actor_user_id, actor_ref_hmac)
         values ($1, $2, $3, 'pending', $4, $5) returning id::text`,
        [order.payment_id, order.amount, input.reasonCode, input.actorUserId, order.user_ref_hmac],
      );
      const row = created.rows[0];
      if (!row) throw new Error("Refund reservation was not created");
      refundId = row.id;
      await client.query(`update billing.orders set status = 'refunding', updated_at = now() where id = $1`, [order.id]);
    }
    return {
      id: refundId,
      orderId: order.id,
      paymentKey: decryptBillingValue(order.encrypted_key, "payment-key", order.id, order.key_version),
      reasonCode,
    };
  });
}

export async function reserveOwnRefund(orderId: string, reasonCode: string): Promise<ReservedRefund> {
  const member = await requireBillingMember();
  return reserveRefund({ orderId, actorUserId: member.id, ownerUserId: member.id, reasonCode, enforceSelfServicePolicy: true });
}

export async function reserveAdminRefund(orderId: string, actorUserId: string, reasonCode: string): Promise<ReservedRefund> {
  return reserveRefund({ orderId, actorUserId, ownerUserId: null, reasonCode, enforceSelfServicePolicy: false });
}

export async function failReservedRefund(input: Readonly<{ refundId: string; orderId: string; errorCode: string }>): Promise<void> {
  await withBillingTransaction(async (client) => {
    await client.query(
      `update billing.refunds set status = 'failed', processed_at = now(), reason_code = $3
        where id = $1 and payment_id = (select id from billing.payments where order_id = $2) and status = 'pending'`,
      [input.refundId, input.orderId, input.errorCode],
    );
    await client.query(
      `update billing.orders set status = 'paid', updated_at = now() where id = $1 and status = 'refunding'`,
      [input.orderId],
    );
  });
}

/**
 * The active entitlement id granted by an active LUMINA+ subscription, per the
 * catalog's includedInPlus list — replaces three copies of the same hardcoded
 * ('lumina-plus-monthly', 'lumina-plus-yearly') check that only ever ran for the
 * one flagship product.
 */
async function activePlusEntitlementId(
  client: PoolClient,
  userId: string,
  productKey: ProductKey,
): Promise<string | null> {
  const includedInPlus = PRODUCT_CATALOG[productKey].includedInPlus;
  if (includedInPlus.length === 0) return null;
  const subscription = await client.query<{ id: string }>(
    `select e.id::text
       from billing.subscriptions s
       join billing.entitlements e on e.user_id = s.user_id
      where s.user_id = $1 and s.product_key = any($2::text[])
        and s.status in ('active', 'past_due') and s.current_period_end > now()
        and e.product_key = s.product_key and e.status = 'active'
        and (e.expires_at is null or e.expires_at > now())
      order by e.granted_at desc limit 1`,
    [userId, includedInPlus],
  );
  return subscription.rows[0]?.id ?? null;
}

export async function markOwnEntitlementViewed(productKey: ProductKey): Promise<boolean> {
  const member = await requireBillingMember();
  return withBillingTransaction(async (client) => {
    const result = await client.query<{ order_id: string }>(
      `update billing.orders o set viewed_at = coalesce(o.viewed_at, now()), updated_at = now()
        where o.user_id = $1 and o.product_key = $2 and o.status = 'paid'
          and exists (select 1 from billing.entitlements e where e.order_id = o.id and e.user_id = $1 and e.status = 'active')
        returning o.id::text as order_id`,
      [member.id, productKey],
    );
    if (result.rowCount !== null && result.rowCount > 0) return true;
    return Boolean(await activePlusEntitlementId(client, member.id, productKey));
  });
}

export async function hasOwnEntitlement(productKey: ProductKey): Promise<boolean> {
  const member = await requireBillingMember();
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<{ id: string }>(
      `select e.id::text from billing.entitlements e
         join billing.orders o on o.id = e.order_id
        where e.user_id = $1 and e.product_key = $2 and e.status = 'active'
          and o.status = 'paid'
          and (e.expires_at is null or e.expires_at > now())
        limit 1`,
      [member.id, productKey],
    );
    if (result.rows[0]) return true;
    return Boolean(await activePlusEntitlementId(client, member.id, productKey));
  });
}

export async function getOwnActiveEntitlementId(productKey: ProductKey): Promise<string | null> {
  const member = await requireBillingMember();
  return withMemberTransaction(member.id, async (client) => {
    const result = await client.query<{ id: string }>(
      `select e.id::text
         from billing.entitlements e
         join billing.orders o on o.id = e.order_id
        where e.user_id = $1 and e.product_key = $2 and e.status = 'active'
          and o.status = 'paid' and (e.expires_at is null or e.expires_at > now())
        order by e.granted_at desc limit 1`,
      [member.id, productKey],
    );
    if (result.rows[0]?.id) return result.rows[0].id;
    return activePlusEntitlementId(client, member.id, productKey);
  });
}

export async function listTossReconcileOrders(limit = 50): Promise<readonly ReconcileOrder[]> {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  return withBillingTransaction(async (client) => {
    const result = await client.query<{ id: string; expires_at: Date }>(
      `select id::text, expires_at
         from billing.orders
        where provider = 'toss' and status = 'pending'
          and created_at >= now() - interval '14 days'
        order by expires_at asc
        limit $1`,
      [boundedLimit],
    );
    return result.rows.map((row) => ({ id: row.id, expiresAt: row.expires_at }));
  });
}

export async function cancelExpiredUnpaidOrder(orderId: string): Promise<boolean> {
  return withBillingTransaction(async (client) => {
    const result = await client.query(
      `update billing.orders
          set status = 'cancelled', updated_at = now()
        where id = $1 and provider = 'toss' and status = 'pending' and expires_at <= now()
        returning id`,
      [orderId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

// A cancellation that times out (service.ts's TossPaymentError 503 path) leaves the
// refund reservation 'pending' and the order 'refunding' forever unless something
// retries it — reserveOwnRefund/reserveAdminRefund only run when a person visits
// the refund UI again. This age floor (comfortably above the 10s provider timeout)
// keeps reconcile from racing an attempt that's still genuinely in flight.
const STUCK_REFUND_MIN_AGE_MINUTES = 5;

export async function listStuckRefundingOrders(limit = 20): Promise<readonly Readonly<{ id: string }>[]> {
  const boundedLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  return withBillingTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `select o.id::text
         from billing.orders o
         join billing.payments p on p.order_id = o.id
         join billing.refunds r on r.payment_id = p.id and r.status = 'pending'
        where o.provider = 'toss' and o.status = 'refunding'
          and r.created_at <= now() - ($1::int * interval '1 minute')
        order by r.created_at asc
        limit $2`,
      [STUCK_REFUND_MIN_AGE_MINUTES, boundedLimit],
    );
    return result.rows;
  });
}

export interface StuckRefundReservation {
  readonly refundId: string;
  readonly reasonCode: string;
  readonly paymentKey: string;
}

/** Read-only lookup for the reconcile job — mirrors reserveRefund's "already refunding" branch without needing an actor. */
export async function getStuckRefundReservation(orderId: string): Promise<StuckRefundReservation | null> {
  return withBillingTransaction(async (client) => {
    const result = await client.query<{
      refund_id: string;
      reason_code: string;
      encrypted_key: string;
      key_version: number;
    }>(
      `select r.id::text as refund_id, r.reason_code,
              p.provider_payment_key_ciphertext as encrypted_key, p.key_version
         from billing.orders o
         join billing.payments p on p.order_id = o.id
         join billing.refunds r on r.payment_id = p.id and r.status = 'pending'
        where o.id = $1 and o.status = 'refunding'
        order by r.created_at desc
        limit 1`,
      [orderId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      refundId: row.refund_id,
      reasonCode: row.reason_code,
      paymentKey: decryptBillingValue(row.encrypted_key, "payment-key", orderId, row.key_version),
    };
  });
}

export async function claimReceiptEmailJobs(limit = 5): Promise<readonly ReceiptEmailJob[]> {
  const boundedLimit = Math.max(1, Math.min(10, Math.floor(limit)));
  return withBillingTransaction(async (client) => {
    const result = await client.query<{
      order_id: string;
      attempt_count: number;
      ciphertext: string | null;
      key_version: number | null;
  locale: Locale;
      product_name: string;
      amount: number;
      currency: string;
      paid_at: Date;
    }>(
      `with candidates as (
         select e.id
           from billing.receipt_email_events e
           join billing.orders o on o.id = e.order_id
          where e.attempt_count < 20
            and (e.status = 'pending' or (e.status = 'processing' and e.lock_expires_at <= now()))
            and o.status = 'paid' and o.paid_at is not null
          order by e.created_at asc
          for update of e skip locked
          limit $1
       )
       update billing.receipt_email_events e
          set status = 'processing', attempt_count = e.attempt_count + 1,
              lock_expires_at = now() + interval '5 minutes', last_error_code = null
         from candidates c
         join billing.orders o on true
        where e.id = c.id and o.id = e.order_id
       returning o.id::text as order_id, e.attempt_count, o.receipt_email_ciphertext as ciphertext,
                 o.receipt_email_key_version as key_version, o.receipt_locale as locale,
                 o.product_name_snapshot as product_name, o.amount, o.currency, o.paid_at`,
      [boundedLimit],
    );
    return result.rows.map((row) => ({
      orderId: row.order_id,
      attemptCount: row.attempt_count,
      ciphertext: row.ciphertext,
      keyVersion: row.key_version,
      locale: row.locale,
      productName: row.product_name,
      amount: row.amount,
      currency: row.currency,
      paidAt: row.paid_at,
    }));
  });
}

export function getReceiptRecipient(job: ReceiptEmailJob): string | null {
  if (!job.ciphertext || job.keyVersion === null) return null;
  return decryptBillingValue(job.ciphertext, "receipt-email", job.orderId, job.keyVersion);
}

export async function markReceiptEmailSent(orderId: string, attemptCount: number, providerMessageId: string): Promise<boolean> {
  return withBillingTransaction(async (client) => {
    const result = await client.query(
      `update billing.receipt_email_events
          set status = 'sent', provider_message_id = $3, sent_at = now(), lock_expires_at = null,
              last_error_code = null
        where order_id = $1 and status = 'processing' and attempt_count = $2
        returning id`,
      [orderId, attemptCount, providerMessageId.slice(0, 200)],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function markReceiptEmailFailed(orderId: string, attemptCount: number, errorCode: string): Promise<void> {
  const safeErrorCode = /^[a-z0-9_-]{1,40}$/u.test(errorCode) ? errorCode : "provider_error";
  await withBillingTransaction(async (client) => {
    await client.query(
      `update billing.receipt_email_events
          set status = case when attempt_count >= 20 then 'failed' else 'pending' end,
              lock_expires_at = null, last_error_code = $3
        where order_id = $1 and status = 'processing' and attempt_count = $2`,
      [orderId, attemptCount, safeErrorCode],
    );
  });
}

export async function markReceiptEmailUndeliverable(orderId: string, attemptCount: number): Promise<void> {
  await withBillingTransaction(async (client) => {
    await client.query(
      `update billing.receipt_email_events
          set status = 'failed', lock_expires_at = null, last_error_code = 'missing_recipient'
        where order_id = $1 and status = 'processing' and attempt_count = $2`,
      [orderId, attemptCount],
    );
  });
}

export async function getMemberForBilling(): Promise<Member> {
  return requireBillingMember();
}

export async function prepareMemberAccountDeletion(userId: string): Promise<void> {
  if (!billingStorageReady()) return;
  await withBillingTransaction(async (client) => {
    const result = await client.query<{ id: string; status: string; expires_at: Date; user_ref_hmac: Buffer }>(
      `select id::text, status, expires_at, user_ref_hmac from billing.orders where user_id = $1 for update`,
      [userId],
    );
    const now = Date.now();
    const activePendingOrder = result.rows.find((order) => order.status === "pending" && order.expires_at.getTime() > now);
    if (activePendingOrder) throw new BillingInputError("billing_pending_orders");

    const processingInvoice = await client.query<{ id: string }>(
      `select i.id::text from billing.subscription_invoices i
         join billing.subscriptions s on s.id = i.subscription_id
        where s.user_id = $1 and i.status = 'processing'
        limit 1 for update of i`,
      [userId],
    );
    if (processingInvoice.rows[0]) throw new BillingInputError("billing_pending_orders");

    const subscriptions = await client.query<{
      id: string;
      status: string;
      user_ref_hmac: Buffer;
    }>(
      `select id::text, status, user_ref_hmac
         from billing.subscriptions
        where user_id = $1 and status in ('pending', 'active', 'past_due')
        for update`,
      [userId],
    );
    for (const subscription of subscriptions.rows) {
      const pending = subscription.status === "pending";
      await client.query(
        `update billing.subscriptions
            set status = case when $2 then 'cancelled' else status end,
                cancel_at_period_end = not $2,
                cancelled_at = case when $2 then now() else cancelled_at end,
                cancellation_requested_at = now(), updated_at = now(),
                receipt_email_ciphertext = null, receipt_email_key_version = null
          where id = $1`,
        [subscription.id, pending],
      );
      await client.query(
        `update billing.subscription_invoices set status = 'void', updated_at = now()
          where subscription_id = $1 and status = 'queued'`,
        [subscription.id],
      );
      await client.query(
        `update billing.subscription_notices set status = 'failed', last_error_code = 'account_deleted'
          where subscription_id = $1 and status in ('queued', 'processing')`,
        [subscription.id],
      );
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, $2, 'subscription.account_delete_cancel', 'subscription', $3, 'account_delete_request')`,
        [userId, subscription.user_ref_hmac, subscription.id],
      );
    }

    await client.query(
      `update billing.orders set status = 'cancelled', updated_at = now()
        where user_id = $1 and status = 'pending' and expires_at <= now()`,
      [userId],
    );
    await client.query(
      `update billing.receipt_email_events e
          set status = 'failed', lock_expires_at = null, last_error_code = 'account_deleted'
        where e.status in ('pending', 'processing') and exists (
          select 1 from billing.orders o where o.id = e.order_id and o.user_id = $1
        )`,
      [userId],
    );
    await client.query(
      `update billing.orders set receipt_email_ciphertext = null, receipt_email_key_version = null
        where user_id = $1`,
      [userId],
    );
    const ref = result.rows[0]?.user_ref_hmac ?? subscriptions.rows[0]?.user_ref_hmac;
    if (ref) {
      await client.query(
        `insert into billing.audit_events (actor_user_id, actor_ref_hmac, action, entity_type, entity_id, reason_code)
         values ($1, $2, 'account.delete_requested', 'account', $3, 'user_requested')`,
        [userId, ref, ref.toString("hex")],
      );
    }
  });
}

export function paymentEventHash(event: unknown): Buffer {
  return createHash("sha256").update(JSON.stringify(event), "utf8").digest();
}

export function getBillingClientKey(): string | null {
  return billingCheckoutReady() ? process.env.TOSS_CLIENT_KEY?.trim() ?? null : null;
}

export async function getActiveSaju2027Sale(): Promise<ActiveSaju2027Sale | null> {
  if (!billingCheckoutReady()) return null;
  try {
    return await withBillingTransaction(async (client) => {
      const result = await client.query<{ amount: number; currency: string; name_ko: string; name_en: string }>(
        `select pr.amount, pr.currency, p.name_ko, p.name_en
           from billing.products p
           join billing.prices pr on pr.product_key = p.product_key and pr.product_type = p.product_type
          where p.product_key = $1 and p.enabled and p.license_status = 'verified'
            and pr.enabled and pr.currency = 'KRW'
            and pr.valid_from <= now() and (pr.valid_until is null or pr.valid_until > now())
          order by pr.valid_from desc limit 1`,
        [PRODUCT_KEY],
      );
      const row = result.rows[0];
      if (!row || row.currency !== "KRW") return null;
      return { amount: row.amount, currency: "KRW", nameKo: row.name_ko, nameEn: row.name_en };
    });
  } catch {
    return null;
  }
}
