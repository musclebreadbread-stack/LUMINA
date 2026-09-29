import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRefundForm } from "../AdminRefundForm";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORDER_ID = "33333333-3333-4333-8333-333333333333";

describe("AdminRefundForm", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows a reason dropdown and sends the chosen reason for a normal (paid-order) refund", async () => {
    act(() => root.render(<AdminRefundForm orderId={ORDER_ID} locale="ko" />));

    expect(container.querySelector("select")).not.toBeNull();
    const button = container.querySelector("button");
    expect(button?.textContent).toBe("환불");

    await act(async () => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ orderId: ORDER_ID, reasonCode: "manual_review" });
  });

  it("hides the reason dropdown and sends a fixed 'retry' reason for a stuck refunding order", async () => {
    act(() => root.render(<AdminRefundForm orderId={ORDER_ID} locale="ko" isRetry />));

    expect(container.querySelector("select")).toBeNull();
    const button = container.querySelector("button");
    expect(button?.textContent).toBe("환불 재시도");

    await act(async () => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ orderId: ORDER_ID, reasonCode: "retry" });

    const status = container.querySelector("[role='status']");
    expect(status?.textContent).toBe("환불 재시도를 처리했습니다.");
  });
});
