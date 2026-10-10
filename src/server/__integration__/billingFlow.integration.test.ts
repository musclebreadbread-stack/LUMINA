import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { TossPayment } from "@/server/billing/providerTypes";
import { localIntegrationDatabaseUrl } from "./localDatabase";

/*
 * 결제 상태 전이 SQL을 실제 PostgreSQL과 운영용 lumina_billing_worker 역할로 검증한다.
 * 연결 모듈만 로컬용으로 바꾸고(로컬 DB는 TLS가 없다), 역할 검사는 운영과 같게 유지한다.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({ isMemberAuthConfigured: () => false }));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: vi.fn() }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: vi.fn() }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));
vi.mock("@/server/billing/workerDatabase", async () => {
  const { Pool } = await import("pg");
  let pool: InstanceType<typeof Pool> | null = null;
  function workerPool(): InstanceType<typeof Pool> {
    if (pool) return pool;
    const connectionString = process.env.LUMINA_IT_BILLING_WORKER_URL;
    if (!connectionString) throw new Error("LUMINA_IT_BILLING_WORKER_URL is not prepared");
    pool = new Pool({
      connectionString,
      max: 2,
      options: "-c search_path=billing,app,pg_catalog",
      onConnect: async (client) => {
        const role = await client.query<{ role_name: string; is_superuser: boolean; bypasses_rls: boolean }>(
          `select current_user as role_name, rolsuper as is_superuser, rolbypassrls as bypasses_rls
             from pg_catalog.pg_roles where rolname = current_user`,
        );
        const row = role.rows[0];
        if (!row || row.role_name !== "lumina_billing_worker" || row.is_superuser || row.bypasses_rls) {
          throw new Error("integration worker must use the non-privileged lumina_billing_worker role");
        }
      },
    });
    return pool;
  }
  return {
    withBillingTransaction: async <T>(operation: (client: import("pg").PoolClient) => Promise<T>): Promise<T> => {
      const client = await workerPool().connect();
      try {
        await client.query("begin");
        const value = await operation(client);
        await client.query("commit");
        return value;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
    closeIntegrationPool: async () => {
      await pool?.end();
      pool = null;
    },
  };
});

const databaseUrl = localIntegrationDatabaseUrl();

describe.skipIf(!databaseUrl)("Toss billing state transitions on a real PostgreSQL database", () => {
  const admin = new Client({ connectionString: databaseUrl ?? undefined });
  const userId = `it-billing-${randomUUID()}`;
  const hmacKey = randomBytes(32).toString("hex");
  const userRef = createHmac("sha256", hmacKey).update(userId, "utf8").digest();

  async function seedPendingOrder(): Promise<{ orderId: string; amount: number }> {
    const result = await admin.query<{ id: string; amount: number }>(
      `insert into billing.orders
         (user_id, user_ref_hmac, product_key, price_id, provider, product_name_snapshot, amount, currency, expires_at)
       select $1, $2, p.product_key, p.id, 'toss', 'synthetic', p.amount, p.currency, now() + interval '30 minutes'
         from billing.prices p where p.product_key = 'saju-2027' and p.currency = 'KRW' limit 1
       returning id::text, amount`,
      [userId, userRef],
    );
    const row = result.rows[0];
    if (!row) throw new Error("seed order was not created");
    return { orderId: row.id, amount: row.amount };
  }

  function donePayment(orderId: string, amount: number): TossPayment {
    return {
      paymentKey: `it-payment-${orderId}`,
      orderId,
      status: "DONE",
      totalAmount: amount,
      currency: "KRW",
      method: "카드",
      approvedAt: new Date().toISOString(),
      lastTransactionKey: `it-approve-${orderId}`,
    };
  }

  async function orderState(orderId: string): Promise<{ order: string; entitlements: number; active: number; payments: number }> {
    const result = await admin.query<{ order: string; entitlements: string; active: string; payments: string }>(
      `select o.status as order,
              (select count(*) from billing.entitlements e where e.order_id = o.id) as entitlements,
              (select count(*) from billing.entitlements e where e.order_id = o.id and e.status = 'active') as active,
              (select count(*) from billing.payments p where p.order_id = o.id) as payments
         from billing.orders o where o.id = $1`,
      [orderId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("order not found");
    return { order: row.order, entitlements: Number(row.entitlements), active: Number(row.active), payments: Number(row.payments) };
  }

  beforeAll(async () => {
    await admin.connect();
    const workerPassword = randomBytes(24).toString("hex");
    await admin.query(`alter role lumina_billing_worker login password '${workerPassword}'`);
    const workerUrl = new URL(databaseUrl ?? "");
    workerUrl.username = "lumina_billing_worker";
    workerUrl.password = workerPassword;
    vi.stubEnv("LUMINA_IT_BILLING_WORKER_URL", workerUrl.toString());
    vi.stubEnv("BILLING_DATABASE_URL", workerUrl.toString());
    vi.stubEnv("BILLING_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
    vi.stubEnv("BILLING_ENCRYPTION_KEY_VERSION", "1");
    vi.stubEnv("BILLING_USER_REF_HMAC_KEY", hmacKey);
    await admin.query(
      `insert into identity."user" (id, name, email) values ($1, 'synthetic', $1 || '@example.invalid')`,
      [userId],
    );
  });

  afterAll(async () => {
    const workerModule = await import("@/server/billing/workerDatabase") as unknown as { closeIntegrationPool: () => Promise<void> };
    await workerModule.closeIntegrationPool();
    await admin.end();
    vi.unstubAllEnvs();
  });

  it("grants exactly one entitlement even when the same webhook is replayed five times", async () => {
    const { applyTossPaymentEvent, paymentEventHash } = await import("@/server/billing/service");
    const { orderId, amount } = await seedPendingOrder();
    const payment = donePayment(orderId, amount);
    const eventId = `it-event-${randomUUID()}`;

    const outcomes = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      outcomes.push(await applyTossPaymentEvent({ eventId, eventType: "PAYMENT_STATUS_CHANGED", payloadHash: paymentEventHash(payment), payment }));
    }
    const differentEvent = await applyTossPaymentEvent({
      eventId: `it-event-${randomUUID()}`, eventType: "PAYMENT_STATUS_CHANGED", payloadHash: paymentEventHash(payment), payment,
    });

    expect(outcomes).toEqual(["applied", "duplicate", "duplicate", "duplicate", "duplicate", "duplicate"]);
    expect(differentEvent).toBe("ignored");
    expect(await orderState(orderId)).toEqual({ order: "paid", entitlements: 1, active: 1, payments: 1 });
  });

  it("ignores a DONE event whose amount differs from the server-priced order", async () => {
    const { applyTossPaymentEvent, paymentEventHash } = await import("@/server/billing/service");
    const { orderId, amount } = await seedPendingOrder();
    const tampered = { ...donePayment(orderId, amount), totalAmount: amount - 1 };

    const outcome = await applyTossPaymentEvent({
      eventId: `it-event-${randomUUID()}`, eventType: "PAYMENT_STATUS_CHANGED", payloadHash: paymentEventHash(tampered), payment: tampered,
    });

    expect(outcome).toBe("ignored");
    expect(await orderState(orderId)).toEqual({ order: "pending", entitlements: 0, active: 0, payments: 0 });
  });

  it("reserves, reconciles, and completes a full refund that revokes access exactly once", async () => {
    const service = await import("@/server/billing/service");
    const { orderId, amount } = await seedPendingOrder();
    const payment = donePayment(orderId, amount);
    await service.applyTossPaymentEvent({
      eventId: `it-event-${randomUUID()}`, eventType: "PAYMENT_STATUS_CHANGED", payloadHash: service.paymentEventHash(payment), payment,
    });

    const reservation = await service.reserveAdminRefund(orderId, userId, "it-admin-refund");
    const retried = await service.reserveAdminRefund(orderId, userId, "it-admin-refund");
    const target = await service.getAdminRefundReconciliationTarget(orderId);
    await service.applyTossCancellation({ orderId, refundId: reservation.id, providerRefundId: "it-cancel-1,it-cancel-2" });
    await service.applyTossCancellation({ orderId, refundId: reservation.id, providerRefundId: "it-cancel-1,it-cancel-2" });

    expect(reservation.paymentKey).toBe(payment.paymentKey);
    expect(retried.id).toBe(reservation.id);
    expect(target).toMatchObject({ id: reservation.id, orderId, paymentKey: payment.paymentKey, amount, currency: "KRW" });
    expect(await orderState(orderId)).toEqual({ order: "refunded", entitlements: 1, active: 0, payments: 1 });
    const refund = await admin.query<{ status: string; provider_refund_id: string; succeeded: string }>(
      `select r.status, r.provider_refund_id,
              (select count(*) from billing.audit_events a where a.entity_id = $1 and a.action = 'refund.succeeded') as succeeded
         from billing.refunds r join billing.payments p on p.id = r.payment_id where p.order_id = $1::uuid`,
      [orderId],
    );
    expect(refund.rows).toEqual([{ status: "succeeded", provider_refund_id: "it-cancel-1,it-cancel-2", succeeded: "1" }]);
  });

  it("restores a paid order when the provider definitively rejects the cancellation", async () => {
    const service = await import("@/server/billing/service");
    const { orderId, amount } = await seedPendingOrder();
    const payment = donePayment(orderId, amount);
    await service.applyTossPaymentEvent({
      eventId: `it-event-${randomUUID()}`, eventType: "PAYMENT_STATUS_CHANGED", payloadHash: service.paymentEventHash(payment), payment,
    });

    const reservation = await service.reserveAdminRefund(orderId, userId, "it-admin-refund");
    await service.failReservedRefund({ refundId: reservation.id, orderId, errorCode: "provider_cancel_rejected" });

    expect(await orderState(orderId)).toEqual({ order: "paid", entitlements: 1, active: 1, payments: 1 });
    await expect(service.applyTossCancellation({ orderId, refundId: reservation.id, providerRefundId: null }))
      .rejects.toMatchObject({ reason: "payment_state_invalid" });
  });
});
