import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocale } from "next-intl/server";
import AdminBillingPage from "./page";
import { getAdminAccess } from "@/server/admin/authorization";
import {
  getBillingChannelSummary,
  getBillingKpiSummary,
  listBillingAdminOrders,
  type BillingKpiSummary,
} from "@/server/billing/service";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: vi.fn() }));
vi.mock("@/server/admin/authorization", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/server/billing/service", () => ({
  getBillingChannelSummary: vi.fn(),
  getBillingKpiSummary: vi.fn(),
  listBillingAdminOrders: vi.fn(),
}));
vi.mock("@/server/growth/marketingPreference", () => ({ getMarketingSubscriberCounts: vi.fn(async () => null) }));

function billingSummary(overrides: Partial<BillingKpiSummary> = {}): BillingKpiSummary {
  return {
    calculatedAt: "2026-09-30T03:00:00.000Z",
    netRevenue30dKrw: 0,
    mrrKrw: 0,
    arppuKrw: null,
    refundRatePercent: null,
    activePayers30d: 0,
    aiCostUsd30d: 2.5,
    aiCostSharePercent: null,
    aiEstimatedRequests30d: 5,
    ...overrides,
  };
}

async function renderAdminBillingPage(): Promise<string> {
  return renderToStaticMarkup(await AdminBillingPage());
}

describe("AdminBillingPage AI cost rate status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", role: "owner", userId: "admin" });
    vi.mocked(getLocale).mockResolvedValue("en");
    vi.mocked(listBillingAdminOrders).mockResolvedValue([]);
    vi.mocked(getBillingChannelSummary).mockResolvedValue(null);
    vi.mocked(getBillingKpiSummary).mockResolvedValue(billingSummary());
  });

  it("explains a zero revenue denominator without claiming FX approval is missing", async () => {
    const englishMarkup = await renderAdminBillingPage();

    expect(englishMarkup).toContain("not calculated without net revenue");
    expect(englishMarkup).not.toContain("finance-approved REPORTING_KRW_PER_USD");

    vi.mocked(getLocale).mockResolvedValue("ko");
    const koreanMarkup = await renderAdminBillingPage();

    expect(koreanMarkup).toContain("순매출이 없어 원가율을 계산할 수 없습니다");
    expect(koreanMarkup).not.toContain("재무 승인 환율 REPORTING_KRW_PER_USD 필요");
  });

  it("reports when AI usage cost data is unavailable", async () => {
    vi.mocked(getBillingKpiSummary).mockResolvedValue(
      billingSummary({ netRevenue30dKrw: 50_000, aiCostUsd30d: null }),
    );

    const markup = await renderAdminBillingPage();

    expect(markup).toContain("AI usage cost data is unavailable");
    expect(markup).not.toContain("finance-approved REPORTING_KRW_PER_USD");
  });

  it("requests the approved FX rate when revenue and AI usage data are available", async () => {
    vi.mocked(getBillingKpiSummary).mockResolvedValue(
      billingSummary({ netRevenue30dKrw: 50_000, aiCostUsd30d: 2.5 }),
    );

    const markup = await renderAdminBillingPage();

    expect(markup).toContain("requires finance-approved REPORTING_KRW_PER_USD");
  });
});
