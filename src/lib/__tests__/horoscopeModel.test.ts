import { describe, expect, it } from "vitest";
import { computeDayFortune } from "@engine/horoscope";
import { buildHoroscopeView, formatHoroscopeDate, isDateString } from "../horoscopeModel";

describe("horoscope view model", () => {
  it("pairs a deterministic Korean line with its English translation", () => {
    const first = buildHoroscopeView("zodiac", "leo", "2026-08-20");
    const second = buildHoroscopeView("zodiac", "leo", "2026-08-20");

    expect(first).toEqual(second);
    expect(first.imageSrc).toBe("/horoscope/zodiac/leo.webp");
    expect(first.mood.en).not.toBe("");
    expect(first.mood.ko).not.toBe("");
  });

  it("formats valid dates by locale and preserves invalid input", () => {
    expect(formatHoroscopeDate("2026-08-20", "en")).toContain("August 20, 2026");
    expect(formatHoroscopeDate("2026-08-20", "ko")).toContain("2026년 8월 20일");
    expect(formatHoroscopeDate("not-a-date", "en")).toBe("not-a-date");
  });

  it("accepts only the fixed date token shape", () => {
    expect(isDateString("2026-08-20")).toBe(true);
    expect(isDateString("2026-8-20")).toBe(false);
    expect(isDateString(undefined)).toBe(false);
  });

  it("derives the day element from the same day-fortune calculation the engine already exposes", () => {
    // 새 오행 매핑을 만들지 않는다 — src/engine/horoscope/dayFortune.ts가 이미 계산한
    // 일진 지지의 오행을 그대로 다시 불러 비교한다.
    const date = "2026-08-20";
    const view = buildHoroscopeView("zodiac", "leo", date);
    const fortune = computeDayFortune(date);

    expect(view.dayElement.element).toBe(fortune.branch.element);
    expect(view.dayElement.branchKo).toBe(fortune.branch.ko);
    expect(view.dayElement.branchEn).toBe(fortune.branch.en);
    expect(view.dayElement.branchHanja).toBe(fortune.branch.hanja);
    expect(view.dayElement.zodiacKo).toBe(fortune.branch.zodiacKo);
    expect(view.dayElement.zodiacEn).toBe(fortune.branch.zodiacEn);
  });

  it("keeps the day element independent of which system or sign the visitor picked", () => {
    // 오늘의 일진은 방문자가 별자리를 고르든 띠를 고르든 달라지지 않는다 —
    // 달력의 날짜에서만 나온다.
    const zodiacView = buildHoroscopeView("zodiac", "leo", "2026-08-20");
    const chineseView = buildHoroscopeView("chinese", "dragon", "2026-08-20");

    expect(zodiacView.dayElement).toEqual(chineseView.dayElement);
  });
});
