import { describe, expect, it } from "vitest";
import { BirthInputError } from "@engine/shared/birth";
import { computeLifePathNumber } from "@engine/numerology/lifePath";

describe("생애수 — 일반 사례", () => {
  it("1990-05-15 → 3", () => {
    // 연 1990: 1+9+9+0=19→1+9=10→1+0=1
    // 월 5: 5
    // 일 15: 1+5=6
    // 합 1+5+6=12→1+2=3
    const r = computeLifePathNumber({ year: 1990, month: 5, day: 15 });
    expect(r.breakdown).toEqual({ year: 1, month: 5, day: 6 });
    expect(r.value).toBe(3);
    expect(r.isMaster).toBe(false);
  });

  it("2000-01-01 → 4", () => {
    // 연 2000: 2+0+0+0=2, 월 1, 일 1 → 합 4
    const r = computeLifePathNumber({ year: 2000, month: 1, day: 1 });
    expect(r.value).toBe(4);
  });
});

describe("생애수 — 마스터 넘버", () => {
  it("1900-01-09 → 11 (연1 + 월1 + 일9 = 11)", () => {
    const r = computeLifePathNumber({ year: 1900, month: 1, day: 9 });
    expect(r.breakdown).toEqual({ year: 1, month: 1, day: 9 });
    expect(r.value).toBe(11);
    expect(r.isMaster).toBe(true);
  });

  it("1908-09-04 → 22 (연9 + 월9 + 일4 = 22)", () => {
    const r = computeLifePathNumber({ year: 1908, month: 9, day: 4 });
    expect(r.breakdown).toEqual({ year: 9, month: 9, day: 4 });
    expect(r.value).toBe(22);
    expect(r.isMaster).toBe(true);
  });

  it("1901-11-11 → 33 (연11 + 월11 + 일11 = 33, 셋 다 마스터)", () => {
    const r = computeLifePathNumber({ year: 1901, month: 11, day: 11 });
    expect(r.breakdown).toEqual({ year: 11, month: 11, day: 11 });
    expect(r.value).toBe(33);
    expect(r.isMaster).toBe(true);
  });

  it("1975-11-29 → 8 (연22+월11+일11=44, 44는 마스터가 아니라 8까지 줄어든다)", () => {
    const r = computeLifePathNumber({ year: 1975, month: 11, day: 29 });
    expect(r.breakdown).toEqual({ year: 22, month: 11, day: 11 });
    expect(r.value).toBe(8);
    expect(r.isMaster).toBe(false);
  });
});

describe("생애수 — 결과 범위와 결정론성", () => {
  it("결과는 언제나 1~9 이거나 11·22·33 이다", () => {
    for (let year = 1900; year <= 2100; year += 13) {
      for (let month = 1; month <= 12; month += 5) {
        const r = computeLifePathNumber({ year, month, day: 15 });
        const inRange = r.value >= 1 && r.value <= 9;
        const isMasterValue = [11, 22, 33].includes(r.value);
        expect(inRange || isMasterValue, `${year}-${month} -> ${r.value}`).toBe(true);
      }
    }
  });

  it("같은 날짜는 언제나 같은 결과를 낸다", () => {
    const a = computeLifePathNumber({ year: 1990, month: 5, day: 15 });
    const b = computeLifePathNumber({ year: 1990, month: 5, day: 15 });
    expect(a).toEqual(b);
  });

  it("결과가 동결되어 있다", () => {
    const r = computeLifePathNumber({ year: 1990, month: 5, day: 15 });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.breakdown)).toBe(true);
  });
});

describe("입력 검증", () => {
  it("범위를 벗어난 값은 필드와 함께 오류를 던진다", () => {
    expect(() => computeLifePathNumber({ year: 1800, month: 1, day: 1 })).toThrow(
      BirthInputError,
    );
    expect(() => computeLifePathNumber({ year: 2000, month: 13, day: 1 })).toThrow(
      BirthInputError,
    );
    expect(() => computeLifePathNumber({ year: 2001, month: 2, day: 29 })).toThrow(
      BirthInputError,
    ); // 평년 2월 29일
  });

  it("윤년 2월 29일은 통과한다", () => {
    expect(() => computeLifePathNumber({ year: 2000, month: 2, day: 29 })).not.toThrow();
  });
});
