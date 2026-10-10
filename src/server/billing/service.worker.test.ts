import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = Readonly<{
  rows: readonly Record<string, unknown>[];
  rowCount: number | null;
}>;

const { billingQueryMock } = vi.hoisted(() => ({
  billingQueryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<QueryResult>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: { billing: false } }));
vi.mock("@/server/auth", () => ({ isMemberAuthConfigured: () => false }));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: vi.fn() }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: vi.fn() }));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));
vi.mock("./crypto", () => ({
  decryptBillingValue: vi.fn(),
  encryptBillingValue: vi.fn(),
  encryptPaymentKey: vi.fn(),
  paymentKeyDigest: vi.fn(),
}));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: vi.fn() }));

import {
  cancelExpiredUnpaidOrder,
  claimReceiptEmailJobs,
  listTossReconcileOrders,
  markReceiptEmailSent,
} from "./service";
import { withBillingTransaction } from "./workerDatabase";

const workerClient = { query: billingQueryMock } as unknown as PoolClient;

function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

describe("billing worker service transitions", () => {
  beforeEach(() => {
    billingQueryMock.mockReset();
    billingQueryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    vi.mocked(withBillingTransaction).mockReset();
    vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(workerClient));
  });

  it.each([
    { limit: -4, expectedLimit: 1 },
    { limit: 8.9, expectedLimit: 8 },
    { limit: 250, expectedLimit: 100 },
  ])("bounds the Toss reconciliation batch to $expectedLimit rows", async ({ limit, expectedLimit }) => {
    const expiresAt = new Date("2026-10-01T00:00:00.000Z");
    billingQueryMock.mockResolvedValue({
      rows: [{ id: "order-1", expires_at: expiresAt }],
      rowCount: 1,
    });

    await expect(listTossReconcileOrders(limit)).resolves.toEqual([{ id: "order-1", expiresAt }]);

    const [statement, parameters] = billingQueryMock.mock.calls[0] ?? [];
    const sql = normalize(statement ?? "");
    expect(parameters).toEqual([expectedLimit]);
    expect(sql).toContain("where provider = 'toss' and status = 'pending'");
    expect(sql).toContain("created_at >= now() - interval '14 days'");
    expect(sql).toContain("order by expires_at asc");
    expect(sql).toContain("limit $1");
  });

  it.each([
    { rowCount: 1, expected: true },
    { rowCount: 0, expected: false },
    { rowCount: null, expected: false },
  ])("cancels only a still-pending expired Toss order (rowCount $rowCount)", async ({ rowCount, expected }) => {
    billingQueryMock.mockResolvedValue({ rows: [], rowCount });

    await expect(cancelExpiredUnpaidOrder("order-1")).resolves.toBe(expected);

    const [statement, parameters] = billingQueryMock.mock.calls[0] ?? [];
    const sql = normalize(statement ?? "");
    expect(parameters).toEqual(["order-1"]);
    expect(sql).toContain("where id = $1 and provider = 'toss' and status = 'pending'");
    expect(sql).toContain("expires_at <= now()");
    expect(sql).toContain("returning id");
  });

  it("claims paid receipt jobs with a bounded batch and safe retry/lease rules", async () => {
    const paidAt = new Date("2026-09-30T03:00:00.000Z");
    billingQueryMock.mockResolvedValue({
      rows: [{
        order_id: "order-1",
        attempt_count: 3,
        ciphertext: "receipt-ciphertext",
        key_version: 2,
        locale: "ko",
        product_name: "2027 report",
        amount: 9_900,
        currency: "KRW",
        paid_at: paidAt,
      }],
      rowCount: 1,
    });

    await expect(claimReceiptEmailJobs(99)).resolves.toEqual([{
      orderId: "order-1",
      attemptCount: 3,
      ciphertext: "receipt-ciphertext",
      keyVersion: 2,
      locale: "ko",
      productName: "2027 report",
      amount: 9_900,
      currency: "KRW",
      paidAt,
    }]);

    const [statement, parameters] = billingQueryMock.mock.calls[0] ?? [];
    const sql = normalize(statement ?? "");
    expect(parameters).toEqual([10]);
    expect(sql).toContain("e.attempt_count < 20");
    expect(sql).toContain("e.status = 'pending' or (e.status = 'processing' and e.lock_expires_at <= now())");
    expect(sql).toContain("o.status = 'paid' and o.paid_at is not null");
    expect(sql).toContain("for update of e skip locked");
    expect(sql).toContain("limit $1");
    expect(sql).toContain("set status = 'processing', attempt_count = e.attempt_count + 1");
    expect(sql).toContain("attempt_count = e.attempt_count + 1");
    expect(sql).toContain("lock_expires_at = now() + interval '5 minutes'");
  });

  it.each([
    { rowCount: 1, expected: true },
    { rowCount: 0, expected: false },
  ])("marks only the currently claimed receipt attempt sent (rowCount $rowCount)", async ({ rowCount, expected }) => {
    billingQueryMock.mockResolvedValue({ rows: [], rowCount });
    const providerMessageId = "m".repeat(250);

    await expect(markReceiptEmailSent("order-1", 4, providerMessageId)).resolves.toBe(expected);

    const [statement, parameters] = billingQueryMock.mock.calls[0] ?? [];
    const sql = normalize(statement ?? "");
    expect(parameters).toEqual(["order-1", 4, providerMessageId.slice(0, 200)]);
    expect(sql).toContain("where order_id = $1 and status = 'processing' and attempt_count = $2");
    expect(sql).toContain("provider_message_id = $3");
    expect(sql).toContain("lock_expires_at = null");
    expect(sql).toContain("returning id");
  });
});
