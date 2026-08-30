import { describe, expect, it } from "vitest";
import { estimateFromTheta, estimatedIqBand } from "../estimate";

const NO_DOMAINS = Object.freeze([]);

describe("estimateFromTheta", () => {
  it("maps theta 0 to IQ 100 and the 50th percentile", () => {
    const score = estimateFromTheta({ theta: 0, sem: 0.3, answeredCount: 20, domains: NO_DOMAINS });
    expect(score.fullScaleIq).toBe(100);
    expect(score.percentile).toBe(50);
    expect(score.basis).toBe("theoretical-prior");
  });

  it("maps theta 1 to IQ 115 and theta -2 to IQ 70", () => {
    expect(estimateFromTheta({ theta: 1, sem: 0.3, answeredCount: 20, domains: NO_DOMAINS }).fullScaleIq).toBe(115);
    expect(estimateFromTheta({ theta: -2, sem: 0.3, answeredCount: 20, domains: NO_DOMAINS }).fullScaleIq).toBe(70);
  });

  it("clamps an extreme theta to the 40-160 IQ range", () => {
    expect(estimateFromTheta({ theta: 9, sem: 0.3, answeredCount: 20, domains: NO_DOMAINS }).fullScaleIq).toBe(160);
    expect(estimateFromTheta({ theta: -9, sem: 0.3, answeredCount: 20, domains: NO_DOMAINS }).fullScaleIq).toBe(40);
  });

  it("clamps the percentile to 1-99", () => {
    expect(estimateFromTheta({ theta: 4, sem: 0.1, answeredCount: 20, domains: NO_DOMAINS }).percentile).toBe(99);
    expect(estimateFromTheta({ theta: -4, sem: 0.1, answeredCount: 20, domains: NO_DOMAINS }).percentile).toBe(1);
  });

  it("produces a symmetric 95% confidence interval around the point estimate", () => {
    const score = estimateFromTheta({ theta: 0, sem: 0.3, answeredCount: 20, domains: NO_DOMAINS });
    const [lower, upper] = score.confidenceInterval95;
    const margin = Math.round(1.96 * 0.3 * 15);
    expect(lower).toBe(100 - margin);
    expect(upper).toBe(100 + margin);
  });

  it("rejects a negative standard error", () => {
    expect(() => estimateFromTheta({ theta: 0, sem: -1, answeredCount: 20, domains: NO_DOMAINS })).toThrow("negative");
  });

  it("carries answeredCount and domains through unchanged", () => {
    const domains = Object.freeze([{ domain: "gf" as const, correctCount: 3, itemCount: 4 }]);
    const score = estimateFromTheta({ theta: 0, sem: 0.3, answeredCount: 20, domains });
    expect(score.answeredCount).toBe(20);
    expect(score.domains).toEqual(domains);
  });
});

describe("estimatedIqBand", () => {
  it("classifies every band cut boundary", () => {
    expect(estimatedIqBand(69)).toBe("well_below_average");
    expect(estimatedIqBand(70)).toBe("below_average");
    expect(estimatedIqBand(84)).toBe("below_average");
    expect(estimatedIqBand(85)).toBe("average");
    expect(estimatedIqBand(114)).toBe("average");
    expect(estimatedIqBand(115)).toBe("above_average");
    expect(estimatedIqBand(129)).toBe("above_average");
    expect(estimatedIqBand(130)).toBe("well_above_average");
    expect(estimatedIqBand(144)).toBe("well_above_average");
    expect(estimatedIqBand(145)).toBe("exceptionally_high");
  });
});
