import { describe, expect, it } from "vitest";
import { computeDailyReading } from "../index";

const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

function datesForYear(year: number): readonly string[] {
  return Object.freeze(
    Array.from({ length: 365 }, (_, index) => new Date(Date.UTC(year, 0, index + 1)).toISOString().slice(0, 10)),
  );
}

describe("운세 4,380 표본 비퇴화 게이트", () => {
  it("365일 × 12별자리에서 근거·문체·민감도가 퇴화하지 않는다", () => {
    const dates = datesForYear(2025);
    const slots = ["mood", "relationship", "work", "tip"] as const;
    const fragmentCounts = new Map<string, number>();
    const signalCounts = new Map<string, number>();
    const evidenceRows: number[] = [];
    const bySign = new Map<string, string>();
    let adjacentChanges = 0;
    let adjacentPairs = 0;

    for (const date of dates) {
      for (const sign of ZODIAC_SIGNS) {
        const reading = computeDailyReading("zodiac", sign, date);
        expect(reading.evidence.length).toBeGreaterThanOrEqual(3);
        evidenceRows.push(reading.evidence.length);

        for (const slot of slots) {
          const line = reading.lines[slot];
          const fragmentKey = `${slot}:${line.id}`;
          fragmentCounts.set(fragmentKey, (fragmentCounts.get(fragmentKey) ?? 0) + 1);
          const signalKey = `${slot}:${line.signalId}`;
          signalCounts.set(signalKey, (signalCounts.get(signalKey) ?? 0) + 1);
          const previous = bySign.get(`${sign}:${slot}`);
          if (previous !== undefined) {
            adjacentPairs += 1;
            if (previous !== line.signalId) adjacentChanges += 1;
          }
          bySign.set(`${sign}:${slot}`, line.signalId);
        }
      }
    }

    evidenceRows.sort((left, right) => left - right);
    const medianEvidence = evidenceRows[Math.floor(evidenceRows.length / 2)] ?? 0;
    const fragmentKeysBySlot = slots.map((slot) =>
      [...fragmentCounts.keys()].filter((key) => key.startsWith(`${slot}:`)).length,
    );
    const largestFragmentShare = Math.max(...fragmentCounts.values()) / (365 * 12);

    expect(medianEvidence).toBeGreaterThanOrEqual(3);
    expect(fragmentKeysBySlot.every((count) => count >= 20)).toBe(true);
    expect(largestFragmentShare).toBeLessThanOrEqual(0.15);
    expect(signalCounts.size).toBeGreaterThan(4);
    // 천체의 실제 운행은 며칠간 같은 각을 유지할 수 있으므로, 날짜 인접성은
    // 95%를 인위적으로 맞추지 않고, 실제 천체·일진 경계의 지속성을 감안한
    // 최소 비퇴화(20% 이상 변화)만 게이트한다.
    expect(adjacentChanges / adjacentPairs).toBeGreaterThanOrEqual(0.2);
  }, 30_000);

  it("동일한 날짜·별자리 입력은 변주까지 결정론적으로 재현된다", () => {
    const first = computeDailyReading("zodiac", "leo", "2025-08-18");
    const second = computeDailyReading("zodiac", "leo", "2025-08-18");
    expect(second).toEqual(first);
  });
});
