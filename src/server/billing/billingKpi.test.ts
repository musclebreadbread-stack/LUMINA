import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type BillingKpiRow = Readonly<{
  mrr_krw: string;
  net_revenue_30d_krw: string;
  active_payers_30d: number;
  paid_orders_30d: number;
  refunded_orders_30d: number;
}>;

const { queryMock, getAIUsageCostSummaryMock } = vi.hoisted(() => ({
  queryMock: vi.fn<
    (statement: string, values?: readonly unknown[]) => Promise<{ rows: BillingKpiRow[] }>
  >(),
  getAIUsageCostSummaryMock: vi.fn<
    () => Promise<{ costMicrousd: number; estimatedRequests: number }>
  >(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./workerDatabase", () => ({ withBillingTransaction: vi.fn() }));
vi.mock("@/server/ai/service", () => ({ getAIUsageCostSummary: getAIUsageCostSummaryMock }));

import { getBillingKpiSummary } from "./service";
import { withBillingTransaction } from "./workerDatabase";

const paidAndRefundedOrders: BillingKpiRow = {
  mrr_krw: "12000",
  net_revenue_30d_krw: "9000",
  active_payers_30d: 3,
  paid_orders_30d: 4,
  refunded_orders_30d: 1,
};

function configureDatabase(row: BillingKpiRow | null): void {
  queryMock.mockImplementation(async () => ({ rows: row ? [row] : [] }));

  const client = { query: queryMock } as unknown as PoolClient;
  vi.mocked(withBillingTransaction).mockImplementation(async (operation) => operation(client));
}

describe("billing KPI summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BILLING_DATABASE_URL", "postgres://billing.invalid/database");
    vi.stubEnv("REPORTING_KRW_PER_USD", "1500");
    getAIUsageCostSummaryMock.mockResolvedValue({ costMicrousd: 4_500_000, estimatedRequests: 12 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps cohort sales and operating ratios, including refunds linked to the cohort", async () => {
    configureDatabase(paidAndRefundedOrders);

    await expect(getBillingKpiSummary()).resolves.toMatchObject({
      netRevenue30dKrw: 9_000,
      mrrKrw: 12_000,
      arppuKrw: 3_000,
      refundRatePercent: 25,
      activePayers30d: 3,
      aiCostUsd30d: 4.5,
      aiCostSharePercent: 75,
      aiEstimatedRequests30d: 12,
      calculatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u),
    });

    const statement = queryMock.mock.calls[0]?.[0]?.replace(/\s+/gu, " ").toLowerCase();
    expect(statement).toContain("o.paid_at >= now() - interval '30 days'");
    expect(statement).toContain("join paid_period pp on pp.id = p.order_id");
    expect(statement).toContain("join payment_orders po on po.payment_id = r.payment_id");
    expect(statement).toContain("where r.status = 'succeeded'");
    expect(statement).toContain("left join succeeded_refunds_by_payment r on r.payment_id = po.payment_id");
    expect(statement).not.toContain("processed_at");
  });

  it("returns a zero baseline with null ratios when there are no paid orders", async () => {
    configureDatabase({
      mrr_krw: "0",
      net_revenue_30d_krw: "0",
      active_payers_30d: 0,
      paid_orders_30d: 0,
      refunded_orders_30d: 0,
    });

    await expect(getBillingKpiSummary()).resolves.toMatchObject({
      netRevenue30dKrw: 0,
      mrrKrw: 0,
      activePayers30d: 0,
      arppuKrw: null,
      refundRatePercent: null,
      aiCostSharePercent: null,
      calculatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u),
    });

    const statement = queryMock.mock.calls[0]?.[0]?.replace(/\s+/gu, " ").toLowerCase();
    expect(statement).toContain("from active left join paid_period pp on true");
    expect(statement).toContain("count(pp.id)::int as paid_orders_30d");
  });

  it("returns null when billing storage is not configured", async () => {
    vi.stubEnv("BILLING_DATABASE_URL", " ");

    await expect(getBillingKpiSummary()).resolves.toBeNull();
    expect(withBillingTransaction).not.toHaveBeenCalled();
  });
});
