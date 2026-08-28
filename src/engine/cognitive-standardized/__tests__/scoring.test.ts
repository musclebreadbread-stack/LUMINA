import { describe, expect, it } from "vitest";

import { scoreRun } from "../scoring";
import type { ScoreRunInput, StandardizedScore } from "../types";

const score: StandardizedScore = {
  fullScaleIq: 100,
  percentile: 50,
  confidenceInterval95: [95, 105],
  normVersion: "ko-adult-v1",
};

const pilotInput: ScoreRunInput = {
  releaseMode: "pilot",
  standardizationEligible: false,
  normVersion: null,
  score: null,
};

describe("score release guard", () => {
  it("withholds the pilot result without an IQ or accuracy payload", () => {
    expect(scoreRun(pilotInput)).toEqual({ status: "pilot_withheld", score: null });
  });

  it("cannot emit a standardized score without an approved norm version", () => {
    expect(() =>
      scoreRun({
        ...pilotInput,
        releaseMode: "standardized",
        standardizationEligible: true,
        normVersion: null,
        score,
      }),
    ).toThrow("approved norm version is required");
  });

  it("keeps the score path closed while the approved registry is empty", () => {
    expect(() =>
      scoreRun({
        releaseMode: "standardized",
        standardizationEligible: true,
        normVersion: score.normVersion,
        score,
      }),
    ).toThrow("approved norm version is required");
  });
});
