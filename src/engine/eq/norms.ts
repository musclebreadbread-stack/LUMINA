import { ITEM_COUNT_BY_FACTOR, TOTAL_ITEM_COUNT, type EqFactor } from "./items";

/**
 * SSEIT 규준.
 *
 * 다크 트라이어드와 달리 원자료 CSV가 없어 실측 백분위표를 만들 수 없다. 그래서 출판된 요약통계
 * (평균·SD·α)를 이 파일에 인라인으로 두고, 백분위는 **정규근사**로 계산한다.
 * 여기서 나오는 percentile은 정규분포를 가정한 모델 기반 추정치이지
 * 실측 분포에서 읽어낸 값이 아니다 — 이 사실은 NORM_SOURCE.method 에도 그대로 노출한다.
 *
 * 총점 규준: Schutte et al.(1998) 검증 표본 N = 346, M = 124.78, SD = 13.00, Cronbach α = .90.
 *
 * 하위요인 규준: 문헌에서 하위요인의 평균·SD가 일관되게 보고되지 않는다.
 * 확인 가능한 출처가 없는 수치를 지어내지 않기 위해 4개 하위요인 모두 norm = null 을 반환하고,
 * UI는 원점수와 척도 위치(scalePosition0to100)로 대체 표시한다.
 */

export interface NormScore {
  readonly zScore: number;
  readonly tScore: number;
  readonly percentile: number;
  /** 출판 표본은 하나뿐이라 항상 "all"이다. 다크 트라이어드/빅파이브와 같은 리터럴을 써서 뷰가 공유된다. */
  readonly normGroup: "all";
  readonly sampleSize: number;
  /** 선택된 규준의 SD. SEM 계산이 백분위와 같은 표를 쓰도록 함께 실어 보낸다. */
  readonly standardDeviation: number;
}

export type NormGender = "male" | "female" | "unspecified";

export interface NormContext {
  /** 만 나이. 성인 표본 규준이 적용 가능한지 판단하는 데만 쓴다. */
  readonly age?: number;
  /**
   * 성별. 성별 층화 규준을 재현 가능한 형태로 확보하지 못해 규준 선택에는 사용하지 않는다.
   * 다른 척도와 호출부 시그니처를 맞추기 위해 남겨 둔 필드다.
   */
  readonly gender?: NormGender;
}

export interface PublishedNorm {
  readonly mean: number;
  readonly sd: number;
  readonly sampleSize: number;
}

export interface Reliability {
  readonly alpha: number;
  readonly sem: number;
  readonly ci95: readonly [number, number];
}

/** Schutte et al.(1998) Study 1 검증 표본(N = 346)의 총점 요약통계. */
export const TOTAL_NORM: PublishedNorm = Object.freeze({
  mean: 124.78,
  sd: 13.0,
  sampleSize: 346,
});

/** Schutte et al.(1998)이 보고한 총점 내부일관성. SEM = SD × √(1 − α) 에 그대로 쓴다. */
export const PUBLISHED_TOTAL_ALPHA = 0.9;

/**
 * 하위요인 규준. 전부 null 이다 — 재현 가능한 출판 평균·SD를 확보하지 못했다.
 * 없는 규준을 지어내는 대신 null을 돌려주고 상위 레이어가 원점수 표시로 넘어가게 한다.
 */
export const SUBSCALE_NORMS: Readonly<Record<EqFactor, PublishedNorm | null>> = Object.freeze({
  perceptionOfEmotion: null,
  managingOwnEmotions: null,
  managingOthersEmotions: null,
  utilisationOfEmotion: null,
});

/**
 * 하위요인 α. 0은 "출판된 값 없음"을 뜻하는 표식이다.
 * 하위요인은 규준 SD도 없어 SEM이 어차피 0이 되므로, 0을 넣어도 신뢰구간이 왜곡되지 않는다.
 * 훗날 검증된 하위요인 α와 SD가 확보되면 이 표만 채우면 SEM 공식이 그대로 작동한다.
 */
export const PUBLISHED_SUBSCALE_ALPHAS: Readonly<Record<EqFactor, number>> = Object.freeze({
  perceptionOfEmotion: 0,
  managingOwnEmotions: 0,
  managingOthersEmotions: 0,
  utilisationOfEmotion: 0,
});

