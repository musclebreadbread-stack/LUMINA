import { describe, expect, it } from "vitest";
import type { ResultSnapshotV1 } from "../contracts";
import { createSynthesis } from "../synthesis";

function snapshot(
  id: string,
  analysisKey: ResultSnapshotV1["analysisKey"],
  provenanceGroup: string,
  lane: ResultSnapshotV1["lane"],
  constructId: string,
): ResultSnapshotV1 {
  return {
    schemaVersion: 1,
    id,
    sourceAssessmentId: "00000000-0000-4000-8000-000000000101",
    analysisKey,
    provenanceGroup,
    lane,
    instrumentVersion: "fixture-instrument-v1",
    scoringModelVersion: "fixture-scoring-v1",
    completedAt: "2026-08-29T00:00:00.000Z",
    locale: "ko",
    signals: [
      {
        constructId,
        value: { kind: "band", band: "mid" },
        descriptorIds: ["relative-band.mid"],
        limitationIds: [`limitation.${analysisKey}`],
      },
    ],
    referenceIds: [analysisKey],
  };
}

describe("integrated portrait synthesis", () => {
  it("does not create a supported claim from the same IPIP-50 provenance group", () => {
    const report = createSynthesis([
      snapshot("big-five", "psychometrics", "ipip-50-v1", "scientific", "bigfive.extraversion"),
      snapshot("jungian", "jungian", "ipip-50-v1", "scientific", "jungian.ei"),
    ]);

    expect(report.scientificClaims.some((claim) => claim.status === "supported")).toBe(false);
  });

  it("keeps cultural observations separate from scientific claims", () => {
    const report = createSynthesis([
      snapshot("big-five", "psychometrics", "ipip-50-v1", "scientific", "bigfive.extraversion"),
      snapshot("saju", "saju", "saju-symbolic-v1", "cultural", "saju.dominant-element"),
    ]);

    expect(report.scientificClaims).toHaveLength(1);
    expect(report.culturalObservations).toHaveLength(1);
    expect(report.contextualClaims).toHaveLength(0);
    expect(report.scientificClaims[0]?.sourceSignalIds[0]).toContain("big-five");
    expect(report.culturalObservations[0]?.status).toBe("exploratory");
  });

  it("is independent of input order and never invents a comparison rule", () => {
    const bigFive = snapshot("big-five", "psychometrics", "ipip-50-v1", "scientific", "bigfive.extraversion");
    const darkTriad = snapshot("dark-triad", "darktriad", "sd3-27-v1", "scientific", "darktriad.narcissism");

    expect(createSynthesis([bigFive, darkTriad])).toEqual(createSynthesis([darkTriad, bigFive]));
    expect(createSynthesis([bigFive, darkTriad]).scientificClaims).toHaveLength(2);
  });
});
