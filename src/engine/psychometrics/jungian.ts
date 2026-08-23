import type { EvidenceTier } from "@engine/shared/tier";
import { ITEMS, itemsOfFactor, type BigFiveFactor } from "./items";
import { scoreItem, type FactorScore, type LikertResponse } from "./scoring";

/** Four display axes used by LUMINA's MBTI type test (IPIP-50 based). */
export type JungianAxis = "EI" | "SN" | "TF" | "JP";

export type JungianPole = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

export interface AxisScore {
  readonly axis: JungianAxis;
  readonly sourceFactor: BigFiveFactor;
  /** -100..+100; the negative pole is I/S/T/J and the positive pole is E/N/F/P. */
  readonly continuous: number;
  /** A propagated 95% interval on the same continuous scale. */
  readonly ci95: readonly [number, number];
  readonly pole: JungianPole | null;
  /** The score is close enough to the midpoint that a letter would overstate certainty. */
  readonly isBoundary: boolean;
  /** Reference correlation used to justify the factor-to-axis correspondence. */
  readonly correlationBasis: number;
  /** The underlying standardized factor score, kept for transparent rendering and tests. */
  readonly zScore: number;
}

export interface JungianLensResult {
  readonly engine: "psychometrics";
  readonly tier: EvidenceTier;
  readonly version: 1;
  readonly axes: readonly AxisScore[];
  /** Four letters, with ? where an axis is too close to its midpoint. */
  readonly typeCode: string | null;
  /** 0..1; the least certain axis controls the summary certainty. */
  readonly typeCertainty: number;
}

export interface AxisPreview {
  readonly axis: JungianAxis;
  readonly continuous: number;
  readonly answeredFactorRatio: number;
}

export class JungianInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JungianInputError";
  }
}

/**
 * The comparison paper reports separate male/female self-report coefficients.
 * We use their arithmetic midpoint as a compact literature reference, not as a
 * claim about the user's own correlation or a new norm.
 */
export const AXIS_CORRELATION_BASIS: Readonly<Record<JungianAxis, number>> = Object.freeze({
  EI: 0.715,
  SN: 0.705,
  TF: 0.45,
  JP: -0.475,
});

export const BOUNDARY_Z = 0.25;
export const CONTINUOUS_SCALE_PER_Z = 25;

interface AxisConfig {
  readonly axis: JungianAxis;
  readonly sourceFactor: BigFiveFactor;
  readonly negativePole: JungianPole;
  readonly positivePole: JungianPole;
  /** Reverses the source factor only for JP, whose positive display pole is P. */
  readonly factorDirection: 1 | -1;
  readonly correlationBasis: number;
}

