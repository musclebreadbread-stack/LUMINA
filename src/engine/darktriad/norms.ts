import normsData from "./data/norms.json";
import type { DarkTriadFactor } from "./items";

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
  readonly itemCount: 9;
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
  readonly factors: Readonly<Record<DarkTriadFactor, NormFactorData>>;
  /** 원자료에 인구통계 열이 없으면 비어 있다. 임의의 보정값은 넣지 않는다. */
  readonly groups?: Readonly<Record<string, {
    readonly sampleSize: number;
    readonly factors: Readonly<Record<DarkTriadFactor, NormFactorData>>;
  }>>;
}

const NORMS = normsData as NormData;

/** Published SD3 alpha values from Jones & Paulhus (2014). */
export const PUBLISHED_ALPHAS: Readonly<Record<DarkTriadFactor, number>> = Object.freeze({
  machiavellianism: 0.77,
  narcissism: 0.74,
  psychopathy: 0.77,
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
  factor: DarkTriadFactor,
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
  factor: DarkTriadFactor,
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

export function reliabilityFor(factor: DarkTriadFactor, rawSum: number, norm: NormScore | null) {
  const alpha = PUBLISHED_ALPHAS[factor];
  const standardDeviation = norm?.standardDeviation ?? 0;
  const sem = standardDeviation * Math.sqrt(1 - alpha);
  const margin = 1.96 * sem;
  return Object.freeze({
    alpha,
    sem,
    ci95: Object.freeze([Math.max(9, rawSum - margin), Math.min(45, rawSum + margin)] as [number, number]),
  });
}

export function normDataFor(factor: DarkTriadFactor): NormFactorData {
  const norm = NORMS.factors[factor];
  if (!norm) throw new Error(`missing norm data for ${factor}`);
  return norm;
}
