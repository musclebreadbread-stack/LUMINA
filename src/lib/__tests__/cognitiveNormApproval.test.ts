import { describe, expect, it } from "vitest";
import { parseNormTablePayload, parseReleaseManifest, parseReviewRecord } from "../cognitiveNormApproval";

const CANDIDATE_MANIFEST = {
  status: "candidate",
  item_bank_version: "cognitive-pilot-v1",
  algorithm_version: "cat-v1",
  evidence_hashes: ["a".repeat(64), "b".repeat(64)],
};

function ageRow(minimumAge: number, maximumAge: number) {
  return {
    minimumAge,
    maximumAge,
    thetaToIq: [70, 85, 100, 115, 130],
    iqToPercentile: [2, 16, 50, 84, 98],
  };
}

const VALID_PAYLOAD = {
  itemBankVersion: "cognitive-pilot-v1",
  algorithmVersion: "cat-v1",
  iqPointsPerTheta: 15,
  byAge: [ageRow(18, 34), ageRow(35, 49), ageRow(50, 64)],
};

const VALID_REVIEW = {
  reviewer: "Dr. Kim (synthetic fixture reviewer)",
  date: "2026-08-29",
  statement: "Independently reviewed IRT, structure, precision, DIF, and external validity evidence.",
};

describe("parseReleaseManifest", () => {
  it("accepts a candidate manifest", () => {
    const manifest = parseReleaseManifest(CANDIDATE_MANIFEST);
    expect(manifest.status).toBe("candidate");
    expect(manifest.itemBankVersion).toBe("cognitive-pilot-v1");
  });

  it("refuses a blocked manifest", () => {
    expect(() => parseReleaseManifest({ ...CANDIDATE_MANIFEST, status: "blocked" })).toThrow('not "candidate"');
  });

  it("rejects a manifest missing required fields", () => {
    expect(() => parseReleaseManifest({ status: "candidate" })).toThrow("item_bank_version/algorithm_version");
  });
});

describe("parseNormTablePayload", () => {
  const manifest = parseReleaseManifest(CANDIDATE_MANIFEST);

  it("accepts a payload with full 18-64 age coverage and monotone tables", () => {
    const table = parseNormTablePayload(VALID_PAYLOAD, manifest);
    expect(table.byAge).toHaveLength(3);
  });

  it("rejects a payload whose version does not match the release manifest", () => {
    expect(() => parseNormTablePayload({ ...VALID_PAYLOAD, itemBankVersion: "other-version" }, manifest)).toThrow(
      "does not match the release manifest",
    );
  });

  it("rejects a payload with a gap in age coverage (reuses the live scoring engine's own rule)", () => {
    const withGap = { ...VALID_PAYLOAD, byAge: [ageRow(18, 34), ageRow(40, 64)] };
    expect(() => parseNormTablePayload(withGap, manifest)).toThrow("gap");
  });

  it("rejects a payload with a non-monotone theta-to-IQ table", () => {
    const broken = {
      ...VALID_PAYLOAD,
      byAge: [{ ...ageRow(18, 64), thetaToIq: [100, 90, 110, 120, 130] }],
    };
    expect(() => parseNormTablePayload(broken, manifest)).toThrow("monotone");
  });

  it("rejects a payload with a structurally malformed age row", () => {
    expect(() => parseNormTablePayload({ ...VALID_PAYLOAD, byAge: [{ minimumAge: 18 }] }, manifest)).toThrow(
      "byAge[0]",
    );
  });
});

describe("parseReviewRecord", () => {
  it("accepts a complete review record", () => {
    expect(parseReviewRecord(VALID_REVIEW)).toEqual(VALID_REVIEW);
  });

  it("rejects a review record with a blank statement", () => {
    expect(() => parseReviewRecord({ ...VALID_REVIEW, statement: "  " })).toThrow("statement is required");
  });

  it("rejects a review record missing the reviewer", () => {
    expect(() => parseReviewRecord({ date: VALID_REVIEW.date, statement: VALID_REVIEW.statement })).toThrow(
      "reviewer is required",
    );
  });
});
