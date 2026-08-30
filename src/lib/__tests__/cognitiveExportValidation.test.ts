import { describe, expect, it } from "vitest";

import {
  COGNITIVE_EXPORT_COLUMNS,
  CognitiveExportValidationError,
  validateCognitiveExport,
} from "../cognitiveResearch/exportValidation";

const runOne = "00000000-0000-4000-8000-000000000001";
const runTwo = "00000000-0000-4000-8000-000000000002";

function row(overrides: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> {
  return {
    run_id: runOne,
    item_version_id: "gf-001",
    ordinal: "1",
    submitted_option_id: "gf-001:a",
    scored_correct: "1",
    submitted_at: "2026-08-28T00:00:00Z",
    consent_version: "cognitive-pilot-consent-v1",
    age_band: "25-34",
    education_band: "unreported",
    region_class: "unreported",
    device_eligibility: "eligible",
    recontact_token: "synthetic-token-1",
    item_bank_version: "cognitive-pilot-v1",
    algorithm_version: "cat-v1",
    split: "development",
    ...overrides,
  };
}

function validExport() {
  return [
    row(),
    row({
      item_version_id: "gc-001",
      ordinal: "2",
      submitted_option_id: "gc-001:b",
      scored_correct: "0",
      submitted_at: "2026-08-28T00:00:04Z",
    }),
    row({
      run_id: runTwo,
      item_version_id: "gf-001",
      split: "holdout",
      recontact_token: "synthetic-token-2",
      submitted_at: "2026-08-28T00:00:00Z",
    }),
  ];
}

describe("cognitive research export validation", () => {
  it("accepts the synthetic development and holdout fixture", () => {
    const summary = validateCognitiveExport(COGNITIVE_EXPORT_COLUMNS, validExport(), {
      dictionaryColumns: COGNITIVE_EXPORT_COLUMNS,
      approvedConsentVersions: ["cognitive-pilot-consent-v1"],
      expectedItemBankVersion: "cognitive-pilot-v1",
      expectedAlgorithmVersion: "cat-v1",
      allowedItemVersionIds: new Set(["gf-001", "gc-001"]),
    });

    expect(summary).toMatchObject({
      status: "valid",
      rowCount: 3,
      runCount: 2,
      uniqueItemCount: 2,
      itemBankVersion: "cognitive-pilot-v1",
      algorithmVersion: "cat-v1",
      runsBySplit: { development: 1, holdout: 1, retest: 0 },
    });
  });

  it("rejects forbidden identifiers before any version checks", () => {
    expect(() => validateCognitiveExport([...COGNITIVE_EXPORT_COLUMNS, "email"], validExport().map((entry) => ({ ...entry, email: "redacted" })), {
      dictionaryColumns: [...COGNITIVE_EXPORT_COLUMNS, "email"],
    })).toThrow("forbidden columns");
  });

  it("rejects mixed versions, duplicate assignments, and non-catalog items", () => {
    const invalid = validExport().map((entry) => ({ ...entry }));
    invalid[1] = { ...invalid[1]!, item_bank_version: "cognitive-pilot-v2" };
    invalid[2] = { ...invalid[2]!, item_version_id: "retired:gf:001" };
    invalid.push({ ...invalid[0]! });

    expect(() => validateCognitiveExport(COGNITIVE_EXPORT_COLUMNS, invalid, {
      dictionaryColumns: COGNITIVE_EXPORT_COLUMNS,
      allowedItemVersionIds: new Set(["gf-001", "gc-001"]),
    })).toThrow(CognitiveExportValidationError);
    try {
      validateCognitiveExport(COGNITIVE_EXPORT_COLUMNS, invalid, {
        dictionaryColumns: COGNITIVE_EXPORT_COLUMNS,
        allowedItemVersionIds: new Set(["gf-001", "gc-001"]),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CognitiveExportValidationError);
      const reasons = (error as CognitiveExportValidationError).reasons.join(" | ");
      expect(reasons).toContain("mixed or missing item-bank version");
      expect(reasons).toContain("duplicate answered assignment");
      expect(reasons).toContain("approved catalog");
    }
  });

  it("rejects out-of-order responses and an export without holdout", () => {
    const invalid = validExport().slice(0, 2).map((entry) => ({ ...entry }));
    invalid[1] = {
      ...invalid[1]!,
      submitted_at: "2026-08-27T23:59:59Z",
    };

    expect(() => validateCognitiveExport(COGNITIVE_EXPORT_COLUMNS, invalid)).toThrow("submitted timestamps are out of order");
    expect(() => validateCognitiveExport(COGNITIVE_EXPORT_COLUMNS, validExport().slice(0, 2))).toThrow("holdout split is required");
  });
});
