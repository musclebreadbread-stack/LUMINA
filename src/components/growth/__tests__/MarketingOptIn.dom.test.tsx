import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingOptIn } from "../MarketingOptIn";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: {
    readonly children: import("react").ReactNode;
    readonly href: string;
    readonly className?: string;
  }) => <a href={href} className={className}>{children}</a>,
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RETURN_TO = "/premium/saju-2027";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("MarketingOptIn", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderAndSettle(node: React.ReactNode): Promise<void> {
    act(() => root.render(node));
    await flush();
  }

  it("sends a signed-out visitor to sign-in and back to the product page", async () => {
    fetchMock.mockResolvedValue(json(401, { error: "sign_in_or_required_consents_missing" }));
    await renderAndSettle(<MarketingOptIn locale="ko" returnTo={RETURN_TO} canSubscribe />);

    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(`/account/sign-in?returnTo=${encodeURIComponent(RETURN_TO)}`);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("never pre-checks consent and keeps the sign-up button disabled until it is given", async () => {
    fetchMock.mockResolvedValue(json(200, { status: "not_opted_in" }));
    await renderAndSettle(<MarketingOptIn locale="ko" returnTo={RETURN_TO} canSubscribe />);

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const button = container.querySelector("button");
    expect(checkbox?.checked).toBe(false);
    expect(button?.disabled).toBe(true);

    act(() => checkbox?.click());
    expect(container.querySelector("button")?.disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the initial status read
  });

  it("subscribes with an explicit POST and then offers to turn the notification off", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { status: "not_opted_in" }))
      .mockResolvedValueOnce(json(200, { status: "subscribed" }));
    await renderAndSettle(<MarketingOptIn locale="en" returnTo={RETURN_TO} canSubscribe />);

    act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click());
    act(() => container.querySelector("button")?.click());
    await flush();

    const [, init] = fetchMock.mock.calls[1] ?? [];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ subscribed: true });
    expect(container.textContent).toContain("You're signed up for the notification.");
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector("button")?.textContent).toBe("Turn off the notification");
  });

  it("turns the notification off from the subscribed state without re-reading status first", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { status: "unsubscribed" }));
    await renderAndSettle(<MarketingOptIn locale="ko" initialStatus="subscribed" canSubscribe />);
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => container.querySelector("button")?.click());
    await flush();

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({ subscribed: false });
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it("renders nothing once sign-up is closed and the member is not subscribed", async () => {
    await renderAndSettle(<MarketingOptIn locale="ko" initialStatus="not_opted_in" canSubscribe={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("still lets an already-subscribed member turn it off after sign-up closes", async () => {
    await renderAndSettle(<MarketingOptIn locale="ko" initialStatus="subscribed" canSubscribe={false} />);
    expect(container.querySelector("button")?.textContent).toBe("알림 해지");
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("keeps the current state and shows an error when saving fails", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { status: "not_opted_in" }))
      .mockResolvedValueOnce(json(403, { error: "marketing_subscription_not_enabled" }));
    await renderAndSettle(<MarketingOptIn locale="ko" returnTo={RETURN_TO} canSubscribe />);

    act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click());
    act(() => container.querySelector("button")?.click());
    await flush();

    expect(container.textContent).toContain("선택을 저장하지 못했습니다");
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(container.textContent).not.toContain("알림을 신청하셨습니다");
  });

  it("says the sign-up is unavailable when the status cannot be read", async () => {
    fetchMock.mockResolvedValue(json(503, { error: "marketing_preference_unavailable" }));
    await renderAndSettle(<MarketingOptIn locale="ko" returnTo={RETURN_TO} canSubscribe />);
    expect(container.textContent).toContain("알림 신청을 확인할 수 없습니다");
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
