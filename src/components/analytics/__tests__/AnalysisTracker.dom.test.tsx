import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendUmamiEvent = vi.hoisted(() => vi.fn((payload: unknown) => { void payload; }));

import { AnalysisEntryTracker, AnalysisResultTracker } from "../AnalysisTracker";
import { ShareLandingAnalytics } from "@/components/report/ShareLandingAnalytics";
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

describe("Analysis trackers", () => {
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
    vi.unstubAllEnvs();
  });

  it("waits for a consent choice, then records entry and result once the choice changes", async () => {
    act(() => {
      root.render(
        <>
          <AnalysisEntryTracker analysis="saju" />
          <AnalysisResultTracker analysis="saju" />
        </>,
      );
    });

    expect(sendUmamiEvent).not.toHaveBeenCalled();

    act(() => {
      saveConsent("accepted");
      notifyConsentChanged();
    });

    await vi.waitFor(() => {
      expect(sendUmamiEvent).toHaveBeenCalledTimes(2);
    });
    expect(eventPayloadAt(0)).toMatchObject({ name: "solution_entry__saju", data: { analysis: "saju" } });
    expect(eventPayloadAt(1)).toMatchObject({ name: "result_view__saju", data: { analysis: "saju" } });
  });

  it("waits for consent before recording a share landing view", async () => {
    act(() => {
      root.render(<ShareLandingAnalytics analysisKey="jungian" />);
    });

    expect(sendUmamiEvent).not.toHaveBeenCalled();

    act(() => {
      saveConsent("accepted");
      notifyConsentChanged();
    });

    await vi.waitFor(() => {
      expect(sendUmamiEvent).toHaveBeenCalledTimes(1);
    });
    expect(eventPayloadAt(0)).toMatchObject({ name: "share_landing_view__jungian", data: { analysis: "jungian" } });
  });
});
