import { beforeEach, describe, expect, it, vi } from "vitest";

const sendVercelEvent = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: sendVercelEvent }));

import { track } from "../analytics";
import { saveConsent } from "../consent";

/**
 * AdSlot과 같은 게이팅 조건(consent === null이면 신호 없음)과, 타입을 우회한 호출도
 * 런타임에서 다시 막는지를 검증한다 — 실제 Vercel 스크립트 전송은 목으로 대체한다.
 * consent.ts가 window 존재 여부로 분기하므로 jsdom 프로젝트(.dom.test.tsx)에서 돌린다.
 */
describe("track", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendVercelEvent.mockClear();
  });

  it("does not send when no consent choice has been recorded", () => {
    track("test_start", { analysis: "psychometrics" });
    expect(sendVercelEvent).not.toHaveBeenCalled();
  });

  it("sends a well-formed event once consent is accepted", async () => {
    saveConsent("accepted");
    track("test_start", { analysis: "psychometrics" });
    await vi.waitFor(() => {
      expect(sendVercelEvent).toHaveBeenCalledWith("test_start", { analysis: "psychometrics" });
    });
  });

  it("supports privacy-safe entry, result, compatibility, and integrated report events", async () => {
    saveConsent("accepted");
    track("solution_entry", { analysis: "darktriad" });
    track("result_view", { analysis: "darktriad" });
    track("compatibility_compare", { analysis: "compatibility" });
    track("integrated_report_view", { analysis: "integrated-report" });

    await vi.waitFor(() => {
      expect(sendVercelEvent).toHaveBeenCalledTimes(4);
    });
    expect(sendVercelEvent).toHaveBeenNthCalledWith(1, "solution_entry", { analysis: "darktriad" });
    expect(sendVercelEvent).toHaveBeenNthCalledWith(2, "result_view", { analysis: "darktriad" });
    expect(sendVercelEvent).toHaveBeenNthCalledWith(3, "compatibility_compare", { analysis: "compatibility" });
    expect(sendVercelEvent).toHaveBeenNthCalledWith(4, "integrated_report_view", { analysis: "integrated-report" });
  });

  it("sends a well-formed event once consent is rejected", async () => {
    saveConsent("rejected");
    track("share_open", { analysis: "jungian", method: "web-share" });
    await vi.waitFor(() => {
      expect(sendVercelEvent).toHaveBeenCalledWith("share_open", { analysis: "jungian", method: "web-share" });
    });
  });

  it("drops a call whose analysis value bypasses the type system at runtime", () => {
    saveConsent("accepted");
    track("test_start", { analysis: "not-a-real-key" as never });
    expect(sendVercelEvent).not.toHaveBeenCalled();
  });

  it("rejects the integrated report key for ordinary solution events", () => {
    saveConsent("accepted");
    track("solution_entry", { analysis: "integrated-report" as never });
    expect(sendVercelEvent).not.toHaveBeenCalled();
  });

  it("rejects ordinary solution keys for the integrated report event", () => {
    saveConsent("accepted");
    track("integrated_report_view", { analysis: "saju" as never });
    expect(sendVercelEvent).not.toHaveBeenCalled();
  });

  it("drops a call missing the required method prop for share events", () => {
    saveConsent("accepted");
    track("share_open", { analysis: "jungian" } as never);
    expect(sendVercelEvent).not.toHaveBeenCalled();
  });

  it("drops a call whose value exceeds the short-string length cap", () => {
    saveConsent("accepted");
    track("test_start", { analysis: "a".repeat(25) as never });
    expect(sendVercelEvent).not.toHaveBeenCalled();
  });
});
