import normsData from "./data/norms.json";
import type { BigFiveFactor } from "./items";

export interface NormScore {
  readonly zScore: number;
  readonly tScore: number;
  readonly percentile: number;
  readonly normGroup: "all" | "age-gender";
  readonly sampleSize: number;
  /** 선택된 규준표의 SD. 연령·성별 규준이 추가되어도 SEM 계산이 같은 표를 사용하게 한다. */
  readonly standardDeviation: number;
}

export type NormGender = "male" | "female" | "unspecified";

export interface NormContext {
  /** 만 나이. 유효한 연령 그룹 규준이 있을 때만 사용한다. */
  readonly age?: number;
  readonly gender?: NormGender;
}

interface NormFactorData {
  readonly mean: number;
  readonly sd: number;
  readonly percentileTable: readonly { readonly percentile: number; readonly rawSum: number }[];
  readonly alpha: number;
  readonly itemCount: 10;
}

/**
 * DeYoung, Quilty & Peterson (2007) 신경증 국면(aspect) 규준. emotionalStability의 기존
 * 10문항을 재편성한 5문항 하위척도라 출판된 대조 α가 없다 — alpha는 공개 IPIP-FFM
 * 원자료(scripts/build-norms.ts)에서 직접 계산한 값을 그대로 쓴다.
 */
export type EmotionalAspect = "withdrawal" | "volatility";

interface AspectNormData {
  readonly mean: number;
  readonly sd: number;
  readonly percentileTable: readonly { readonly percentile: number; readonly rawSum: number }[];
  readonly alpha: number;
  readonly itemCount: 5;
}

/** 두 국면 z점수 대비(withdrawal − volatility)의 실측 표준편차 — VW 축 재표준화에 쓴다. */
interface AspectContrastNormData {
  readonly interAspectCorrelation: number;
  readonly contrastStandardDeviation: number;
}

interface NormData {
  readonly version: 1;
  readonly source: {
    readonly name: string;
    readonly version: string;
    readonly url: string;
    readonly licenseNote: string;
  };
  readonly sampleSize: number;
  readonly factors: Readonly<Record<BigFiveFactor, NormFactorData>>;
  readonly aspects?: Readonly<Record<EmotionalAspect, AspectNormData>>;
  readonly aspectContrast?: AspectContrastNormData;
  /** 원자료에 인구통계 열이 없으면 비어 있다. 임의의 보정값은 넣지 않는다. */
  readonly groups?: Readonly<Record<string, {
    readonly sampleSize: number;
    readonly factors: Readonly<Record<BigFiveFactor, NormFactorData>>;
  }>>;
}

const NORMS = normsData as NormData;

/** Published IPIP-50 broad-domain alpha values from the official IPIP table. */
export const PUBLISHED_ALPHAS: Readonly<Record<BigFiveFactor, number>> = Object.freeze({
  extraversion: 0.87,
  agreeableness: 0.82,
  conscientiousness: 0.79,
  emotionalStability: 0.86,
  intellect: 0.84,
});

export const NORM_SOURCE = Object.freeze({ ...NORMS.source, sampleSize: NORMS.sampleSize });

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function empiricalPercentile(rawSum: number, table: readonly { readonly percentile: number; readonly rawSum: number }[]): number {
  let result = 1;
  for (const row of table) {
    if (rawSum >= row.rawSum) result = row.percentile;
    else break;
  }
  return clamp(result, 1, 99);
}

function ageBand(age: number): string | null {
  if (!Number.isFinite(age) || age < 18) return null;
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}

function groupKey(context: NormContext | undefined): string | null {
  const band = context?.age === undefined ? null : ageBand(context.age);
  const gender = context?.gender;
  if (!band || gender === undefined || gender === "unspecified") return null;
  return `${band}:${gender}`;
}

