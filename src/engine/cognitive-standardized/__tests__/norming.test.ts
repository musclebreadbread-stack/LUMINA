import { describe, expect, it } from "vitest";

import { standardizedIqBand, thetaToStandardizedScore, type ApprovedNormVersion } from "../norming";

const approvedFixtureNorm: ApprovedNormVersion = {
  id: "ko-adult-fixture-v1",
  status: "approved",
  targetPopulation: "ko-adults-18-64",
  itemBankVersion: "pilot-v1",
  algorithmVersion: "cat-v1",
  approvedAt: "2026-08-28T00:00:00.000Z",
  iqPointsPerTheta: 15,
  byAge: [
    {
      minimumAge: 18,
      maximumAge: 64,
      thetaToIq: [40, 55, 70, 85, 100, 115, 130, 145, 160],
      iqToPercentile: Array.from({ length: 121 }, (_, index) => Math.max(1, Math.min(99, index * 100 / 120))),
    },
  ],
};

describe("approved norm conversion", () => {
  it("uses fixed descriptive bands around the IQ 100 mean", () => {
    expect(standardizedIqBand(69)).toBe("well_below_average");
    expect(standardizedIqBand(70)).toBe("below_average");
    expect(standardizedIqBand(85)).toBe("average");
    expect(standardizedIqBand(115)).toBe("above_average");
    expect(standardizedIqBand(130)).toBe("well_above_average");
  });

  it("requires matching item-bank and algorithm versions", () => {
    expect(() => thetaToStandardizedScore({ theta: 0, sem: 0.3, age: 32, itemBankVersion: "other", algorithmVersion: "cat-v1" }, approvedFixtureNorm)).toThrow("item bank version mismatch");
  });

  it("converts theta to an IQ-scale score with a confidence interval", () => {
    const score = thetaToStandardizedScore({ theta: 0, sem: 0.3, age: 32, itemBankVersion: "pilot-v1", algorithmVersion: "cat-v1" }, approvedFixtureNorm);
    expect(score.fullScaleIq).toBe(100);
    expect(score.confidenceInterval95).toEqual([91, 109]);
    expect(score.percentile).toBeGreaterThanOrEqual(1);
    expect(score.percentile).toBeLessThanOrEqual(99);
  });

  it("rejects an age outside the approved population", () => {
    expect(() => thetaToStandardizedScore({ theta: 0, sem: 0.3, age: 17, itemBankVersion: "pilot-v1", algorithmVersion: "cat-v1" }, approvedFixtureNorm)).toThrow("age is outside");
  });
});
