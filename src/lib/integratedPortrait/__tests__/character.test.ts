import { describe, expect, it } from "vitest";
import type { ResultSnapshotV1 } from "../contracts";
import { createCharacterRecipe } from "../character";

function snapshot(id: string, analysisKey: ResultSnapshotV1["analysisKey"], band: "low" | "high"): ResultSnapshotV1 {
  return {
    schemaVersion: 1,
    id,
    sourceAssessmentId: "00000000-0000-4000-8000-000000000201",
    analysisKey,
    provenanceGroup: analysisKey === "psychometrics" ? "ipip-50-v1" : "sd3-27-v1",
    lane: "scientific",
    instrumentVersion: "fixture-instrument-v1",
    scoringModelVersion: "fixture-scoring-v1",
    completedAt: "2026-08-29T00:00:00.000Z",
    locale: "ko",
    signals: [
      {
        constructId: `${analysisKey}.fixture`,
        value: { kind: "band", band },
        descriptorIds: ["relative-band"],
        limitationIds: ["fixture"],
      },
    ],
    referenceIds: [analysisKey],
  };
}

describe("integrated portrait character recipe", () => {
  it("is deterministic regardless of snapshot input order", () => {
    const bigFive = snapshot("big-five", "psychometrics", "low");
    const darkTriad = snapshot("dark-triad", "darktriad", "high");

    expect(createCharacterRecipe([darkTriad, bigFive])).toEqual(
      createCharacterRecipe([bigFive, darkTriad]),
    );
  });

  it("does not map measured values to character layers", () => {
    const low = snapshot("big-five-low", "psychometrics", "low");
    const high = snapshot("big-five-high", "psychometrics", "high");

    expect(createCharacterRecipe([low])).toEqual(createCharacterRecipe([high]));
  });

  it("includes one artwork for every current lens and promotes the latest lens", () => {
    const bigFive = snapshot("big-five", "psychometrics", "low");
    const darkTriad = {
      ...snapshot("dark-triad", "darktriad", "high"),
      completedAt: "2026-08-30T00:00:00.000Z",
    };

    expect(createCharacterRecipe([bigFive, darkTriad])).toMatchObject({
      artworkKeys: ["darktriad", "psychometrics"],
      primaryArtworkKey: "darktriad",
    });
  });

  it("returns a local fallback recipe for an empty set", () => {
    expect(createCharacterRecipe([])).toMatchObject({
      schemaVersion: 1,
      fallback: true,
      backgroundLayer: "ink-mist",
      artworkKeys: [],
      primaryArtworkKey: null,
    });
  });
});
