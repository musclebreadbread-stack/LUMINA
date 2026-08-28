import type { StandardizedScore } from "./types";

export interface AgeNormRow {
  readonly minimumAge: number;
  readonly maximumAge: number;
  /** A monotone table evaluated on the default theta grid (-4..4) unless thetaGrid is supplied. */
  readonly thetaToIq: readonly number[];
  /** IQ-indexed percentile table. Values are proportions or percentages. */
  readonly iqToPercentile: readonly number[];
}

export interface NormTable {
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
  readonly iqPointsPerTheta: number;
  readonly byAge: readonly AgeNormRow[];
  readonly thetaGrid?: readonly number[];
}

export interface ApprovedNormVersion extends NormTable {
  readonly id: string;
  readonly status: "approved";
  readonly targetPopulation: "ko-adults-18-64";
  readonly approvedAt: string;
}

export interface NormConversionInput {
  readonly theta: number;
  readonly sem: number;
  readonly age: number;
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
}

export type StandardizedIqBand =
  | "well_below_average"
  | "below_average"
  | "average"
  | "above_average"
  | "well_above_average";

const DEFAULT_THETA_GRID = Object.freeze([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
const MIN_IQ = 40;

/**
 * Mean-100/SD-15 descriptive bands. These labels describe a score interval;
 * they are not a diagnosis, ability trait, or eligibility decision.
 */
export function standardizedIqBand(iq: number): StandardizedIqBand {
  finite(iq, "IQ");
  if (iq < 70) return "well_below_average";
  if (iq < 85) return "below_average";
  if (iq < 115) return "average";
  if (iq < 130) return "above_average";
  return "well_above_average";
}

function finite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function percentileFromNormal(iq: number): number {
  // Abramowitz-Stegun 7.1.26 approximation; enough precision for a display percentile.
  const z = (iq - 100) / 15;
  const sign = z < 0 ? -1 : 1;
  const absolute = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - polynomial * Math.exp(-absolute * absolute);
  const cdf = 0.5 * (1 + sign * erf);
  return Math.max(1, Math.min(99, cdf * 100));
}

function ageRow(age: number, norm: NormTable): AgeNormRow {
  const row = norm.byAge.find((candidate) => age >= candidate.minimumAge && age <= candidate.maximumAge);
  if (row === undefined) throw new Error("age is outside the approved norm range");
  if (row.thetaToIq.length < 2) throw new Error("norm table requires at least two theta points");
  if (row.iqToPercentile.length === 0) throw new Error("norm table requires percentile points");
  return row;
}

function assertMonotone(values: readonly number[], label: string): void {
  if (values.some((value) => !Number.isFinite(value))) throw new Error(`${label} must contain finite values`);
  for (let index = 1; index < values.length; index += 1) {
    if (values[index]! < values[index - 1]!) throw new Error(`${label} must be monotone`);
  }
}

function validateNormTable(norm: NormTable): void {
  if (norm.byAge.length === 0) throw new Error("norm table requires age rows");
  const rows = [...norm.byAge].sort((left, right) => left.minimumAge - right.minimumAge);
  let previousMaximum = 17;
  for (const row of rows) {
    if (!Number.isInteger(row.minimumAge) || !Number.isInteger(row.maximumAge) || row.minimumAge < 18 || row.maximumAge > 64 || row.minimumAge > row.maximumAge) {
      throw new Error("norm age row is invalid");
    }
    if (row.minimumAge <= previousMaximum) throw new Error("norm age rows overlap");
    if (row.minimumAge > previousMaximum + 1) throw new Error("norm age rows have a gap");
    if (row.thetaToIq.length < 2) throw new Error("norm table requires at least two theta points");
    if (row.iqToPercentile.length < 2) throw new Error("norm table requires at least two percentile points");
    assertMonotone(row.thetaToIq, "theta-to-IQ values");
    assertMonotone(row.iqToPercentile, "IQ-to-percentile values");
    previousMaximum = row.maximumAge;
  }
  if (previousMaximum < 64) throw new Error("norm age rows do not cover the approved range");
  if (norm.thetaGrid !== undefined) {
    assertMonotone(norm.thetaGrid, "theta grid");
    if (norm.thetaGrid.length < 2 || norm.thetaGrid.some((value, index) => index > 0 && value === norm.thetaGrid![index - 1])) {
      throw new Error("theta grid must be strictly increasing");
    }
    if (rows.some((row) => row.thetaToIq.length !== norm.thetaGrid!.length)) throw new Error("theta grid and norm table length differ");
  }
}

function interpolate(x: number, xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 2) throw new Error("norm interpolation table is malformed");
  if (x <= xs[0]!) return ys[0]!;
  const last = xs.length - 1;
  if (x >= xs[last]!) return ys[last]!;
  for (let index = 1; index < xs.length; index += 1) {
    const right = xs[index]!;
    if (x <= right) {
      const left = xs[index - 1]!;
      const proportion = (x - left) / (right - left);
      return ys[index - 1]! + proportion * (ys[index]! - ys[index - 1]!);
    }
  }
  return ys[last]!;
}

function lookupIq(theta: number, age: number, norm: NormTable): number {
  const row = ageRow(age, norm);
  const grid = norm.thetaGrid ?? (row.thetaToIq.length === DEFAULT_THETA_GRID.length
    ? DEFAULT_THETA_GRID
    : row.thetaToIq.map((_, index) => -4 + (8 * index) / (row.thetaToIq.length - 1)));
  if (grid.length !== row.thetaToIq.length) throw new Error("theta grid and norm table length differ");
  return Math.round(interpolate(theta, grid, row.thetaToIq));
}

function lookupPercentile(iq: number, row: AgeNormRow): number {
  if (row.iqToPercentile.length < 2) return Math.round(percentileFromNormal(iq));
  const iqGrid = row.iqToPercentile.map((_, index) => MIN_IQ + index);
  const value = interpolate(iq, iqGrid, row.iqToPercentile);
  // Accept either proportions (0..1) or percentages (0..100) in the immutable artifact.
  const percentage = value <= 1 ? value * 100 : value;
  return Math.max(1, Math.min(99, Math.round(percentage)));
}

export function assertNormCompatibility(input: NormConversionInput, norm: ApprovedNormVersion): void {
  finite(input.theta, "theta");
  finite(input.sem, "standard error");
  finite(input.age, "age");
  if (input.sem < 0) throw new Error("standard error cannot be negative");
  if (norm.status !== "approved") throw new Error("approved norm version is required");
  if (norm.targetPopulation !== "ko-adults-18-64") throw new Error("norm target population mismatch");
  if (input.itemBankVersion !== norm.itemBankVersion) throw new Error("item bank version mismatch");
  if (input.algorithmVersion !== norm.algorithmVersion) throw new Error("algorithm version mismatch");
  if (!Number.isInteger(input.age) || input.age < 18 || input.age > 64) throw new Error("age is outside the approved norm range");
  finite(norm.iqPointsPerTheta, "IQ conversion scale");
  if (norm.iqPointsPerTheta <= 0) throw new Error("IQ conversion scale must be positive");
  validateNormTable(norm);
  ageRow(input.age, norm);
}

export function thetaToStandardizedScore(input: NormConversionInput, norm: ApprovedNormVersion): StandardizedScore {
  assertNormCompatibility(input, norm);
  const row = ageRow(input.age, norm);
  const fullScaleIq = lookupIq(input.theta, input.age, norm);
  const margin = Math.round(1.96 * input.sem * norm.iqPointsPerTheta);
  return Object.freeze({
    fullScaleIq,
    percentile: lookupPercentile(fullScaleIq, row),
    confidenceInterval95: [fullScaleIq - margin, fullScaleIq + margin] as const,
    normVersion: norm.id,
  });
}
