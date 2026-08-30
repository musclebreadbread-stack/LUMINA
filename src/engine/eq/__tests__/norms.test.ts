import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import {
  NORM_MIN_AGE,
  NORM_SOURCE,
  PUBLISHED_SUBSCALE_ALPHAS,
  PUBLISHED_TOTAL_ALPHA,
  SUBSCALE_NORMS,
  TOTAL_NORM,
  normScoreFor,
  reliabilityFor,
  reliabilityForTotal,
  totalNormScoreFor,
} from "../norms";
import { FACTORS, ITEM_COUNT_BY_FACTOR } from "../items";
import {
  CIARROCHI_CHAN_BAJGAR_2001,
  EQ_CITATIONS,
  SALOVEY_MAYER_1990,
  SCHUTTE_ET_AL_1998,
} from "../citations";

const MIN_TOTAL = 33;
const MAX_TOTAL = 165;

describe("SSEIT norms", () => {
  describe("published summary statistics", () => {
    it("uses the Schutte et al. (1998) validation sample", () => {
      expect(TOTAL_NORM.mean).toBeCloseTo(124.78, 10);
      expect(TOTAL_NORM.sd).toBe(13);
      expect(TOTAL_NORM.sampleSize).toBe(346);
      expect(TOTAL_NORM.sd).toBeGreaterThan(0);
      expect(PUBLISHED_TOTAL_ALPHA).toBe(0.9);
    });

    it("states plainly that percentiles are a normal approximation, not an empirical table", () => {
      expect(NORM_SOURCE.method).toMatch(/[Nn]ormal approximation/);
      expect(NORM_SOURCE.method).toMatch(/NOT an empirical percentile table/);
      expect(NORM_SOURCE.sampleSize).toBe(TOTAL_NORM.sampleSize);
      expect(NORM_SOURCE.url).toMatch(/^https:\/\//);
    });

    it("publishes no subscale norm rather than inventing one", () => {
      for (const factor of FACTORS) {
        expect(SUBSCALE_NORMS[factor]).toBeNull();
        expect(PUBLISHED_SUBSCALE_ALPHAS[factor]).toBe(0);
      }
    });
  });

  describe("totalNormScoreFor", () => {
    it("puts the published mean at z = 0, T = 50, percentile 50", () => {
      const norm = totalNormScoreFor(TOTAL_NORM.mean);
      expect(norm).not.toBeNull();
      expect(norm?.zScore).toBeCloseTo(0, 10);
      expect(norm?.tScore).toBeCloseTo(50, 10);
      expect(norm?.percentile).toBe(50);
      expect(norm?.normGroup).toBe("all");
      expect(norm?.sampleSize).toBe(346);
      expect(norm?.standardDeviation).toBe(13);
    });

    it("keeps z, T and percentile monotone in the raw score", () => {
      const raws = [40, 90, 110, 124.78, 130, 145, 160];
      const norms = raws.map((raw) => totalNormScoreFor(raw));

      for (let i = 1; i < norms.length; i += 1) {
        const previous = norms[i - 1];
        const current = norms[i];
        expect(current?.zScore).toBeGreaterThan(previous!.zScore);
        expect(current?.tScore).toBeGreaterThan(previous!.tScore);
        expect(current?.percentile).toBeGreaterThanOrEqual(previous!.percentile);
      }
    });

    it("derives T from z with the standard 50 + 10z transform", () => {
      const norm = totalNormScoreFor(137.78);
      expect(norm?.zScore).toBeCloseTo(1, 10);
      expect(norm?.tScore).toBeCloseTo(60, 10);
      expect(norm?.percentile).toBe(84);
    });

    it("clamps the percentile to 1..99 at the extremes of the scale", () => {
      expect(totalNormScoreFor(MIN_TOTAL)?.percentile).toBe(1);
      expect(totalNormScoreFor(MAX_TOTAL)?.percentile).toBe(99);
    });

    it("applies the adult norm when no age is supplied", () => {
      expect(totalNormScoreFor(124.78, {})).not.toBeNull();
      expect(totalNormScoreFor(124.78, { gender: "unspecified" })).not.toBeNull();
    });

    it("applies the adult norm from the norm sample's minimum age upward", () => {
      expect(totalNormScoreFor(124.78, { age: NORM_MIN_AGE })).not.toBeNull();
      expect(totalNormScoreFor(124.78, { age: 40 })).not.toBeNull();
    });

    it("refuses the adult norm below the norm sample's age range", () => {
      expect(totalNormScoreFor(124.78, { age: NORM_MIN_AGE - 1 })).toBeNull();
      expect(totalNormScoreFor(124.78, { age: 9 })).toBeNull();
    });

    it("refuses the adult norm for a non-finite age instead of guessing", () => {
      expect(totalNormScoreFor(124.78, { age: Number.NaN })).toBeNull();
      expect(totalNormScoreFor(124.78, { age: Number.POSITIVE_INFINITY })).toBeNull();
    });

    it("ignores gender because no gender-stratified norm is available", () => {
      const male = totalNormScoreFor(130, { age: 30, gender: "male" });
      const female = totalNormScoreFor(130, { age: 30, gender: "female" });
      expect(male).toEqual(female);
      expect(male).toEqual(totalNormScoreFor(130, { age: 30 }));
    });
  });

  describe("normScoreFor", () => {
    it("returns null for every subscale, whatever the context", () => {
      for (const factor of FACTORS) {
        expect(normScoreFor(factor, 30)).toBeNull();
        expect(normScoreFor(factor, 30, { age: 30, gender: "male" })).toBeNull();
      }
    });
  });

  describe("reliability", () => {
    it("computes SEM = SD × √(1 − α) and CI95 = ±1.96 × SEM for the total score", () => {
      const norm = totalNormScoreFor(124.78);
      const reliability = reliabilityForTotal(124.78, norm);
      const expectedSem = 13 * Math.sqrt(1 - 0.9);

      expect(reliability.alpha).toBe(0.9);
      expect(reliability.sem).toBeCloseTo(expectedSem, 10);
      expect(reliability.ci95[0]).toBeCloseTo(124.78 - 1.96 * expectedSem, 10);
      expect(reliability.ci95[1]).toBeCloseTo(124.78 + 1.96 * expectedSem, 10);
    });

    it("clamps the total CI to the achievable 33..165 range", () => {
      const low = reliabilityForTotal(MIN_TOTAL, totalNormScoreFor(MIN_TOTAL));
      const high = reliabilityForTotal(MAX_TOTAL, totalNormScoreFor(MAX_TOTAL));

      expect(low.ci95[0]).toBe(MIN_TOTAL);
      expect(low.ci95[1]).toBeGreaterThan(MIN_TOTAL);
      expect(high.ci95[1]).toBe(MAX_TOTAL);
      expect(high.ci95[0]).toBeLessThan(MAX_TOTAL);
    });

    it("collapses to a zero-width interval when no norm is available", () => {
      const reliability = reliabilityForTotal(100, null);
      expect(reliability.sem).toBe(0);
      expect(reliability.ci95).toEqual([100, 100]);
    });

    it("uses each factor's own achievable range for the subscale interval", () => {
      for (const factor of FACTORS) {
        const itemCount = ITEM_COUNT_BY_FACTOR[factor];
        const rawSum = itemCount * 3;
        const reliability = reliabilityFor(factor, rawSum, null);

        expect(reliability.alpha).toBe(0);
        expect(reliability.sem).toBe(0);
        expect(reliability.ci95).toEqual([rawSum, rawSum]);
      }
    });

    it("clamps a subscale interval to that factor's minimum, not the total's", () => {
      // 10문항 요인의 이론적 최소는 10이다 — 총점 최소(33)로 잘리면 안 된다.
      const reliability = reliabilityFor("perceptionOfEmotion", 5, null);
      expect(reliability.ci95[0]).toBe(ITEM_COUNT_BY_FACTOR.perceptionOfEmotion);
    });
  });

  describe("citations", () => {
    it("cites the instrument, the factor solution and the underlying model", () => {
      expect(EQ_CITATIONS).toHaveLength(3);
      expect(EQ_CITATIONS).toEqual([
        SCHUTTE_ET_AL_1998,
        CIARROCHI_CHAN_BAJGAR_2001,
        SALOVEY_MAYER_1990,
      ]);
      expect(SCHUTTE_ET_AL_1998.year).toBe(1998);
      expect(CIARROCHI_CHAN_BAJGAR_2001.year).toBe(2001);
      expect(SALOVEY_MAYER_1990.year).toBe(1990);
    });

    it("keeps every citation complete and valid", () => {
      for (const citation of EQ_CITATIONS) {
        expect(isValidCitation(citation)).toBe(true);
      }
    });

    it("points the norm source at the instrument's own article", () => {
      expect(NORM_SOURCE.url).toBe(SCHUTTE_ET_AL_1998.url);
    });
  });
});
