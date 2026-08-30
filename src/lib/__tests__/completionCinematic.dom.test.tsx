import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeCompletionArrival, markCompletionArrival } from "../completionCinematic";

describe("completion cinematic storage", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("consumes a matching flag exactly once", () => {
    markCompletionArrival("darktriad");
    expect(consumeCompletionArrival("darktriad")).toBe(true);
    expect(consumeCompletionArrival("darktriad")).toBe(false);
  });

  it("does not let a different analysis key consume another's flag", () => {
    markCompletionArrival("eq");
    expect(consumeCompletionArrival("attachment")).toBe(false);
    // eq 플래그는 그대로 남아 있어야 한다 — 다른 분석 키가 훔쳐 쓰면 안 된다.
    expect(consumeCompletionArrival("eq")).toBe(true);
  });

  it("returns false when nothing was ever marked", () => {
    expect(consumeCompletionArrival("cognitive")).toBe(false);
  });

  it("swallows a storage write failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => markCompletionArrival("psychometrics")).not.toThrow();
  });

  it("swallows a storage read failure", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access blocked");
    });
    expect(consumeCompletionArrival("psychometrics")).toBe(false);
  });
});
