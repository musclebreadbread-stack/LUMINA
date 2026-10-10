import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutButton } from "../CheckoutButton";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    onClick,
  }: {
    readonly children: import("react").ReactNode;
    readonly href: string;
    readonly className: string;
    readonly onClick?: import("react").MouseEventHandler<HTMLAnchorElement>;
  }) => <a href={href} className={className} onClick={onClick}>{children}</a>,
}));

const sendUmamiEvent = vi.hoisted(() => vi.fn((payload: unknown) => { void payload; }));

import {
  PremiumReportFreeAnalysisLink,
  PremiumReportViewTracker,
} from "../PremiumReportAnalytics";
import { notifyConsentChanged, saveConsent } from "@/lib/consent";

function isUmamiEventFactory(
  value: unknown,
): value is (properties: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>> {
  return typeof value === "function";
}

function eventPayloadAt(index: number): Readonly<Record<string, unknown>> {
  const payload = sendUmamiEvent.mock.calls[index]?.[0];
  if (!isUmamiEventFactory(payload)) throw new Error("Expected a privacy-safe Umami event factory");
  return payload({});
}

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Premium report funnel trackers", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    sendUmamiEvent.mockClear();
    window.umami = { track: sendUmamiEvent };
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website-id");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.umami;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("waits for a consent choice and records a page view once in Strict Mode", async () => {
    act(() => root.render(<StrictMode><PremiumReportViewTracker /></StrictMode>));
    expect(sendUmamiEvent).not.toHaveBeenCalled();

    act(() => {
      saveConsent("accepted");
      notifyConsentChanged();
    });

    await vi.waitFor(() => expect(sendUmamiEvent).toHaveBeenCalledTimes(1));
    expect(eventPayloadAt(0)).toMatchObject({
      name: "premium_report_view__saju",
      data: { analysis: "saju" },
    });
  });

  it("tracks the free analysis click without changing its destination", () => {
    saveConsent("rejected");
    act(() => {
      root.render(
        <PremiumReportFreeAnalysisLink className="report-cta">Start free analysis</PremiumReportFreeAnalysisLink>,
      );
    });

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/saju");
    expect(link?.className).toBe("report-cta");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    click.preventDefault();
    act(() => link?.dispatchEvent(click));

    expect(sendUmamiEvent).toHaveBeenCalledTimes(1);
    expect(eventPayloadAt(0)).toMatchObject({
      name: "premium_report_free_analysis_click__saju",
      data: { analysis: "saju" },
    });
  });

  it("records checkout start only after required notices are checked", async () => {
    saveConsent("accepted");
    sendUmamiEvent.mockImplementation(() => {
      throw new Error("analytics unavailable");
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ error: "billing_unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    act(() => root.render(<CheckoutButton locale="ko" isEuCountry={false} />));
    const button = container.querySelector("button");
    const notices = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(button).not.toBeNull();
    expect(notices).toHaveLength(1);

    act(() => button?.click());
    expect(sendUmamiEvent).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      notices[0]?.click();
    });
    await act(async () => {
      button?.click();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });
    expect(sendUmamiEvent).toHaveBeenCalledTimes(1);
    expect(eventPayloadAt(0)).toMatchObject({
      name: "premium_report_checkout_start__saju",
      data: { analysis: "saju" },
    });
  });
});
