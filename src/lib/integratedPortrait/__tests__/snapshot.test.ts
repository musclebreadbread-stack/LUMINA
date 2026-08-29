import { describe, expect, it } from "vitest";
import type { AnalysisKey } from "@engine/shared/evidence";
import type { ResultLane, ResultSnapshotV1 } from "../contracts";
import { getPortraitEligibility, selectCurrentSnapshots } from "../snapshot";

function laneFor(analysisKey: AnalysisKey): ResultLane {
  switch (analysisKey) {
    case "psychometrics":
    case "jungian":
    case "darktriad":
    case "attachment":
    case "eq":
    case "cognitive":
      return "scientific";
    case "saju":
    case "astro":
    case "numerology":
      return "cultural";
    case "tarot":
    case "horoscope":
      return "situational";
    case "compatibility":
      return "relational";
  }
}

function fixture(
  analysisKey: AnalysisKey,
  provenanceGroup: string,
  completedAt = "2026-08-29T00:00:00.000Z",
): ResultSnapshotV1 {
  return {
    schemaVersion: 1,
    id: `${analysisKey}-${completedAt}`,
    sourceAssessmentId: `00000000-0000-4000-8000-${analysisKey.padEnd(12, "0").slice(0, 12)}`,
    analysisKey,
    provenanceGroup,
    lane: laneFor(analysisKey),
    instrumentVersion: "fixture-instrument-v1",
    scoringModelVersion: "fixture-scoring-v1",
    completedAt,
    locale: "ko",
    signals: [],
    referenceIds: [],
  };
}

describe("integrated portrait snapshot selection", () => {
  it("does not count Big Five and Jungian as two scientific provenance groups", () => {
    const eligibility = getPortraitEligibility([
      fixture("psychometrics", "ipip-50-v1"),
      fixture("jungian", "ipip-50-v1"),
      fixture("saju", "saju-symbolic-v1"),
    ]);

    expect(eligibility).toMatchObject({
      distinctAnalysisCount: 3,
      scientificProvenanceCount: 1,
      missingAnalysisCount: 0,
      missingScientificProvenanceCount: 1,
      isUnlocked: false,
    });
  });

  it("unlocks only with three analyses and two distinct scientific provenance groups", () => {
    const eligibility = getPortraitEligibility([
      fixture("psychometrics", "ipip-50-v1"),
      fixture("darktriad", "sd3-27-v1"),
      fixture("numerology", "numerology-symbolic-v1"),
    ]);

    expect(eligibility).toMatchObject({
      distinctAnalysisCount: 3,
      scientificProvenanceCount: 2,
      missingAnalysisCount: 0,
      missingScientificProvenanceCount: 0,
      isUnlocked: true,
    });
  });

  it("uses the newest result for a retaken analysis", () => {
    const oldest = fixture("psychometrics", "ipip-50-v1", "2026-08-28T00:00:00.000Z");
    const newest = fixture("psychometrics", "ipip-50-v1", "2026-08-29T00:00:00.000Z");

    expect(selectCurrentSnapshots([newest, oldest])).toEqual([newest]);
  });

  it("excludes a pilot-withheld cognitive result from the portrait count", () => {
    const eligibility = getPortraitEligibility([
      fixture("psychometrics", "ipip-50-v1"),
      fixture("darktriad", "sd3-27-v1"),
      fixture("cognitive", "cognitive-standardized-v1"),
    ]);

    expect(eligibility).toMatchObject({
      distinctAnalysisCount: 2,
      scientificProvenanceCount: 2,
      missingAnalysisCount: 1,
      missingScientificProvenanceCount: 0,
      isUnlocked: false,
    });
  });
});
