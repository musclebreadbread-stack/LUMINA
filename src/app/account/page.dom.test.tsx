import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import type { BillingOrderSummary } from "@/server/billing/service";
import type { SubscriptionSummary } from "@/server/billing/subscriptions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getLocaleMock,
  isMemberAuthConfiguredMock,
  getSignedInMemberMock,
  hasRequiredMemberConsentsMock,
  getOwnSavedResultsMock,
  listOwnShareLinksMock,
  listOwnBillingOrdersMock,
  listOwnSubscriptionsMock,
} = vi.hoisted(() => ({
  getLocaleMock: vi.fn(),
  isMemberAuthConfiguredMock: vi.fn(),
  getSignedInMemberMock: vi.fn(),
  hasRequiredMemberConsentsMock: vi.fn(),
  getOwnSavedResultsMock: vi.fn(),
  listOwnShareLinksMock: vi.fn(),
  listOwnBillingOrdersMock: vi.fn(),
  listOwnSubscriptionsMock: vi.fn(),
}));

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
vi.mock("@/components/account/SignOutButton", () => ({ SignOutButton: () => null }));
vi.mock("@/components/account/ClaimLocalData", () => ({ ClaimLocalData: () => null }));
vi.mock("@/components/account/ShareSavedResults", () => ({ ShareSavedResults: () => null }));
vi.mock("@/components/account/DeleteAccountForm", () => ({ DeleteAccountForm: () => null }));
vi.mock("@/components/account/SelfRefundButton", () => ({ SelfRefundButton: () => null }));
vi.mock("@/components/account/CancelSubscriptionButton", () => ({ CancelSubscriptionButton: () => null }));
vi.mock("@/server/auth", () => ({ isMemberAuthConfigured: isMemberAuthConfiguredMock }));
vi.mock("@/server/auth/session", () => ({ getSignedInMember: getSignedInMemberMock }));
vi.mock("@/server/member/consents", () => ({ hasRequiredMemberConsents: hasRequiredMemberConsentsMock }));
vi.mock("@/server/member/dal", () => ({
  getOwnSavedResults: getOwnSavedResultsMock,
  listOwnShareLinks: listOwnShareLinksMock,
}));
vi.mock("@/server/billing/service", () => ({ listOwnBillingOrders: listOwnBillingOrdersMock }));
vi.mock("@/server/billing/subscriptions", () => ({ listOwnSubscriptions: listOwnSubscriptionsMock }));

import AccountPage from "./page";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const paidOrder = {
  id: "order-1",
  productKey: "saju-2027",
  productName: "Paid 2027 report",
  amount: 9_900,
  currency: "KRW",
  status: "paid",
  createdAt: "2026-09-30T00:00:00.000Z",
  paidAt: "2026-09-30T00:01:00.000Z",
  viewedAt: null,
  canSelfRefund: true,
} satisfies BillingOrderSummary;

const paidSubscription = {
  id: "subscription-1",
  productKey: "lumina-plus-monthly",
  productName: "Paid LUMINA+ monthly",
  status: "active",
  periodEnd: null,
  cancelAtPeriodEnd: false,
} satisfies SubscriptionSummary;

describe("account billing history failures", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    getLocaleMock.mockResolvedValue("ko");
    isMemberAuthConfiguredMock.mockReturnValue(true);
    getSignedInMemberMock.mockResolvedValue({ user: { id: "member-1", email: "member@example.test" } });
    hasRequiredMemberConsentsMock.mockResolvedValue(true);
    getOwnSavedResultsMock.mockResolvedValue([]);
    listOwnShareLinksMock.mockResolvedValue([]);
    listOwnBillingOrdersMock.mockResolvedValue([]);
    listOwnSubscriptionsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("does not present a billing read failure as an empty purchase history", async () => {
    listOwnBillingOrdersMock.mockRejectedValue(new Error("billing storage unavailable"));

    await act(async () => root.render(await AccountPage()));

    expect(container.textContent).toContain("구매 내역을 일시적으로 불러올 수 없습니다.");
    expect(container.textContent).not.toContain("구매 내역이 없습니다.");
    expect(Array.from(container.querySelectorAll("a")).some((link) => link.textContent === "구매 내역 다시 불러오기")).toBe(true);
    expect(container.textContent).toContain("구독 내역이 없습니다.");
  });

  it("keeps purchase history visible when only the subscription read fails", async () => {
    listOwnSubscriptionsMock.mockRejectedValue(new Error("subscription storage unavailable"));

    await act(async () => root.render(await AccountPage()));

    expect(container.textContent).toContain("구매 내역이 없습니다.");
    expect(container.textContent).toContain("구독 내역을 일시적으로 불러올 수 없습니다.");
    expect(container.textContent).not.toContain("구독 내역이 없습니다.");
    expect(Array.from(container.querySelectorAll("a")).some((link) => link.textContent === "구독 내역 다시 불러오기")).toBe(true);
  });

  it("keeps purchase history visible when saved report reads fail", async () => {
    getOwnSavedResultsMock.mockRejectedValue(new Error("saved report storage unavailable"));
    listOwnBillingOrdersMock.mockResolvedValue([paidOrder]);
    listOwnSubscriptionsMock.mockResolvedValue([paidSubscription]);

    await act(async () => root.render(await AccountPage()));

    expect(container.textContent).toContain(paidOrder.productName);
    expect(container.textContent).toContain(paidSubscription.productName);
    expect(container.textContent).not.toContain("No subscriptions.");
    expect(container.textContent).toContain("\uC800\uC7A5\uD55C \uB9AC\uD3EC\uD2B8\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    expect(container.textContent).toContain("\uB9AC\uD3EC\uD2B8 \uACF5\uC720 \uC815\uBCF4\uB97C \uC77C\uC2DC\uC801\uC73C\uB85C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    expect(container.textContent).not.toContain("\uAD6C\uB9E4 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
  });

  it("keeps purchase history visible when share link reads fail", async () => {
    getLocaleMock.mockResolvedValue("en");
    listOwnShareLinksMock.mockRejectedValue(new Error("share link storage unavailable"));
    listOwnBillingOrdersMock.mockResolvedValue([paidOrder]);
    listOwnSubscriptionsMock.mockResolvedValue([paidSubscription]);

    await act(async () => root.render(await AccountPage()));

    expect(container.textContent).toContain(paidOrder.productName);
    expect(container.textContent).toContain(paidSubscription.productName);
    expect(container.textContent).not.toContain("No subscriptions.");
    expect(container.textContent).toContain("No reports have been added to this account yet.");
    expect(container.textContent).toContain("Saved report sharing information is temporarily unavailable.");
    expect(Array.from(container.querySelectorAll("a")).some((link) => link.textContent === "Reload sharing information")).toBe(true);
    expect(container.textContent).not.toContain("No purchases yet.");
  });
});
