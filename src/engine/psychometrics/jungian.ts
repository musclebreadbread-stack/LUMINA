import type { EvidenceTier } from "@engine/shared/tier";
import { ITEMS, itemAt, itemsOfFactor, type BigFiveFactor } from "./items";
import { scoreItem, type FactorScore, type LikertResponse } from "./scoring";
import { aspectContrastStandardDeviation, itemIdsOfAspect, type AspectScore, type EmotionalAspect } from "./aspects";

/** Six display axes used by LUMINA's MBTI-style 64-type analysis (IPIP-50 based). */
export type JungianAxis = "EI" | "SN" | "TF" | "JP" | "AT" | "VW";

/**
 * "T" is intentionally reused for both Thinking (TF axis) and Turbulent (AT axis) — the same
 * overload 16personalities uses for its own "-A"/"-T" suffix. Every pole is always read next to
 * its axis (label, image name, type-code position), so the two meanings never collide in context.
 */
export type JungianPole = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P" | "A" | "V" | "W";

export interface AxisScore {
  readonly axis: JungianAxis;
  /** null only for VW, which is a contrast between two aspect scores rather than one Big Five factor. */
  readonly sourceFactor: BigFiveFactor | null;
  /** -100..+100; the negative pole is I/S/T/J/T(urbulent)/W and the positive pole is E/N/F/P/A/V. */
  readonly continuous: number;
  /** A propagated 95% interval on the same continuous scale. */
  readonly ci95: readonly [number, number];
  readonly pole: JungianPole | null;
  /** The score is close enough to the midpoint that a letter would overstate certainty. */
  readonly isBoundary: boolean;
  /** Reference correlation used to justify the factor-to-axis correspondence; null when no published value exists (AT, VW). */
  readonly correlationBasis: number | null;
  /** The underlying standardized score, kept for transparent rendering and tests. */
  readonly zScore: number;
}

