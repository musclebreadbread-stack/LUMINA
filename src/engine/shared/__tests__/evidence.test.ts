import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import type { EvidenceProfile } from "@engine/shared/evidence";
import { DARK_TRIAD_CITATIONS } from "@engine/darktriad/citations";
import { ATTACHMENT_CITATIONS } from "@engine/attachment/citations";

describe("evidence metadata contracts", () => {
  it("keeps every citation complete and valid", () => {
    [...DARK_TRIAD_CITATIONS, ...ATTACHMENT_CITATIONS].forEach((citation) => {
      expect(isValidCitation(citation)).toBe(true);
    });
  });

  it("keeps evidence profiles readonly-compatible and explicit", () => {
    const profile: EvidenceProfile = {
      methodCategory: "psychometric",
      validationStatus: "experimental",
      targetPopulation: "Korean adults",
      normSource: null,
      instrumentVersion: "internal-2026-08",
      licenseStatus: "permission-required",
      lastReviewed: "2026-08-24",
      limitations: ["No target-population norms"],
      referenceIds: ["attachment"],
    };

    expect(profile.normSource).toBeNull();
    expect(profile.limitations).toHaveLength(1);
  });
});
