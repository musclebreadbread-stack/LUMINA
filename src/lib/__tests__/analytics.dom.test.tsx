import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendUmamiEvent = vi.hoisted(() => vi.fn((payload: unknown) => { void payload; }));

import { track } from "../analytics";
import { saveConsent } from "../consent";

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

/**
 * AdSlot과 같은 게이팅 조건(consent === null이면 신호 없음)과, 타입을 우회한 호출도
 * 런타임에서 다시 막는지를 검증한다 — 실제 Vercel 스크립트 전송은 목으로 대체한다.
 * consent.ts가 window 존재 여부로 분기하므로 jsdom 프로젝트(.dom.test.tsx)에서 돌린다.
 */
describe("track", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendUmamiEvent.mockClear();
    window.umami = { track: sendUmamiEvent };
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website-id");
  });

  afterEach(() => {
    delete window.umami;
    vi.unstubAllEnvs();
  });

  it("does not send when no consent choice has been recorded", () => {
    track("test_start", { analysis: "psychometrics" });
    expect(sendUmamiEvent).not.toHaveBeenCalled();
  });

  it("sends a well-formed event once consent is accepted", () => {
    saveConsent("accepted");
    track("test_start", { analysis: "psychometrics" });
    expect(sendUmamiEvent).toHaveBeenCalledTimes(1);
    expect(eventPayloadAt(0)).toEqual({
      website: "test-website-id",
      url: "/",
      name: "test_start__psychometrics",
      data: { analysis: "psychometrics" },
    });
  });

  it("supports privacy-safe entry, result, compatibility, and integrated report events", () => {
    saveConsent("accepted");
    track("solution_entry", { analysis: "darktriad" });
    track("result_view", { analysis: "darktriad" });
    track("compatibility_compare", { analysis: "compatibility" });
    track("integrated_report_view", { analysis: "integrated-report" });

    expect(sendUmamiEvent).toHaveBeenCalledTimes(4);
    expect(eventPayloadAt(0)).toMatchObject({ name: "solution_entry__darktriad", data: { analysis: "darktriad" } });
    expect(eventPayloadAt(1)).toMatchObject({ name: "result_view__darktriad", data: { analysis: "darktriad" } });
    expect(eventPayloadAt(2)).toMatchObject({ name: "compatibility_compare__compatibility", data: { analysis: "compatibility" } });
    expect(eventPayloadAt(3)).toMatchObject({ name: "integrated_report_view__integrated-report", data: { analysis: "integrated-report" } });
  });

  it("sends only categorical properties for the 2027 report funnel events", () => {
    saveConsent("accepted");
    track("premium_report_view", { analysis: "saju" });
    track("premium_report_free_analysis_click", { analysis: "saju" });
    track("premium_report_checkout_start", { analysis: "saju" });

    expect(sendUmamiEvent).toHaveBeenCalledTimes(3);
    expect(eventPayloadAt(0)).toMatchObject({ name: "premium_report_view__saju", data: { analysis: "saju" } });
    expect(eventPayloadAt(1)).toMatchObject({ name: "premium_report_free_analysis_click__saju", data: { analysis: "saju" } });
    expect(eventPayloadAt(2)).toMatchObject({ name: "premium_report_checkout_start__saju", data: { analysis: "saju" } });
    for (let index = 0; index < 3; index += 1) {
      expect(Object.keys(eventPayloadAt(index).data as object)).toEqual(["analysis"]);
    }
  });

  it("sends a well-formed event once consent is rejected", () => {
    saveConsent("rejected");
    track("share_open", { analysis: "jungian", method: "web-share" });
    expect(sendUmamiEvent).toHaveBeenCalledTimes(1);
    expect(eventPayloadAt(0)).toMatchObject({
      name: "share_open__jungian",
      data: { analysis: "jungian", method: "web-share" },
    });
  });

  it("drops a call whose analysis value bypasses the type system at runtime", () => {
    saveConsent("accepted");
    track("test_start", { analysis: "not-a-real-key" as never });
    expect(sendUmamiEvent).not.toHaveBeenCalled();
  });

  it("rejects the integrated report key for ordinary solution events", () => {
    saveConsent("accepted");
    track("solution_entry", { analysis: "integrated-report" as never });
    expect(sendUmamiEvent).not.toHaveBeenCalled();
  });

  it("rejects ordinary solution keys for the integrated report event", () => {
    saveConsent("accepted");
    track("integrated_report_view", { analysis: "saju" as never });
    expect(sendUmamiEvent).not.toHaveBeenCalled();
  });

  it("drops a call missing the required method prop for share events", () => {
    saveConsent("accepted");
    track("share_open", { analysis: "jungian" } as never);
    expect(sendUmamiEvent).not.toHaveBeenCalled();
  });

  it("drops a call whose value exceeds the short-string length cap", () => {
    saveConsent("accepted");
    track("test_start", { analysis: "a".repeat(25) as never });
    expect(sendUmamiEvent).not.toHaveBeenCalled();
  });
});
