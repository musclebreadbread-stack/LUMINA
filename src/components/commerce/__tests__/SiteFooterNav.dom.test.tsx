import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { SiteFooterNav } from "../SiteFooterNav";

const pathname = vi.hoisted(() => ({ value: "/saju" as string | null }));
const getSession = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, className }: {
    readonly children: import("react").ReactNode;
    readonly href: string;
    readonly className?: string;
  }) => <a href={href} className={className}>{children}</a>,
}));
vi.mock("@/lib/auth-client", () => ({
  accountAuthClient: { getSession, signOut: vi.fn() },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SiteFooterNav", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pathname.value = "/saju";
    getSession.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderNav(props: { readonly locale?: "ko" | "en"; readonly memberAuthEnabled: boolean }): void {
    act(() => {
      root.render(
        <NextIntlClientProvider locale="ko" messages={messages}>
          <SiteFooterNav locale={props.locale ?? "ko"} memberAuthEnabled={props.memberAuthEnabled} />
        </NextIntlClientProvider>,
      );
    });
  }

  function hrefs(): string[] {
    return Array.from(container.querySelectorAll("a")).map((link) => link.getAttribute("href") ?? "");
  }

  // jsdom fires the native "toggle" event itself when `open` changes (once, asynchronously), as a
  // browser does — so this only flips the attribute and lets that event run, without dispatching another.
  async function setMenuOpen(open: boolean): Promise<void> {
    const details = container.querySelector("details");
    await act(async () => {
      if (details) details.open = open;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await Promise.resolve();
    });
  }

  it("links pricing, refund, terms and privacy on every page", () => {
    renderNav({ memberAuthEnabled: false });
    expect(hrefs()).toEqual(["/pricing", "/refund-policy", "/terms", "/privacy"]);
  });

  it("prefixes the links for a non-default locale", () => {
    renderNav({ locale: "en", memberAuthEnabled: false });
    expect(hrefs()).toEqual(["/en/pricing", "/en/refund-policy", "/en/terms", "/en/privacy"]);
  });

  it("renders nothing on admin pages, including locale-prefixed ones", () => {
    pathname.value = "/admin/billing";
    renderNav({ memberAuthEnabled: true });
    expect(container.innerHTML).toBe("");

    pathname.value = "/en/admin";
    renderNav({ memberAuthEnabled: true });
    expect(container.innerHTML).toBe("");
  });

  it("still renders on a route that merely starts with the word admin", () => {
    pathname.value = "/administration";
    renderNav({ memberAuthEnabled: false });
    expect(container.querySelector("nav")).not.toBeNull();
  });

  it("hides the account menu when member authentication is not enabled", () => {
    renderNav({ memberAuthEnabled: false });
    expect(container.querySelector("details")).toBeNull();
  });

  it("does not look up the session until the account menu is opened", () => {
    renderNav({ memberAuthEnabled: true });
    expect(container.querySelector("details")).not.toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("offers sign-in to a signed-out visitor after opening the menu", async () => {
    getSession.mockResolvedValue({ data: null, error: null });
    renderNav({ memberAuthEnabled: true });
    await setMenuOpen(true);

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(hrefs()).toContain("/account/sign-in");
    expect(hrefs()).not.toContain("/account");
  });

  it("offers the account, subscriptions and sign-out to a signed-in member", async () => {
    getSession.mockResolvedValue({ data: { user: { email: "member@example.com" }, session: {} }, error: null });
    renderNav({ memberAuthEnabled: true });
    await setMenuOpen(true);

    expect(hrefs()).toEqual(expect.arrayContaining(["/account", "/account/subscriptions"]));
    expect(container.textContent).toContain("로그아웃");
    expect(hrefs()).not.toContain("/account/sign-in");
  });

  it("says the status could not be checked when the lookup fails, and retries on the next open", async () => {
    getSession.mockRejectedValueOnce(new Error("network"));
    renderNav({ memberAuthEnabled: true });
    await setMenuOpen(true);
    expect(container.textContent).toContain("계정 상태를 확인하지 못했습니다");

    getSession.mockResolvedValueOnce({ data: null, error: null });
    await setMenuOpen(false);
    expect(getSession).toHaveBeenCalledTimes(1);
    await setMenuOpen(true);
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(hrefs()).toContain("/account/sign-in");
  });
});