export interface JungianLensResult {
  readonly engine: "psychometrics";
  readonly tier: EvidenceTier;
  readonly version: 2;
  readonly axes: readonly AxisScore[];
  /** "XXXX-YZ" — four base-preference letters, a dash, then identity(A/T) and expression(V/W). ? where an axis is too close to its midpoint. */
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
 * claim about the user's own correlation or a new norm. AT and VW have no such
 * published correspondence — 16personalities' identity/expression axes are not part of
 * the McCrae & Costa (1989) MBTI–NEO-PI comparison, so both stay null rather than
 * inventing a number the literature does not report.
 */
export const AXIS_CORRELATION_BASIS: Readonly<Record<JungianAxis, number | null>> = Object.freeze({
  EI: 0.715,
  SN: 0.705,
  TF: 0.45,
  JP: -0.475,
  AT: null,
  VW: null,
});

export const BOUNDARY_Z = 0.25;
export const CONTINUOUS_SCALE_PER_Z = 25;

interface FactorAxisConfig {
  readonly kind: "factor";
  readonly axis: JungianAxis;
  readonly sourceFactor: BigFiveFactor;
  readonly negativePole: JungianPole;
  readonly positivePole: JungianPole;
  /** Reverses the source factor only for JP, whose positive display pole is P. */
  readonly factorDirection: 1 | -1;
  readonly correlationBasis: number | null;
}

/** VW is a contrast between two aspect scores of the same emotionalStability factor, not a single source factor. */
interface AspectContrastAxisConfig {
  readonly kind: "aspectContrast";
  readonly axis: JungianAxis;
  readonly negativePole: JungianPole;
  readonly positivePole: JungianPole;
  readonly correlationBasis: null;
}

type AxisConfig = FactorAxisConfig | AspectContrastAxisConfig;

const AXIS_CONFIGS: readonly AxisConfig[] = Object.freeze([
  Object.freeze({
    kind: "factor" as const,
    axis: "EI" as const,
    sourceFactor: "extraversion" as const,
    negativePole: "I" as const,
    positivePole: "E" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.EI,
  }),
  Object.freeze({
    kind: "factor" as const,
    axis: "SN" as const,
    sourceFactor: "intellect" as const,
    negativePole: "S" as const,
    positivePole: "N" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.SN,
  }),
  Object.freeze({
    kind: "factor" as const,
    axis: "TF" as const,
    sourceFactor: "agreeableness" as const,
    negativePole: "T" as const,
    positivePole: "F" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.TF,
  }),
  Object.freeze({
    kind: "factor" as const,
    axis: "JP" as const,
    sourceFactor: "conscientiousness" as const,
    negativePole: "J" as const,
    positivePole: "P" as const,
    factorDirection: -1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.JP,
  }),
  Object.freeze({
    kind: "factor" as const,
    axis: "AT" as const,
    sourceFactor: "emotionalStability" as const,
    negativePole: "T" as const,
    positivePole: "A" as const,
    factorDirection: 1 as const,
    correlationBasis: AXIS_CORRELATION_BASIS.AT,
  }),
  Object.freeze({
    kind: "aspectContrast" as const,
    axis: "VW" as const,
    negativePole: "W" as const,
    positivePole: "V" as const,
    correlationBasis: null,
  }),
]);

/** Index of the first modifier axis (AT) within AXIS_CONFIGS/axes — the four base-preference axes come before it. */
const BASE_AXIS_COUNT = 4;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function standardizedScore(score: FactorScore): number {
  const z = score.norm?.zScore ?? (score.scalePosition0to100 - 50) / 25;
  if (!Number.isFinite(z)) throw new JungianInputError(`non-finite z score for ${score.factor}`);
  return z;
}

function standardizedAspectScore(score: AspectScore): number {
  const z = score.norm?.zScore ?? (score.rawSum - 15) / 5;
  if (!Number.isFinite(z)) throw new JungianInputError(`non-finite z score for aspect ${score.aspect}`);
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

function aspectMap(scores: readonly AspectScore[]): ReadonlyMap<EmotionalAspect, AspectScore> {
  const map = new Map<EmotionalAspect, AspectScore>();
  for (const score of scores) {
    if (map.has(score.aspect)) throw new JungianInputError(`duplicate aspect score: ${score.aspect}`);
    map.set(score.aspect, score);
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

/**
 * Propagates measurement error for the VW contrast (z(withdrawal) − z(volatility)) / contrastSd.
 * Each aspect's SEM is converted to z-units (sem / own SD) and combined assuming independent
 * measurement error — the same simplifying assumption single-factor propagation already makes,
 * generalized to two sources. The correlation between the two aspects (contrastSd) already
 * accounts for their shared true-score variance; it is not re-applied here.
 */
function propagatedAspectInterval(
  withdrawal: AspectScore,
  volatility: AspectScore,
  contrastSd: number,
  continuous: number,
): readonly [number, number] {
  const sdWithdrawal = withdrawal.norm?.standardDeviation ?? 0;
  const sdVolatility = volatility.norm?.standardDeviation ?? 0;
  if (
    !Number.isFinite(sdWithdrawal) || sdWithdrawal <= 0 ||
    !Number.isFinite(sdVolatility) || sdVolatility <= 0 ||
    !Number.isFinite(contrastSd) || contrastSd <= 0 ||
    withdrawal.reliability.sem <= 0 || volatility.reliability.sem <= 0
  ) {
    return Object.freeze([continuous, continuous] as [number, number]);
  }

  const semZWithdrawal = withdrawal.reliability.sem / sdWithdrawal;
  const semZVolatility = volatility.reliability.sem / sdVolatility;
  const semZDiff = Math.sqrt(semZWithdrawal ** 2 + semZVolatility ** 2) / contrastSd;
  const halfWidth = 1.96 * semZDiff * CONTINUOUS_SCALE_PER_Z;
  return Object.freeze([
    clamp(continuous - halfWidth, -100, 100),
    clamp(continuous + halfWidth, -100, 100),
  ] as [number, number]);
}

function freezeAxis(axis: AxisScore): AxisScore {
  return Object.freeze({
    ...axis,
    ci95: Object.freeze([...axis.ci95] as [number, number]),
  });
}

function buildFactorAxis(config: FactorAxisConfig, byFactor: ReadonlyMap<BigFiveFactor, FactorScore>): AxisScore {
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
}

function buildAspectContrastAxis(
  config: AspectContrastAxisConfig,
  byAspect: ReadonlyMap<EmotionalAspect, AspectScore>,
): AxisScore {
  const withdrawal = byAspect.get("withdrawal");
  const volatility = byAspect.get("volatility");
  if (!withdrawal || !volatility) throw new JungianInputError("missing aspect score: withdrawal/volatility");

  const contrastSd = aspectContrastStandardDeviation();
  const zWithdrawal = standardizedAspectScore(withdrawal);
  const zVolatility = standardizedAspectScore(volatility);
  const zScore = contrastSd > 0 ? (zWithdrawal - zVolatility) / contrastSd : 0;
  const continuous = clamp(zScore * CONTINUOUS_SCALE_PER_Z, -100, 100);
  const isBoundary = Math.abs(zScore) < BOUNDARY_Z;
  const preliminary: AxisScore = {
    axis: config.axis,
    sourceFactor: null,
    continuous,
    ci95: propagatedAspectInterval(withdrawal, volatility, contrastSd, continuous),
    pole: null,
    isBoundary,
    correlationBasis: null,
    zScore,
  };
  return freezeAxis({ ...preliminary, pole: axisLetter(preliminary, config) });
}

/**
 * Re-expresses the already-computed Big Five factors (and the emotionalStability aspect split)
 * on six familiar letter axes. No new items, random state, clock, or categorical measurement is
 * used — AT reuses the emotionalStability factor score directly, VW reuses its aspect scores.
 */
export function computeJungianLenses(
  scores: readonly FactorScore[],
  aspectScores: readonly AspectScore[],
): JungianLensResult {
  const byFactor = scoreMap(scores);
  const byAspect = aspectMap(aspectScores);
  const axes = AXIS_CONFIGS.map((config) =>
    config.kind === "factor" ? buildFactorAxis(config, byFactor) : buildAspectContrastAxis(config, byAspect),
  );

  const typeCode = axes.length === AXIS_CONFIGS.length
    ? `${axes.slice(0, BASE_AXIS_COUNT).map((axis) => axis.pole ?? "?").join("")}` +
      `-${axes.slice(BASE_AXIS_COUNT).map((axis) => axis.pole ?? "?").join("")}`
    : null;
  const minimumDistance = Math.min(...axes.map((axis) => Math.abs(axis.zScore)));
  const typeCertainty = Number.isFinite(minimumDistance)
    ? clamp((minimumDistance - BOUNDARY_Z) / (2 - BOUNDARY_Z), 0, 1)
    : 0;

  return Object.freeze({
    engine: "psychometrics" as const,
    tier: "scientific" as const,
    version: 2 as const,
    axes: Object.freeze(axes),
    typeCode,
    typeCertainty,
  });
}

/**
 * A deliberately provisional preview for the survey progress strip. It uses
 * answered items only, treats unanswered items as neutral, and never produces
 * a type code or a result. The final result always comes from computeJungianLenses.
 */
export function previewJungianAxes(
  responses: Partial<Record<number, LikertResponse>>,
): readonly AxisPreview[] {
  function meanOf(ids: readonly number[]): { readonly mean: number; readonly ratio: number } {
    const items = ids.map((id) => itemAt(id));
    const answered = items.filter((item) => responses[item.id] !== undefined);
    const mean = answered.length === 0
      ? 3
      : answered.reduce((sum, item) => sum + scoreItem(item, responses[item.id]!), 0) / answered.length;
    return { mean, ratio: answered.length / items.length };
  }

  return Object.freeze(
    AXIS_CONFIGS.map((config) => {
      if (config.kind === "factor") {
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
      }

      const withdrawal = meanOf(itemIdsOfAspect("withdrawal"));
      const volatility = meanOf(itemIdsOfAspect("volatility"));
      const continuous = clamp((withdrawal.mean - volatility.mean) * 50, -100, 100);
      return Object.freeze({
        axis: config.axis,
        continuous,
        answeredFactorRatio: (withdrawal.ratio + volatility.ratio) / 2,
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

/** The four base-preference axes (EI/SN/TF/JP) — the part of the type code before the dash. */
export const JUNGIAN_BASE_AXES: readonly JungianAxis[] = Object.freeze(JUNGIAN_AXES.slice(0, BASE_AXIS_COUNT));

/** The two modifier axes (AT/VW) — the part of the type code after the dash. */
export const JUNGIAN_MODIFIER_AXES: readonly JungianAxis[] = Object.freeze(JUNGIAN_AXES.slice(BASE_AXIS_COUNT));

/** Stable guard against accidental item-set drift in the preview implementation. */
export const JUNGIAN_ITEM_COUNT = ITEMS.length;
