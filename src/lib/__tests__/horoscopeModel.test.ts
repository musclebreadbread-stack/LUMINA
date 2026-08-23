import { describe, expect, it } from "vitest";
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
});
