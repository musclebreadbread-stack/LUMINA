import { describe, expect, it } from "vitest";

import {
  assertNormCompatibility,
  standardizedIqBand,
  thetaToStandardizedScore,
  validateNormTable,
  type AgeNormRow,
  type ApprovedNormVersion,
  type NormConversionInput,
} from "../norming";

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

const BASE_INPUT: NormConversionInput = {
  theta: 0,
  sem: 0.3,
  age: 32,
  itemBankVersion: "pilot-v1",
  algorithmVersion: "cat-v1",
};

function fixtureAgeRow(overrides: Partial<AgeNormRow> = {}): AgeNormRow {
  const row = approvedFixtureNorm.byAge[0];
  if (!row) throw new Error("expected the approved fixture age row");
  return { ...row, ...overrides };
}

function fixtureNormWithRow(
  row: AgeNormRow,
  overrides: Partial<ApprovedNormVersion> = {},
): ApprovedNormVersion {
  return { ...approvedFixtureNorm, ...overrides, byAge: [row] };
}

function convert(
  inputOverrides: Partial<NormConversionInput> = {},
  norm: ApprovedNormVersion = approvedFixtureNorm,
) {
  return thetaToStandardizedScore({ ...BASE_INPUT, ...inputOverrides }, norm);
}

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

  it("rejects a norm table with overlapping age rows", () => {
    expect(() => thetaToStandardizedScore({ theta: 0, sem: 0.3, age: 32, itemBankVersion: "pilot-v1", algorithmVersion: "cat-v1" }, {
      ...approvedFixtureNorm,
      byAge: [
        approvedFixtureNorm.byAge[0]!,
        { ...approvedFixtureNorm.byAge[0]!, minimumAge: 60, maximumAge: 64 },
      ],
    })).toThrow("norm age rows overlap");
  });

  it("rejects empty, invalid, gapped, and incomplete age coverage", () => {
    expect(() => validateNormTable({ ...approvedFixtureNorm, byAge: [] })).toThrow("norm table requires age rows");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ minimumAge: 17 })))).toThrow("norm age row is invalid");
    expect(() => validateNormTable({
      ...approvedFixtureNorm,
      byAge: [
        fixtureAgeRow({ maximumAge: 30 }),
        fixtureAgeRow({ minimumAge: 32, maximumAge: 64 }),
      ],
    })).toThrow("norm age rows have a gap");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ maximumAge: 63 })))).toThrow("norm age rows do not cover the approved range");
  });

  it("rejects short or non-monotone conversion tables", () => {
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ thetaToIq: [100] })))).toThrow("at least two theta points");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ iqToPercentile: [50] })))).toThrow("at least two percentile points");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ thetaToIq: [70, 60] })))).toThrow("theta-to-IQ values must be monotone");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ iqToPercentile: [60, 50] })))).toThrow("IQ-to-percentile values must be monotone");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow({ thetaToIq: [70, Number.NaN, 130] })))).toThrow("theta-to-IQ values must contain finite values");
  });

  it("rejects malformed custom theta grids", () => {
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow(), { thetaGrid: [-1, Number.NaN, 1] }))).toThrow("theta grid must contain finite values");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow(), { thetaGrid: [0, -1] }))).toThrow("theta grid must be monotone");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow(), { thetaGrid: [-1, 0, 0] }))).toThrow("theta grid must be strictly increasing");
    expect(() => validateNormTable(fixtureNormWithRow(fixtureAgeRow(), { thetaGrid: [-1, 0, 1] }))).toThrow("theta grid and norm table length differ");
  });

  it("rejects incompatible metadata, invalid inputs, and non-approved norm payloads", () => {
    expect(() => assertNormCompatibility({ ...BASE_INPUT, theta: Number.NaN }, approvedFixtureNorm)).toThrow("theta must be finite");
    expect(() => assertNormCompatibility({ ...BASE_INPUT, sem: Number.POSITIVE_INFINITY }, approvedFixtureNorm)).toThrow("standard error must be finite");
    expect(() => assertNormCompatibility({ ...BASE_INPUT, age: Number.NaN }, approvedFixtureNorm)).toThrow("age must be finite");
    expect(() => convert({ sem: -0.1 })).toThrow("standard error cannot be negative");
    expect(() => convert({ algorithmVersion: "other" })).toThrow("algorithm version mismatch");
    expect(() => convert({ age: 32.5 })).toThrow("age is outside the approved norm range");
    expect(() => convert({}, { ...approvedFixtureNorm, iqPointsPerTheta: 0 })).toThrow("IQ conversion scale must be positive");
    expect(() => convert({}, { ...approvedFixtureNorm, iqPointsPerTheta: Number.NaN })).toThrow("IQ conversion scale must be finite");
    expect(() => convert({}, { ...approvedFixtureNorm, status: "candidate" } as unknown as ApprovedNormVersion)).toThrow("approved norm version is required");
    expect(() => convert({}, { ...approvedFixtureNorm, targetPopulation: "ko-adults-18-65" } as unknown as ApprovedNormVersion)).toThrow("norm target population mismatch");
  });

  it("clamps theta at table endpoints and converts a custom grid with proportion percentiles", () => {
    expect(convert({ theta: -5 }).fullScaleIq).toBe(40);
    expect(convert({ theta: 5 }).fullScaleIq).toBe(160);

    const customNorm = fixtureNormWithRow(
      fixtureAgeRow({
        thetaToIq: [70, 100, 130],
        iqToPercentile: Array.from({ length: 121 }, (_, index) => index / 120),
      }),
      { thetaGrid: [-1, 0, 1] },
    );
    const score = convert({ theta: 0.5 }, customNorm);

    expect(score.fullScaleIq).toBe(115);
    expect(score.percentile).toBe(63);
    expect(score.confidenceInterval95).toEqual([106, 124]);
  });

  it("derives a theta grid for shorter tables and rejects non-finite display bands", () => {
    const shortTableNorm = fixtureNormWithRow(
      fixtureAgeRow({ thetaToIq: [70, 100, 130] }),
    );

    expect(convert({ theta: 0 }, shortTableNorm).fullScaleIq).toBe(100);
    expect(() => standardizedIqBand(Number.POSITIVE_INFINITY)).toThrow("IQ must be finite");
  });
});
