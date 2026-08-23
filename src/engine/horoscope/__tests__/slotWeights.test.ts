import { describe, expect, it } from "vitest";
import { computeDailyReading } from "../index";
import { computeHoroscopeSignals, rankSignals } from "../signals";
import { computeDayFortune } from "../dayFortune";
import { createHoroscopeReference } from "../reference";
import { computeDailySky } from "../sky";

describe("horoscope slot relevance", () => {
  it("keeps the calculation score and slot relevance visible", () => {
    const reference = createHoroscopeReference("zodiac", "leo", "2026-08-20");
    const signals = computeHoroscopeSignals(
      reference,
      computeDailySky("2026-08-20"),
      computeDayFortune("2026-08-20", null),
    );

    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.baseScore).toBeGreaterThan(0);
      expect(signal.slotWeight).toBeGreaterThan(0);
      expect(signal.score).toBeLessThanOrEqual(0.99);
      expect(signal.score).toBeCloseTo(signal.baseScore * signal.slotWeight, 6);
    }
  });

  it("does not use one identical signal for every reading slot", () => {
    const zodiacDistinctCounts: number[] = [];
    const chineseDistinctCounts: number[] = [];
    const slots = ["mood", "relationship", "work", "tip"] as const;
    const signs = [
      "aries",
      "taurus",
      "gemini",
      "cancer",
      "leo",
      "virgo",
      "libra",
      "scorpio",
      "sagittarius",
      "capricorn",
      "aquarius",
      "pisces",
    ] as const;
    const chineseSigns = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"] as const;

    for (const sign of signs) {
      for (let day = 0; day < 31; day += 1) {
        const date = `2026-08-${String(day + 1).padStart(2, "0")}`;
        const reading = computeDailyReading("zodiac", sign, date);
        const ids = slots.map((slot) => reading.lines[slot].signalId);
        zodiacDistinctCounts.push(new Set(ids).size);
      }
    }
    for (const sign of chineseSigns) {
      for (let day = 0; day < 31; day += 1) {
        const date = `2026-08-${String(day + 1).padStart(2, "0")}`;
        const reading = computeDailyReading("chinese", sign, date);
        const ids = slots.map((slot) => reading.lines[slot].signalId);
        chineseDistinctCounts.push(new Set(ids).size);
      }
    }

    const chineseSorted = [...chineseDistinctCounts].sort((left, right) => left - right);
    const chineseMedian = chineseSorted[Math.floor(chineseSorted.length / 2)];
    expect(chineseMedian).toBeGreaterThanOrEqual(2);
    expect(zodiacDistinctCounts.every((count) => count >= 1 && count <= 4)).toBe(true);
    expect(chineseDistinctCounts.every((count) => count >= 1 && count <= 4)).toBe(true);
  });

  it("ranks each slot by its own weighted score", () => {
    const reading = computeDailyReading("chinese", "dragon", "2026-08-20");
    for (const slot of ["mood", "relationship", "work", "tip"] as const) {
      const selected = reading.lines[slot];
      expect(rankSignals(reading.signals, slot)[0]?.evidence.id).toBe(selected.evidenceId);
    }
  });
});
