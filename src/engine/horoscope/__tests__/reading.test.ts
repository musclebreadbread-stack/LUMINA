import { describe, expect, it } from "vitest";
import { assertValidDateString, computeDailyReading } from "../index";

describe("evidence-based daily reading", () => {
  it("is deterministic and exposes a cultural evidence tier", () => {
    const first = computeDailyReading("zodiac", "leo", "2026-08-20");
    const second = computeDailyReading("zodiac", "leo", "2026-08-20");

    expect(first).toEqual(second);
    expect(first.tier).toBe("cultural");
    expect(first.precision).toBe("whole-sign");
    expect(first.evidence.length).toBeGreaterThan(0);
  });

  it("keeps every selected line connected to an evidence item", () => {
    const reading = computeDailyReading("chinese", "rat", "2026-08-20");
    const evidenceIds = new Set(reading.evidence.map((item) => item.id));

    for (const line of Object.values(reading.lines)) {
      expect(line.ko).not.toBe("");
      expect(line.en).not.toBe("");
      expect(evidenceIds.has(line.evidenceId)).toBe(true);
    }
  });

  it("keeps the evidence invariant across all public sign pages", () => {
    for (const [system, signs] of [
      ["zodiac", ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]],
      ["chinese", ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"]],
    ] as const) {
      for (const sign of signs) {
        const reading = computeDailyReading(system, sign, "2026-08-20");
        const evidenceIds = new Set(reading.evidence.map((item) => item.id));
        expect(Object.isFrozen(reading)).toBe(true);
        for (const line of Object.values(reading.lines)) {
          expect(evidenceIds.has(line.evidenceId), `${system}:${sign}:${line.id}`).toBe(true);
        }
      }
    }
  });

  it("rejects dates outside the supported reference interval", () => {
    expect(() => assertValidDateString("1899-12-31")).toThrow();
    expect(() => assertValidDateString("2101-01-01")).toThrow();
  });
});
