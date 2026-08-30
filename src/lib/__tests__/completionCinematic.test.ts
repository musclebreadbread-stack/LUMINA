import { describe, expect, it } from "vitest";
import { consumeCompletionArrival, markCompletionArrival } from "@/lib/completionCinematic";

// node 환경(window 없음)에서 SSR 안전 가드만 검증한다 — 브라우저 동작은 .dom.test.tsx가 맡는다.
describe("completion cinematic (no window)", () => {
  it("markCompletionArrival is a no-op without window", () => {
    expect(() => markCompletionArrival("psychometrics")).not.toThrow();
  });

  it("consumeCompletionArrival returns false without window", () => {
    expect(consumeCompletionArrival("psychometrics")).toBe(false);
  });
});
