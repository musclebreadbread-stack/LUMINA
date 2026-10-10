import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberProfile } from "@/server/member/profileSchema";
import { CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION } from "@/server/yearForecastApproval";

const {
  getLocaleMock,
  isMemberAuthConfiguredMock,
  getSignedInMemberMock,
  getOwnProfileMock,
  hasOwnEntitlementMock,
  markOwnEntitlementViewedMock,
  getOwnBoundProfileMock,
  getOwnPendingReportOpenOrderIdMock,
} = vi.hoisted(() => ({
  getLocaleMock: vi.fn(),
  isMemberAuthConfiguredMock: vi.fn(),
  getSignedInMemberMock: vi.fn(),
  getOwnProfileMock: vi.fn(),
  hasOwnEntitlementMock: vi.fn(),
  markOwnEntitlementViewedMock: vi.fn(),
  getOwnBoundProfileMock: vi.fn(),
  getOwnPendingReportOpenOrderIdMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: { href: string; children?: ReactNode; className?: string }) =>
      createElement("a", { href: props.href, className: props.className }, props.children),
  };
});
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: getLocaleMock }));
vi.mock("@/components/i18n/LocaleSwitcher", () => ({ LocaleSwitcher: () => null }));
vi.mock("@/components/premium/NarrativeChapters", () => ({ NarrativeChapters: () => null }));
vi.mock("@/server/ai/settings", () => ({ isAIReportingEnabled: () => false }));
vi.mock("@/server/auth", () => ({ isMemberAuthConfigured: isMemberAuthConfiguredMock }));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/dal", () => ({
  MemberAccessError: class MemberAccessError extends Error {},
  getOwnProfile: getOwnProfileMock,
}));
vi.mock("@/server/billing/service", () => ({
  BillingAccessError: class BillingAccessError extends Error {},
  hasOwnEntitlement: hasOwnEntitlementMock,
  markOwnEntitlementViewed: markOwnEntitlementViewedMock,
}));
vi.mock("@/server/premium/reportContext", () => ({
  getOwnBoundProfile: getOwnBoundProfileMock,
  getOwnPendingReportOpenOrderId: getOwnPendingReportOpenOrderIdMock,
}));

import Saju2027ReportPage from "./page";

const profile = {
  year: 1990,
  month: 5,
  day: 15,
  calendar: "solar",
  isLeapMonth: false,
  hour: 14,
  minute: 30,
  gender: "male",
  dayBoundaryRule: "zi23",
  placeLabel: "서울",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
} satisfies MemberProfile;

async function renderReportPage(): Promise<string> {
  return renderToStaticMarkup(await Saju2027ReportPage());
}

describe("Saju2027ReportPage expert review status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLocaleMock.mockResolvedValue("ko");
    isMemberAuthConfiguredMock.mockReturnValue(true);
    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    getOwnProfileMock.mockResolvedValue(profile);
    hasOwnEntitlementMock.mockResolvedValue(true);
    markOwnEntitlementViewedMock.mockResolvedValue(true);
    getOwnBoundProfileMock.mockResolvedValue(profile);
    getOwnPendingReportOpenOrderIdMock.mockResolvedValue(null);
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "false");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ["pending approval", "false", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION, "전문가 검수 상태: 대기 중.", false],
    ["approved current report", "true", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION, "전문가 검수 상태: 승인됨.", true],
    ["stale report approval", "true", "2027-saju-report-v0", "전문가 검수 상태: 대기 중.", false],
  ] as const)("shows %s accurately", async (_case, approved, version, status, reportVisible) => {
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", approved);
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", version);

    const markup = await renderReportPage();

    expect(markup).toContain(status);
    // Rendering never marks a report viewed; that only happens from the explicit open POST.
    expect(markOwnEntitlementViewedMock).not.toHaveBeenCalled();
    if (reportVisible) {
      expect(markup).toContain("계산 근거");
    } else {
      expect(markup).toContain("구매 권한은 유지됩니다. 전문가 검수가 완료되면 보고서를 열람할 수 있습니다.");
      expect(markup).not.toContain("계산 근거");
    }
  });

  it("asks an approved report's buyer to open it explicitly before showing it", async () => {
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "true");
    getOwnPendingReportOpenOrderIdMock.mockResolvedValue("order-1");

    const markup = await renderReportPage();

    expect(markup).toContain('action="/api/billing/orders/order-1/open"');
    expect(markup).not.toContain("계산 근거");
  });

  it("does not offer the open gate while expert review is pending", async () => {
    getOwnPendingReportOpenOrderIdMock.mockResolvedValue("order-1");

    const markup = await renderReportPage();

    expect(markup).not.toContain("/api/billing/orders/order-1/open");
    expect(markup).toContain("구매 권한은 유지됩니다. 전문가 검수가 완료되면 보고서를 열람할 수 있습니다.");
    expect(getOwnPendingReportOpenOrderIdMock).not.toHaveBeenCalled();
  });
});
