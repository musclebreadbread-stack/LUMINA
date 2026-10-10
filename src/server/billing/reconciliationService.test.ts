import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, decryptBillingValueMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  decryptBillingValueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: vi.fn() }));
vi.mock("./crypto", () => ({
  decryptBillingValue: decryptBillingValueMock,
  encryptBillingValue: vi.fn(),
  encryptPaymentKey: vi.fn(),
  paymentKeyDigest: vi.fn(),
}));

import { BillingAccessError, BillingInputError, getAdminRefundReconciliationTarget } from "./service";
import { withBillingTransaction } from "./workerDatabase";

const orderId = "123e4567-e89b-42d3-a456-426614174000";

const validReconciliationRow = {
  refund_id: "refund-1",
  order_id: orderId,
  order_amount: 9_900,
  order_currency: "KRW",
  refund_amount: 9_900,
  payment_amount: 9_900,
  payment_currency: "KRW",
  provider: "toss",
  encrypted_key: "encrypted-payment-key",
  key_version: 2,
};

function configureDatabase(rows: readonly typeof validReconciliationRow[]): string[] {
  const statements: string[] = [];
  queryMock.mockImplementation(async (statement: string, parameters?: readonly unknown[]) => {
    statements.push(statement.replace(/\s+/gu, " ").trim().toLowerCase());
    expect(parameters).toEqual([orderId]);
    return { rows };
  });

  const client = { query: queryMock } as unknown as PoolClient;
  vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));
  return statements;
}

describe("admin refund reconciliation database boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");
    decryptBillingValueMock.mockReturnValue("provider-payment-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects malformed identifiers and unavailable billing storage before querying", async () => {
    await expect(getAdminRefundReconciliationTarget("not-an-order-id"))
      .rejects.toBeInstanceOf(BillingInputError);

    vi.stubEnv("BILLING_DATABASE_URL", " ");
    await expect(getAdminRefundReconciliationTarget(orderId))
      .rejects.toBeInstanceOf(BillingAccessError);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns no target unless exactly one pending refund row matches", async () => {
    configureDatabase([]);
    await expect(getAdminRefundReconciliationTarget(orderId)).resolves.toBeNull();

    configureDatabase([validReconciliationRow, validReconciliationRow]);
    await expect(getAdminRefundReconciliationTarget(orderId)).resolves.toBeNull();
    expect(decryptBillingValueMock).not.toHaveBeenCalled();
  });

  it.each([
    ["provider", { ...validReconciliationRow, provider: "fake" }],
    ["order amount", { ...validReconciliationRow, order_amount: 9_901 }],
    ["refund amount", { ...validReconciliationRow, refund_amount: 9_899 }],
    ["payment amount", { ...validReconciliationRow, payment_amount: 9_901 }],
    ["order currency", { ...validReconciliationRow, order_currency: "USD" }],
    ["payment currency", { ...validReconciliationRow, payment_currency: "USD" }],
  ] as const)("rejects a target with a mismatched %s", async (_mismatch, row) => {
    configureDatabase([row]);

    await expect(getAdminRefundReconciliationTarget(orderId)).resolves.toBeNull();
    expect(decryptBillingValueMock).not.toHaveBeenCalled();
  });

  it("decrypts the payment key only for an exact Toss full-refund target", async () => {
    const statements = configureDatabase([validReconciliationRow]);

    await expect(getAdminRefundReconciliationTarget(orderId)).resolves.toEqual({
      id: validReconciliationRow.refund_id,
      orderId,
      paymentKey: "provider-payment-key",
      amount: 9_900,
      currency: "KRW",
    });

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("where o.id = $1 and o.status = 'refunding' and r.status = 'pending'");
    expect(statements[0]).toContain("for update of o, p, r");
    expect(decryptBillingValueMock).toHaveBeenCalledWith("encrypted-payment-key", "payment-key", orderId, 2);
  });
});