function selectedNorm(
  factor: BigFiveFactor,
  context: NormContext | undefined,
): { readonly norm: NormFactorData; readonly sampleSize: number; readonly normGroup: NormScore["normGroup"] } | null {
  const key = groupKey(context);
  const group = key ? NORMS.groups?.[key] : undefined;
  const groupNorm = group?.factors[factor];
  if (groupNorm && group.sampleSize >= 2) {
    return { norm: groupNorm, sampleSize: group.sampleSize, normGroup: "age-gender" };
  }
  const aggregate = NORMS.factors[factor];
  if (!aggregate || NORMS.sampleSize < 2) return null;
  return { norm: aggregate, sampleSize: NORMS.sampleSize, normGroup: "all" };
}

export function normScoreFor(
  factor: BigFiveFactor,
  rawSum: number,
  context?: NormContext,
): NormScore | null {
  const selected = selectedNorm(factor, context);
  if (!selected || selected.norm.sd <= 0) return null;
  const norm = selected.norm;
  const zScore = (rawSum - norm.mean) / norm.sd;
  return Object.freeze({
    zScore,
    tScore: 50 + 10 * zScore,
    percentile: empiricalPercentile(rawSum, norm.percentileTable),
    normGroup: selected.normGroup,
    sampleSize: selected.sampleSize,
    standardDeviation: norm.sd,
  });
}

export function reliabilityFor(factor: BigFiveFactor, rawSum: number, norm: NormScore | null) {
  const alpha = PUBLISHED_ALPHAS[factor];
  const standardDeviation = norm?.standardDeviation ?? 0;
  const sem = standardDeviation * Math.sqrt(1 - alpha);
  const margin = 1.96 * sem;
  return Object.freeze({
    alpha,
    sem,
    ci95: Object.freeze([Math.max(10, rawSum - margin), Math.min(50, rawSum + margin)] as [number, number]),
  });
}

export function normDataFor(factor: BigFiveFactor): NormFactorData {
  const norm = NORMS.factors[factor];
  if (!norm) throw new Error(`missing norm data for ${factor}`);
  return norm;
}

/** 국면 규준 z점수. 연령·성별 세분 규준은 아직 없어 항상 normGroup "all"이다. */
export function aspectNormScoreFor(aspect: EmotionalAspect, rawSum: number): NormScore | null {
  const norm = NORMS.aspects?.[aspect];
  if (!norm || norm.sd <= 0 || NORMS.sampleSize < 2) return null;
  const zScore = (rawSum - norm.mean) / norm.sd;
  return Object.freeze({
    zScore,
    tScore: 50 + 10 * zScore,
    percentile: empiricalPercentile(rawSum, norm.percentileTable),
    normGroup: "all" as const,
    sampleSize: NORMS.sampleSize,
    standardDeviation: norm.sd,
  });
}

export function aspectReliabilityFor(aspect: EmotionalAspect, rawSum: number, norm: NormScore | null) {
  const alpha = NORMS.aspects?.[aspect]?.alpha ?? 0;
  const standardDeviation = norm?.standardDeviation ?? 0;
  const sem = standardDeviation * Math.sqrt(1 - alpha);
  const margin = 1.96 * sem;
  return Object.freeze({
    alpha,
    sem,
    ci95: Object.freeze([Math.max(5, rawSum - margin), Math.min(25, rawSum + margin)] as [number, number]),
  });
}

/**
 * VW 축(대비 = z(withdrawal) − z(volatility))을 다른 5축과 같은 눈금으로 비교하기 위한
 * 재표준화 계수. 두 국면은 독립이 아니므로(공개 원자료 실측 r ≈ 0.66) 대비의 표준편차는
 * sqrt(2)가 아니다 — 규준 데이터가 없으면 독립 가정(sqrt(2))으로 안전하게 물러난다.
 */
export function aspectContrastStandardDeviation(): number {
  return NORMS.aspectContrast?.contrastStandardDeviation ?? Math.SQRT2;
}
