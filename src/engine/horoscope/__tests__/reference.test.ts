import { describe, expect, it } from "vitest";
import { createHoroscopeReference } from "../reference";

describe("운세 기준점", () => {
  it("기본 별자리 기준과 개인화 나탈 기준을 구분한다", () => {
    const signReference = createHoroscopeReference("zodiac", "aries", "2026-08-20");
    expect(signReference.basis).toBe("sign");
    expect(signReference.precision).toBe("whole-sign");
    expect(signReference.signIndex).toBe(0);

    const natalReference = createHoroscopeReference("zodiac", "aries", "2026-08-20", {
      personalized: true,
    });
    expect(natalReference.basis).toBe("natal");
    expect(natalReference.precision).toBe("degree");
    expect(Object.isFrozen(natalReference)).toBe(true);
  });

  it("존재하지 않는 기준 별자리는 오류로 알린다", () => {
    expect(() => createHoroscopeReference("chinese", "not-a-sign", "2026-08-20")).toThrow(
      "unknown chinese sign",
    );
  });
});
