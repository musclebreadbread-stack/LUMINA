import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveConsent } from "@/lib/consent";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 배치 이름("saju-bottom")을 AdSense 광고 단위 ID로 보내던 회귀를 막는다.
 * 숫자 광고 단위 ID가 없으면 광고 자리를 아예 그리지 않아야 한다.
 */
describe("AdSlot", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function renderSlot() {
    const { AdSlot } = await import("../AdSlot");
    act(() => {
      root.render(<AdSlot slot="saju-bottom" label="ad" />);
    });
  }

  it("renders nothing without a numeric ad unit ID even when consent and client exist", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", "");
    saveConsent("accepted");
    await renderSlot();

    expect(container.innerHTML).toBe("");
  });

  it("requests the configured ad unit, not the placement name", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT", "ca-pub-1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_SLOT_ID", "9876543210");
    saveConsent("accepted");
    await renderSlot();

    const unit = container.querySelector("ins.adsbygoogle");
    expect(unit?.getAttribute("data-ad-slot")).toBe("9876543210");
    expect(unit?.getAttribute("data-ad-client")).toBe("ca-pub-1234567890123456");
    expect(container.querySelector("[data-ad-placement='saju-bottom']")).not.toBeNull();
  });
});
