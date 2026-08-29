import { describe, expect, it } from "vitest";
import type { ResultSnapshotV1 } from "../contracts";
import { validateSnapshot } from "../validation";

const validSnapshot: ResultSnapshotV1 = {
  schemaVersion: 1,
  id: "00000000-0000-4000-8000-000000000001",
  sourceAssessmentId: "00000000-0000-4000-8000-000000000002",
  analysisKey: "psychometrics",
  provenanceGroup: "ipip-50-v1",
  lane: "scientific",
  instrumentVersion: "IPIP-50/Goldberg-1992",
  scoringModelVersion: "big-five-derived-v1",
  completedAt: "2026-08-29T00:00:00.000Z",
  locale: "ko",
  signals: [
    {
      constructId: "bigfive.extraversion",
      value: { kind: "band", band: "mid" },
      descriptorIds: ["band.mid"],
      limitationIds: ["limitation.psychometrics"],
    },
  ],
  referenceIds: ["psychometrics"],
};

describe("integrated portrait snapshot validation", () => {
  it("accepts the exact safe snapshot contract", () => {
    const result = validateSnapshot(validSnapshot);

    expect(result).toEqual({ ok: true, value: validSnapshot });
  });

  it("rejects a snapshot carrying a raw response or birth field", () => {
    const withResponses: unknown = { ...validSnapshot, responses: [1, 2] };
    const withBirthDate: unknown = { ...validSnapshot, birthDate: "2000-01-01" };

    expect(validateSnapshot(withResponses)).toEqual({ ok: false, reason: "unknown-field" });
    expect(validateSnapshot(withBirthDate)).toEqual({ ok: false, reason: "unknown-field" });
  });

  it("rejects a registry mismatch and a standardized-score-shaped field", () => {
    const wrongProvenance: unknown = { ...validSnapshot, provenanceGroup: "other-v1" };
    const withScore: unknown = {
      ...validSnapshot,
      signals: [
        {
          ...validSnapshot.signals[0],
          value: { kind: "band", band: "mid", standardizedScore: 50 },
        },
      ],
    };

    expect(validateSnapshot(wrongProvenance)).toEqual({ ok: false, reason: "registry-mismatch" });
    expect(validateSnapshot(withScore)).toEqual({ ok: false, reason: "unknown-field" });
  });

  it("rejects non-canonical timestamps and pilot-withheld cognitive results", () => {
    const nonCanonical: unknown = { ...validSnapshot, completedAt: "yesterday" };
    const cognitive: unknown = {
      ...validSnapshot,
      analysisKey: "cognitive",
      provenanceGroup: "cognitive-standardized-v1",
      lane: "scientific",
      instrumentVersion: "lumina-cognitive-standardized-pilot/2026-08",
      scoringModelVersion: "cognitive-standardized-v1",
    };

    expect(validateSnapshot(nonCanonical)).toEqual({ ok: false, reason: "invalid-field" });
    expect(validateSnapshot(cognitive)).toEqual({ ok: false, reason: "not-eligible" });
  });
});