const AXIS_CONFIGS: readonly AxisConfig[] = Object.freeze([
  Object.freeze({
    axis: "EI" as const,
    sourceFactor: "extraversion" as const,
    negativePole: "I" as const,
    positivePole: "E" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.EI,
  }),
  Object.freeze({
    axis: "SN" as const,
    sourceFactor: "intellect" as const,
    negativePole: "S" as const,
    positivePole: "N" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.SN,
  }),
  Object.freeze({
    axis: "TF" as const,
    sourceFactor: "agreeableness" as const,
    negativePole: "T" as const,
    positivePole: "F" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.TF,
  }),
  Object.freeze({
    axis: "JP" as const,
    sourceFactor: "conscientiousness" as const,
    negativePole: "J" as const,
    positivePole: "P" as const,
    factorDirection: -1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.JP,
  }),
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function standardizedScore(score: FactorScore): number {
  const z = score.norm?.zScore ?? (score.scalePosition0to100 - 50) / 25;
  if (!Number.isFinite(z)) throw new JungianInputError(`non-finite z score for ${score.factor}`);
  return z;
}

function scoreMap(scores: readonly FactorScore[]): ReadonlyMap<BigFiveFactor, FactorScore> {
  const map = new Map<BigFiveFactor, FactorScore>();
  for (const score of scores) {
    if (map.has(score.factor)) throw new JungianInputError(`duplicate factor score: ${score.factor}`);
    map.set(score.factor, score);
  }
  return map;
}

function axisLetter(axis: AxisScore, config: AxisConfig): JungianPole | null {
  if (axis.isBoundary) return null;
  return axis.continuous < 0 ? config.negativePole : config.positivePole;
}

function propagatedInterval(score: FactorScore, continuous: number, factorDirection: 1 | -1): readonly [number, number] {
  const standardDeviation = score.norm?.standardDeviation ?? 0;
  if (!Number.isFinite(standardDeviation) || standardDeviation <= 0 || score.reliability.sem <= 0) {
    return Object.freeze([continuous, continuous] as [number, number]);
  }

  const halfWidth = (1.96 * score.reliability.sem * CONTINUOUS_SCALE_PER_Z) / standardDeviation;
  const signedHalfWidth = Math.abs(factorDirection) * halfWidth;
  return Object.freeze([
    clamp(continuous - signedHalfWidth, -100, 100),
    clamp(continuous + signedHalfWidth, -100, 100),
  ] as [number, number]);
}

function freezeAxis(axis: AxisScore): AxisScore {
  return Object.freeze({
    ...axis,
    ci95: Object.freeze([...axis.ci95] as [number, number]),
  });
}

/**
 * Re-expresses the already-computed Big Five factors on four familiar letter
 * axes. No new items, random state, clock, or categorical measurement is used.
 */
export function computeJungianLenses(scores: readonly FactorScore[]): JungianLensResult {
  const byFactor = scoreMap(scores);
  const axes = AXIS_CONFIGS.map((config) => {
    const source = byFactor.get(config.sourceFactor);
    if (!source) throw new JungianInputError(`missing factor score: ${config.sourceFactor}`);
    const zScore = standardizedScore(source);
    const continuous = clamp(zScore * config.factorDirection * CONTINUOUS_SCALE_PER_Z, -100, 100);
    const isBoundary = Math.abs(zScore) < BOUNDARY_Z;
    const preliminary: AxisScore = {
      axis: config.axis,
      sourceFactor: config.sourceFactor,
      continuous,
      ci95: propagatedInterval(source, continuous, config.factorDirection),
      pole: null,
      isBoundary,
      correlationBasis: config.correlationBasis,
      zScore,
    };
    return freezeAxis({ ...preliminary, pole: axisLetter(preliminary, config) });
  });

  const typeCode = axes.length === AXIS_CONFIGS.length
    ? axes.map((axis) => axis.pole ?? "?").join("")
    : null;
  const minimumDistance = Math.min(...axes.map((axis) => Math.abs(axis.zScore)));
  const typeCertainty = Number.isFinite(minimumDistance)
    ? clamp((minimumDistance - BOUNDARY_Z) / (2 - BOUNDARY_Z), 0, 1)
    : 0;

  return Object.freeze({
    engine: "psychometrics" as const,
    tier: "scientific" as const,
    version: 1 as const,
    axes: Object.freeze(axes),
    typeCode,
    typeCertainty,
  });
}

/**
 * A deliberately provisional preview for the survey progress strip. It uses
 * answered items only, treats unanswered items as neutral, and never produces
 * a type code or a result. The final result always comes from computeFactorScores.
 */
export function previewJungianAxes(
  responses: Partial<Record<number, LikertResponse>>,
): readonly AxisPreview[] {
  return Object.freeze(
    AXIS_CONFIGS.map((config) => {
      const items = itemsOfFactor(config.sourceFactor);
      const answered = items.filter((item) => responses[item.id] !== undefined);
      const mean = answered.length === 0
        ? 3
        : answered.reduce((sum, item) => sum + scoreItem(item, responses[item.id]!), 0) / answered.length;
      const continuous = clamp((mean - 3) * 50 * config.factorDirection, -100, 100);
      return Object.freeze({
        axis: config.axis,
        continuous,
        answeredFactorRatio: answered.length / items.length,
      });
    }),
  );
}

export function jungianAxisConfig(axis: JungianAxis): AxisConfig {
  const config = AXIS_CONFIGS.find((item) => item.axis === axis);
  if (!config) throw new JungianInputError(`unknown axis: ${axis}`);
  return config;
}

/** Kept exported for tests and documentation without exposing mutable internals. */
export const JUNGIAN_AXES: readonly JungianAxis[] = Object.freeze(AXIS_CONFIGS.map((config) => config.axis));

/** Stable guard against accidental item-set drift in the preview implementation. */
export const JUNGIAN_ITEM_COUNT = ITEMS.length;
