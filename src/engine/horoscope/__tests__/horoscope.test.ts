import { describe, expect, it } from "vitest";
import {
  CHINESE_SIGNS,
  HoroscopeInputError,
  MOOD_LINES,
  RELATIONSHIP_LINES,
  TIP_LINES,
  WORK_LINES,
  ZODIAC_SIGNS,
  assertValidDateString,
  computeDailyHoroscope,
  findSign,
  signsOf,
} from "@engine/horoscope";

describe("체계·별자리 표", () => {
  it("서양 별자리·동양 띠 모두 12개씩이다", () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
    expect(CHINESE_SIGNS).toHaveLength(12);
  });

  it("각 체계 안에서 key 가 서로 다르다", () => {
    expect(new Set(ZODIAC_SIGNS.map((s) => s.key)).size).toBe(12);
    expect(new Set(CHINESE_SIGNS.map((s) => s.key)).size).toBe(12);
  });

  it("findSign 은 key 로 정확한 항목을 찾고, 없으면 null이다", () => {
    expect(findSign("zodiac", "aries")?.ko).toBe("양자리");
    expect(findSign("chinese", "dragon")?.ko).toBe("용");
    expect(findSign("zodiac", "not-a-sign")).toBeNull();
  });

  it("signsOf 는 체계에 맞는 12개를 돌려준다", () => {
    expect(signsOf("zodiac")).toBe(ZODIAC_SIGNS);
    expect(signsOf("chinese")).toBe(CHINESE_SIGNS);
  });
});

describe("문장 은행", () => {
  it("네 은행 모두 14개씩이고 중복이 없다", () => {
    for (const bank of [MOOD_LINES, RELATIONSHIP_LINES, WORK_LINES, TIP_LINES]) {
      expect(bank).toHaveLength(14);
      expect(new Set(bank).size).toBe(14);
    }
  });

  it("단정적 예언 표현을 쓰지 않는다", () => {
    const banned = ["할 것이다", "반드시", "확실히"];
    for (const bank of [MOOD_LINES, RELATIONSHIP_LINES, WORK_LINES, TIP_LINES]) {
      bank.forEach((line) => {
        banned.forEach((word) => expect(line.includes(word), line).toBe(false));
      });
    }
  });
});

describe("날짜 검증", () => {
  it("올바른 날짜는 통과한다", () => {
    expect(assertValidDateString("2026-08-18")).toEqual({ year: 2026, month: 8, day: 18 });
  });

  it("형식이 틀리면 오류를 던진다", () => {
    expect(() => assertValidDateString("2026/08/18")).toThrow(HoroscopeInputError);
    expect(() => assertValidDateString("18-08-2026")).toThrow(HoroscopeInputError);
    expect(() => assertValidDateString("")).toThrow(HoroscopeInputError);
  });

  it("존재하지 않는 날짜는 오류를 던진다", () => {
    expect(() => assertValidDateString("2025-02-29")).toThrow(HoroscopeInputError); // 평년
    expect(() => assertValidDateString("2026-13-01")).toThrow(HoroscopeInputError);
  });

  it("윤년 2월 29일은 통과한다", () => {
    expect(() => assertValidDateString("2024-02-29")).not.toThrow();
  });
});

describe("오늘의 운세 산출", () => {
  it("엔터테인먼트 계층으로 태깅된다", () => {
    const r = computeDailyHoroscope("zodiac", "aries", "2026-08-18");
    expect(r.tier).toBe("entertainment");
    expect(r.engine).toBe("horoscope");
  });

  it("네 줄을 모두 낸다", () => {
    const r = computeDailyHoroscope("zodiac", "leo", "2026-08-18");
    expect(MOOD_LINES).toContain(r.mood);
    expect(RELATIONSHIP_LINES).toContain(r.relationship);
    expect(WORK_LINES).toContain(r.work);
    expect(TIP_LINES).toContain(r.tip);
  });

  it("같은 (체계, 별자리, 날짜) 는 언제나 같은 문장을 낸다", () => {
    const a = computeDailyHoroscope("zodiac", "aries", "2026-08-18");
    const b = computeDailyHoroscope("zodiac", "aries", "2026-08-18");
    expect(a).toEqual(b);
  });

  it("날짜가 하루만 달라도 결과가 달라진다 (자정 롤오버)", () => {
    const today = computeDailyHoroscope("zodiac", "aries", "2026-08-18");
    const tomorrow = computeDailyHoroscope("zodiac", "aries", "2026-08-19");
    const same =
      today.mood === tomorrow.mood &&
      today.relationship === tomorrow.relationship &&
      today.work === tomorrow.work &&
      today.tip === tomorrow.tip;
    expect(same).toBe(false);
  });

  it("같은 날짜라도 별자리가 다르면 결과가 달라진다", () => {
    const aries = computeDailyHoroscope("zodiac", "aries", "2026-08-18");
    const leo = computeDailyHoroscope("zodiac", "leo", "2026-08-18");
    const same =
      aries.mood === leo.mood &&
      aries.relationship === leo.relationship &&
      aries.work === leo.work &&
      aries.tip === leo.tip;
    expect(same).toBe(false);
  });

  it("체계와 어긋난 key(서양 체계에 동양 띠 이름 등)는 오류를 던진다", () => {
    expect(() => computeDailyHoroscope("zodiac", "dragon", "2026-08-18")).toThrow(
      HoroscopeInputError,
    );
    expect(() => computeDailyHoroscope("chinese", "aries", "2026-08-18")).toThrow(
      HoroscopeInputError,
    );
  });

  it("1년 366일 모두에서 예외 없이 계산된다 (윤년 포함)", () => {
    for (let day = 0; day < 366; day += 1) {
      const d = new Date(Date.UTC(2024, 0, 1 + day));
      const dateStr = d.toISOString().slice(0, 10);
      expect(() => computeDailyHoroscope("zodiac", "aries", dateStr), dateStr).not.toThrow();
    }
  });

  it("결과가 동결되어 있다", () => {
    const r = computeDailyHoroscope("zodiac", "aries", "2026-08-18");
    expect(Object.isFrozen(r)).toBe(true);
  });

  it("JSON 직렬화가 가능하다", () => {
    const r = computeDailyHoroscope("chinese", "tiger", "2026-08-18");
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});
