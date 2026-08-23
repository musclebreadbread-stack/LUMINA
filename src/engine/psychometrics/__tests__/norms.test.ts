import { describe, expect, it } from "vitest";
import { FACTORS, ITEMS } from "@engine/psychometrics/items";
import { NORM_SOURCE, PUBLISHED_ALPHAS, normScoreFor, reliabilityFor } from "@engine/psychometrics/norms";
import { computeFactorScores, type LikertResponse } from "@engine/psychometrics/scoring";

function responses(value: LikertResponse): Record<number, LikertResponse> {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value])) as Record<number, LikertResponse>;
}

describe("public psychometric norms", () => {
  it("contains a large, versioned aggregate source for every factor", () => {
    expect(NORM_SOURCE.sampleSize).toBeGreaterThan(100_000);
    for (const factor of FACTORS) {
      expect(PUBLISHED_ALPHAS[factor]).toBeGreaterThan(0.7);
      expect(normScoreFor(factor, 30)?.sampleSize).toBe(NORM_SOURCE.sampleSize);
    }
  });

  it("keeps percentile lookup monotonic and bounded", () => {
    for (const factor of FACTORS) {
      const values = [10, 20, 30, 40, 50].map((rawSum) => normScoreFor(factor, rawSum)?.percentile ?? 0);
      expect(values.every((value) => value >= 1 && value <= 99)).toBe(true);
      for (let index = 1; index < values.length; index += 1) {
        expect(values[index]).toBeGreaterThanOrEqual(values[index - 1] ?? 0);
      }
    }
  });

  it("uses the aggregate table honestly when a requested demographic group is unavailable", () => {
    const aggregate = normScoreFor("extraversion", 30);
    const requested = normScoreFor("extraversion", 30, { age: 29, gender: "female" });
    expect(requested?.normGroup).toBe("all");
    expect(requested?.sampleSize).toBe(NORM_SOURCE.sampleSize);
    expect(requested?.standardDeviation).toBe(aggregate?.standardDeviation);
  });

  it("adds norm, reliability, and response-consistency data to every score", () => {
    const scores = computeFactorScores(responses(3));
    expect(scores).toHaveLength(5);
    for (const score of scores) {
      expect(score.norm?.tScore).toBeTypeOf("number");
      expect(score.reliability.alpha).toBe(PUBLISHED_ALPHAS[score.factor]);
      expect(score.reliability.ci95).toHaveLength(2);
      expect(score.norm?.standardDeviation).toBeGreaterThan(0);
      expect(score.consistency.midpointRate).toBe(1);
      expect(score.itemResponses).toHaveLength(10);
    }
  });

  it("handles every supported age-band boundary without inventing missing demographic norms", () => {
    const ages = [17, 18, 24, 25, 34, 35, 44, 45, 54, 55, Number.NaN];
    for (const age of ages) {
      const score = normScoreFor("intellect", 30, {
        age,
        gender: "male",
      });
      expect(score?.normGroup).toBe("all");
      expect(score?.sampleSize).toBe(NORM_SOURCE.sampleSize);
    }

    expect(normScoreFor("intellect", 30, { age: 29 })).not.toBeNull();
    expect(normScoreFor("intellect", 30, { age: 29, gender: "unspecified" })).not.toBeNull();
  });

  it("keeps reliability intervals bounded when a norm is unavailable or a raw score is at an edge", () => {
    const withoutNorm = reliabilityFor("extraversion", 10, null);
    expect(withoutNorm.sem).toBe(0);
    expect(withoutNorm.ci95).toEqual([10, 10]);

    const norm = normScoreFor("extraversion", 50);
    const atUpperEdge = reliabilityFor("extraversion", 50, norm);
    expect(atUpperEdge.ci95[0]).toBeGreaterThanOrEqual(10);
    expect(atUpperEdge.ci95[1]).toBe(50);
  });
});