/**
 * 규준 출처. method 문자열은 "실측 백분위표가 아니라 요약통계 정규근사"라는 사실을
 * 코드 주석뿐 아니라 데이터로도 밖에 드러내기 위한 것이다 — 화면 문구는 messages/*.json이 담당한다.
 */
export const NORM_SOURCE = Object.freeze({
  name: "Schutte et al. (1998) SSEIT validation sample",
  version: "1998-study-1",
  url: "https://doi.org/10.1016/S0191-8869(98)00001-4",
  method:
    "Normal approximation from published summary statistics (M = 124.78, SD = 13.00, N = 346). Percentiles are model-based estimates, NOT an empirical percentile table.",
  licenseNote:
    "The 33 SSEIT items are printed in full in the source article; Korean wording is our own unvalidated translation.",
  sampleSize: TOTAL_NORM.sampleSize,
});

/**
 * 출판 표본은 성인(평균 연령 약 29세) 기준이다. Ciarrochi et al.(2001)이 청소년용으로 따로 검증했다는 것은
 * 성인 규준을 청소년에게 그대로 붙이면 안 된다는 뜻이므로, 17세 미만에는 규준을 적용하지 않는다.
 */
export const NORM_MIN_AGE = 17;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** 표준정규 CDF 근사 — Abramowitz & Stegun 7.1.26. 순수 함수라 공유 링크가 몇 달 뒤에도 같은 값을 낸다. */
function standardNormalCdf(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1 + sign * y);
}

/** 규준 표본이 적용 가능한 응답자인지 확인한다. 나이를 주지 않으면 성인으로 간주한다. */
function appliesTo(context: NormContext | undefined): boolean {
  const age = context?.age;
  if (age === undefined) return true;
  return Number.isFinite(age) && age >= NORM_MIN_AGE;
}

function normScoreFromSummary(
  rawSum: number,
  summary: PublishedNorm | null,
  context: NormContext | undefined,
): NormScore | null {
  if (summary === null || !appliesTo(context)) return null;
  const zScore = (rawSum - summary.mean) / summary.sd;
  return Object.freeze({
    zScore,
    tScore: 50 + 10 * zScore,
    percentile: clamp(Math.round(standardNormalCdf(zScore) * 100), 1, 99),
    normGroup: "all" as const,
    sampleSize: summary.sampleSize,
    standardDeviation: summary.sd,
  });
}

/** 하위요인 규준. 현재는 출판된 하위요인 평균·SD가 없어 항상 null이다. */
export function normScoreFor(
  factor: EqFactor,
  rawSum: number,
  context?: NormContext,
): NormScore | null {
  return normScoreFromSummary(rawSum, SUBSCALE_NORMS[factor], context);
}

/** 총점 규준. SSEIT에서 1차 지표는 총점이므로 규준이 붙는 곳도 여기뿐이다. */
export function totalNormScoreFor(rawSum: number, context?: NormContext): NormScore | null {
  return normScoreFromSummary(rawSum, TOTAL_NORM, context);
}

function reliabilityFrom(
  alpha: number,
  rawSum: number,
  norm: NormScore | null,
  minimum: number,
  maximum: number,
): Reliability {
  const standardDeviation = norm?.standardDeviation ?? 0;
  const sem = standardDeviation * Math.sqrt(1 - alpha);
  const margin = 1.96 * sem;
  return Object.freeze({
    alpha,
    sem,
    ci95: Object.freeze([
      Math.max(minimum, rawSum - margin),
      Math.min(maximum, rawSum + margin),
    ] as [number, number]),
  });
}

export function reliabilityFor(
  factor: EqFactor,
  rawSum: number,
  norm: NormScore | null,
): Reliability {
  const itemCount = ITEM_COUNT_BY_FACTOR[factor];
  return reliabilityFrom(
    PUBLISHED_SUBSCALE_ALPHAS[factor],
    rawSum,
    norm,
    itemCount,
    itemCount * 5,
  );
}

export function reliabilityForTotal(rawSum: number, norm: NormScore | null): Reliability {
  return reliabilityFrom(
    PUBLISHED_TOTAL_ALPHA,
    rawSum,
    norm,
    TOTAL_ITEM_COUNT,
    TOTAL_ITEM_COUNT * 5,
  );
}
