import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { captureFirstTouchAttribution, getStoredAttribution } from "../attribution";

describe("첫 터치 귀속 캡처", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("UTM 파라미터와 랜딩 경로를 그대로 저장한다", () => {
    captureFirstTouchAttribution({ search: "?utm_source=naver&utm_medium=search&utm_campaign=2027", pathname: "/saju/2027/dragon" });
    const stored = getStoredAttribution();
    expect(stored?.source).toBe("naver");
    expect(stored?.medium).toBe("search");
    expect(stored?.campaign).toBe("2027");
    expect(stored?.landingPath).toBe("/saju/2027/dragon");
    expect(typeof stored?.capturedAt).toBe("string");
  });

  it("UTM 파라미터가 없는 오가닉 방문도 landingPath만으로 캡처된다", () => {
    captureFirstTouchAttribution({ search: "", pathname: "/saju/2027" });
    const stored = getStoredAttribution();
    expect(stored?.source).toBeNull();
    expect(stored?.medium).toBeNull();
    expect(stored?.campaign).toBeNull();
    expect(stored?.landingPath).toBe("/saju/2027");
  });

  it("이미 저장된 값이 있으면 두 번째 호출로 절대 덮어쓰지 않는다 — 첫 터치가 늘 이긴다", () => {
    captureFirstTouchAttribution({ search: "?utm_source=first", pathname: "/first-page" });
    captureFirstTouchAttribution({ search: "?utm_source=second", pathname: "/second-page" });
    const stored = getStoredAttribution();
    expect(stored?.source).toBe("first");
    expect(stored?.landingPath).toBe("/first-page");
  });

  it("아무것도 저장된 게 없으면 null을 반환한다", () => {
    expect(getStoredAttribution()).toBeNull();
  });

  it("저장 실패를 조용히 삼킨다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => captureFirstTouchAttribution({ search: "", pathname: "/" })).not.toThrow();
  });

  it("읽기 실패를 조용히 삼키고 null을 반환한다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access blocked");
    });
    expect(getStoredAttribution()).toBeNull();
  });

  it("손상된 JSON이 저장돼 있어도 throw하지 않고 null을 반환한다", () => {
    window.sessionStorage.setItem("lumina.attribution.v1", "{not valid json");
    expect(getStoredAttribution()).toBeNull();
  });
});
