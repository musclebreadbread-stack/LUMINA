import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendVercelEvent = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: sendVercelEvent }));

import { AnalysisEntryTracker, AnalysisResultTracker } from "../AnalysisTracker";
import { ShareLandingAnalytics } from "@/components/report/ShareLandingAnalytics";
import { notifyConsentChanged, saveConsent } from "@/lib/consent";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Analysis trackers", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    sendVercelEvent.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
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

    expect(sendVercelEvent).not.toHaveBeenCalled();

    act(() => {
      saveConsent("accepted");
      notifyConsentChanged();
    });

    await vi.waitFor(() => {
      expect(sendVercelEvent).toHaveBeenCalledTimes(2);
    });
    expect(sendVercelEvent).toHaveBeenNthCalledWith(1, "solution_entry", { analysis: "saju" });
    expect(sendVercelEvent).toHaveBeenNthCalledWith(2, "result_view", { analysis: "saju" });
  });

  it("waits for consent before recording a share landing view", async () => {
    act(() => {
      root.render(<ShareLandingAnalytics analysisKey="jungian" />);
    });

    expect(sendVercelEvent).not.toHaveBeenCalled();

    act(() => {
      saveConsent("accepted");
      notifyConsentChanged();
    });

    await vi.waitFor(() => {
      expect(sendVercelEvent).toHaveBeenCalledTimes(1);
    });
    expect(sendVercelEvent).toHaveBeenCalledWith("share_landing_view", { analysis: "jungian" });
  });
});
