import { describe, expect, it } from "vitest";
import {
  LUNAR_MAX_YEAR,
  LUNAR_MIN_YEAR,
  LunarConversionError,
  isLunarConvertible,
  lunarToSolar,
  solarToLunar,
} from "@engine/saju/lunar";

describe("음력 ↔ 양력 변환", () => {
  it("알려진 대응 쌍이 양방향으로 일치한다", () => {
    expect(lunarToSolar(1956, 1, 21, false)).toEqual({ year: 1956, month: 3, day: 3 });
    expect(solarToLunar(1956, 3, 3)).toEqual({
      year: 1956,
      month: 1,
      day: 21,
      isLeapMonth: false,
    });
  });

  it("양력 → 음력 → 양력 왕복이 항등이다", () => {
    const samples: readonly (readonly [number, number, number])[] = [
      [1900, 1, 31], [1945, 8, 15], [1960, 4, 19], [1988, 9, 17],
      [2000, 1, 1], [2012, 2, 29], [2024, 2, 10], [2050, 12, 31],
    ];
    for (const [y, m, d] of samples) {
      const lunar = solarToLunar(y, m, d);
      const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeapMonth);
      expect(back, `${y}-${m}-${d}`).toEqual({ year: y, month: m, day: d });
    }
  });

  it("연속한 양력 날짜는 연속한 음력 날짜로 이어진다", () => {
    let previous: number | null = null;
    for (let day = 1; day <= 40; day += 1) {
      const date = new Date(Date.UTC(2024, 0, day));
      const lunar = solarToLunar(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
      if (previous !== null) {
        // 달이 바뀔 때는 1로 되돌아가고, 그 외에는 정확히 1 증가한다.
        expect(lunar.day === previous + 1 || lunar.day === 1).toBe(true);
      }
      previous = lunar.day;
    }
  });

  it("윤달을 구분해서 다룬다", () => {
    // 2023년은 음력 2월이 윤달이었다.
    const normal = lunarToSolar(2023, 2, 15, false);
    const leap = lunarToSolar(2023, 2, 15, true);
    expect(normal).not.toEqual(leap);
    const leapBack = solarToLunar(leap.year, leap.month, leap.day);
    expect(leapBack.isLeapMonth).toBe(true);
    expect(leapBack.month).toBe(2);
  });

  it("존재하지 않는 음력 날짜는 오류를 던진다", () => {
    expect(() => lunarToSolar(2024, 13, 1, false)).toThrow(LunarConversionError);
    expect(() => lunarToSolar(2024, 1, 31, false)).toThrow(LunarConversionError);
    expect(() => lunarToSolar(LUNAR_MAX_YEAR + 10, 1, 1, false)).toThrow(LunarConversionError);
  });

  it("지원 범위를 정확히 보고한다", () => {
    expect(isLunarConvertible(LUNAR_MIN_YEAR)).toBe(true);
    expect(isLunarConvertible(LUNAR_MAX_YEAR)).toBe(true);
    expect(isLunarConvertible(LUNAR_MIN_YEAR - 1)).toBe(false);
    expect(isLunarConvertible(LUNAR_MAX_YEAR + 1)).toBe(false);
  });

  it("음력 날짜는 언제나 1~30일 범위다", () => {
    for (let month = 1; month <= 12; month += 1) {
      const lunar = solarToLunar(2024, month, 15);
      expect(lunar.day).toBeGreaterThanOrEqual(1);
      expect(lunar.day).toBeLessThanOrEqual(30);
      expect(lunar.month).toBeGreaterThanOrEqual(1);
      expect(lunar.month).toBeLessThanOrEqual(12);
    }
  });
});

describe("변환 실패 처리", () => {
  it("지원 범위를 벗어난 양력 날짜는 오류를 던진다", () => {
    expect(() => solarToLunar(LUNAR_MAX_YEAR + 5, 1, 1)).toThrow(LunarConversionError);
    expect(() => solarToLunar(LUNAR_MIN_YEAR - 5, 1, 1)).toThrow(LunarConversionError);
  });

  it("범위 양 끝의 경계일이 실제 라이브러리 한계와 맞는다", () => {
    // 양력 하한은 1000-02-13, 상한은 2050-12-31 이다.
    expect(() => solarToLunar(1000, 2, 13)).not.toThrow();
    expect(() => solarToLunar(1000, 1, 1)).toThrow(LunarConversionError);
    expect(() => solarToLunar(2050, 12, 31)).not.toThrow();
    expect(() => solarToLunar(2051, 1, 1)).toThrow(LunarConversionError);
    // 음력 하한은 1000-01-01, 상한은 2050-11-18 이다.
    expect(() => lunarToSolar(1000, 1, 1, false)).not.toThrow();
    expect(() => lunarToSolar(2050, 11, 18, false)).not.toThrow();
    expect(() => lunarToSolar(2050, 12, 1, false)).toThrow(LunarConversionError);
  });

  it("존재하지 않는 양력 날짜도 오류를 던진다", () => {
    expect(() => solarToLunar(2023, 2, 30)).toThrow(LunarConversionError);
    expect(() => solarToLunar(2023, 13, 1)).toThrow(LunarConversionError);
  });

  it("오류 메시지에 지원 범위를 담는다", () => {
    expect(() => solarToLunar(2200, 1, 1)).toThrow(/1000\.\.2050/);
  });
});
