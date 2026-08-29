import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";

type Factor = "extraversion" | "agreeableness" | "conscientiousness" | "emotionalStability" | "intellect";
type GroupGender = "male" | "female";
type AgeBand = "18-24" | "25-34" | "35-44" | "45-54" | "55+";

/**
 * DeYoung, Quilty & Peterson (2007) 국면(aspect) 분해. IPIP-50에는 국면 전용 문항이 없으므로
 * emotionalStability의 기존 10문항을 두 5문항 하위집합으로 재편성한다 — 새 문항은 추가하지 않는다.
 * withdrawal = 불안·낮은 기분(침잠), volatility = 성마름·기분 변화(표출).
 */
type Aspect = "withdrawal" | "volatility";
const ASPECTS: readonly Aspect[] = ["withdrawal", "volatility"];

const FACTORS: readonly Factor[] = [
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "emotionalStability",
  "intellect",
];

/** Official IPIP broad-domain alpha values used as a reproducibility check. */
const PUBLISHED_ALPHAS: Readonly<Record<Factor, number>> = Object.freeze({
  extraversion: 0.87,
  agreeableness: 0.82,
  conscientiousness: 0.79,
  emotionalStability: 0.86,
  intellect: 0.84,
});
const ALPHA_TOLERANCE = 0.05;

const COLUMNS: Readonly<Record<Factor, readonly string[]>> = Object.freeze({
  extraversion: ["EXT1", "EXT3", "EXT5", "EXT7", "EXT9", "EXT2", "EXT4", "EXT6", "EXT8", "EXT10"],
  emotionalStability: ["EST2", "EST4", "EST1", "EST3", "EST5", "EST6", "EST7", "EST8", "EST9", "EST10"],
  agreeableness: ["AGR2", "AGR4", "AGR6", "AGR8", "AGR9", "AGR10", "AGR1", "AGR3", "AGR5", "AGR7"],
  conscientiousness: ["CSN1", "CSN3", "CSN5", "CSN7", "CSN9", "CSN10", "CSN2", "CSN4", "CSN6", "CSN8"],
  intellect: ["OPN1", "OPN3", "OPN5", "OPN7", "OPN8", "OPN9", "OPN10", "OPN2", "OPN4", "OPN6"],
});

const ASPECT_ITEM_COUNT = 5;

/**
 * COLUMNS.emotionalStability(10칸) 안에서 각 국면이 차지하는 색인.
 * withdrawal = [EST2, EST4, EST1, EST3, EST10] (relaxed/blue/stressed/worry/oftenBlue),
 * volatility = [EST5, EST6, EST7, EST8, EST9] (disturbed/upset/moodALot/moodSwings/irritated).
 * src/engine/psychometrics/items.ts의 id 31..40 순서와 정확히 같은 분할이다 — 여기서 색인을
 * 바꾸면 엔진의 aspects.ts도 함께 바꿔야 한다.
 */
const ASPECT_COLUMN_INDICES: Readonly<Record<Aspect, readonly number[]>> = Object.freeze({
  withdrawal: Object.freeze([0, 1, 2, 3, 9]),
  volatility: Object.freeze([4, 5, 6, 7, 8]),
});

/** emotionalStability 열 내에서 정방향(plus) 채점인 색인 수 — COLUMNS 순서의 앞 2개(EST2, EST4). */
const EMOTIONAL_STABILITY_POSITIVE_COUNT = 2;

const SOURCE = {
  name: "Open Source Psychometrics Project IPIP Big Five Factor Markers",
  version: "8 November 2018",
  url: "https://openpsychometrics.org/_rawdata/IPIP-FFM-data-8Nov2018.zip",
  licenseNote: "Only aggregate statistics are retained; respondent-level data is not committed.",
} as const;

interface FactorAccumulator {
  readonly rawSums: number[];
  readonly itemSums: number[];
  readonly itemSquares: number[];
  totalSum: number;
  totalSquare: number;
}

interface FactorNorm {
  readonly mean: number;
  readonly sd: number;
  readonly percentileTable: readonly { readonly percentile: number; readonly rawSum: number }[];
  readonly alpha: number;
  readonly publishedAlpha: number;
  readonly alphaDifference: number;
  readonly alphaWithinTolerance: boolean;
  readonly itemCount: 10;
}

/** 국면(aspect) 규준 — 요인 규준과 같은 모양이지만 문항 5개짜리라 출판 α 대조값이 없다. */
interface AspectNorm {
  readonly mean: number;
  readonly sd: number;
  readonly percentileTable: readonly { readonly percentile: number; readonly rawSum: number }[];
  readonly alpha: number;
  readonly itemCount: 5;
}

/** 두 변수의 합·제곱합·곱합을 스트리밍으로 누적해 표본 상관계수를 낸다. */
interface PairAccumulator {
  sumX: number;
  sumY: number;
  sumXX: number;
  sumYY: number;
  sumXY: number;
  n: number;
}

function makePairAccumulator(): PairAccumulator {
  return { sumX: 0, sumY: 0, sumXX: 0, sumYY: 0, sumXY: 0, n: 0 };
}

function addPair(pair: PairAccumulator, x: number, y: number): void {
  pair.sumX += x;
  pair.sumY += y;
  pair.sumXX += x * x;
  pair.sumYY += y * y;
  pair.sumXY += x * y;
  pair.n += 1;
}

function pairCorrelation(pair: PairAccumulator): number {
  const n = pair.n;
  const covariance = pair.sumXY - (pair.sumX * pair.sumY) / n;
  const varianceX = pair.sumXX - (pair.sumX * pair.sumX) / n;
  const varianceY = pair.sumYY - (pair.sumY * pair.sumY) / n;
  const denominator = Math.sqrt(varianceX * varianceY);
  if (denominator === 0) return 0;
  return covariance / denominator;
}

/**
 * VW 축(정서표현: 표출 vs 침잠) 공개 게이트 — 새로 만드는 국면 대비이므로 공개 전 통과해야
 * 하는 세 조건을 빌드 타임에 공개 원자료로 계산한다 (LUMINA MBTI 64유형 전환 계획 1절).
 *
 * 1) 국면별 신뢰도(Cronbach's α) ≥ ALPHA_THRESHOLD
 * 2) 대비(withdrawal − volatility raw sum)와 emotionalStability 총점의 |상관| < CORRELATION_THRESHOLD
 *    — AT(정체성) 축과 VW(정서표현) 축이 같은 정보를 두 번 보여주지 않는지 확인한다.
 * 3) 문항 판별 타당도 — emotionalStability 10문항 각각이 자기 국면의 나머지 4문항과
 *    상대 국면 5문항보다 더 강하게 상관되는지. 이 저장소에는 요인분석(EFA/CFA) 구현체가
 *    없으므로 전체 요인구조 검증의 대체가 아니라 문항 수준 판별 타당도 확인으로 범위를 좁힌다.
 */
interface ItemDiscriminantResult {
  readonly column: string;
  readonly aspect: Aspect;
  readonly ownAspectCorrelation: number;
  readonly otherAspectCorrelation: number;
  readonly discriminates: boolean;
}

interface AspectGate {
  readonly alphaThreshold: number;
  readonly correlationThreshold: number;
  readonly aspectAlphas: Readonly<Record<Aspect, number>>;
  readonly aspectAlphaPasses: Readonly<Record<Aspect, boolean>>;
  readonly contrastVsEmotionalStabilityCorrelation: number;
  readonly correlationPasses: boolean;
  readonly itemDiscriminant: readonly ItemDiscriminantResult[];
  readonly itemDiscriminantAllPass: boolean;
  readonly interAspectCorrelation: number;
  readonly contrastStandardDeviation: number;
  readonly overallPass: boolean;
}

/**
 * VW 축(대비 = z(withdrawal) − z(volatility))의 표준편차. z-score는 정의상 분산 1이므로
 * Var(zW − zV) = 2(1 − r), r = 국면 간 상관. jungian.ts는 이 값으로 대비를 재표준화해
 * BOUNDARY_Z 임계값을 다른 5축과 같은 눈금으로 비교한다 — 그렇지 않으면 두 국면이 서로
 * 독립이 아닌 한(실측 r ≈ -0.5 안팎, 신경증 국면은 흔히 상관됨) 이 축만 경계 판정이 조용히
 * 관대해지거나 엄격해진다.
 */
interface AspectContrastNorm {
  readonly interAspectCorrelation: number;
  readonly contrastStandardDeviation: number;
}

interface NormsOutput {
  readonly version: 1;
  readonly source: typeof SOURCE;
  readonly sampleSize: number;
  readonly factors: Readonly<Record<Factor, FactorNorm>>;
  readonly aspects?: Readonly<Record<Aspect, AspectNorm>>;
  readonly aspectContrast?: AspectContrastNorm;
  readonly groups?: Readonly<Record<string, {
    readonly sampleSize: number;
    readonly factors: Readonly<Record<Factor, FactorNorm>>;
  }>>;
}

interface MetaOutput {
  readonly version: 2;
  readonly source: typeof SOURCE;
  readonly inputRows: number;
  readonly includedRows: number;
  readonly excludedRows: number;
  readonly filters: readonly string[];
  readonly alphaComparison: Readonly<Record<Factor, {
    readonly computed: number;
    readonly published: number;
    readonly difference: number;
    readonly withinTolerance: boolean;
  }>>;
  readonly stratification: {
    readonly ageColumn: string | null;
    readonly genderColumn: string | null;
    readonly available: boolean;
    readonly groupCount: number;
    readonly note: string;
  };
  readonly aspectGate?: AspectGate;
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function makeAccumulator(itemCount = 10): FactorAccumulator {
  return {
    rawSums: [],
    itemSums: Array.from({ length: itemCount }, () => 0),
    itemSquares: Array.from({ length: itemCount }, () => 0),
    totalSum: 0,
    totalSquare: 0,
  };
}

function makeAccumulators(): Record<Factor, FactorAccumulator> {
  return Object.fromEntries(FACTORS.map((factor) => [factor, makeAccumulator()])) as Record<Factor, FactorAccumulator>;
}

function makeAspectAccumulators(): Record<Aspect, FactorAccumulator> {
  return Object.fromEntries(ASPECTS.map((aspect) => [aspect, makeAccumulator(ASPECT_ITEM_COUNT)])) as Record<
    Aspect,
    FactorAccumulator
  >;
}

/** emotionalStability 10문항 각각의 판별 타당도 누적기 — 자기 국면 나머지 합, 상대 국면 합과의 상관용. */
function makeItemDiscriminantAccumulators(): Record<number, { readonly vsOwnRest: PairAccumulator; readonly vsOtherAspect: PairAccumulator }> {
  const result: Record<number, { readonly vsOwnRest: PairAccumulator; readonly vsOtherAspect: PairAccumulator }> = {};
  for (let index = 0; index < 10; index += 1) {
    result[index] = { vsOwnRest: makePairAccumulator(), vsOtherAspect: makePairAccumulator() };
  }
  return result;
}

function ageBand(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 18) return null;
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}

function normalizeGender(raw: string): GroupGender | null {
  const value = raw.trim().toLowerCase();
  if (["male", "m", "man", "1"].includes(value)) return "male";
  if (["female", "f", "woman", "2"].includes(value)) return "female";
  return null;
}

function stratificationKey(
  values: Readonly<Record<string, string>>,
  ageColumn: string | undefined,
  genderColumn: string | undefined,
): string | null {
  if (!ageColumn || !genderColumn) return null;
  const band = ageBand(Number(values[ageColumn]));
  const gender = normalizeGender(values[genderColumn] ?? "");
  return band && gender ? `${band}:${gender}` : null;
}

function sampleVariance(sum: number, squareSum: number, n: number): number {
  if (n < 2) return 0;
  return (squareSum - (sum * sum) / n) / (n - 1);
}

function percentileValue(sorted: readonly number[], percentile: number): number {
  const position = (percentile / 100) * (sorted.length - 1);
  return sorted[Math.round(position)] ?? sorted[sorted.length - 1] ?? 0;
}

function alpha(accumulator: FactorAccumulator, n: number, itemCount = 10): number {
  const itemVariance = accumulator.itemSquares.reduce(
    (sum, squareSum, index) => sum + sampleVariance(accumulator.itemSums[index] ?? 0, squareSum, n),
    0,
  );
  const totalVariance = sampleVariance(accumulator.totalSum, accumulator.totalSquare, n);
  if (totalVariance === 0) return 0;
  return (itemCount / (itemCount - 1)) * (1 - itemVariance / totalVariance);
}

function isQualityRow(
  values: Readonly<Record<string, string>>,
  answerColumns: readonly string[],
  elapsedColumns: readonly string[],
): boolean {
  const answers = answerColumns.map((column) => Number(values[column]));
  if (answers.some((answer) => !Number.isInteger(answer) || answer < 1 || answer > 5)) return false;
  if (answers.every((answer) => answer === answers[0])) return false;

  const ipc = Number(values.IPC);
  if (Number.isFinite(ipc) && ipc !== 1) return false;

  const testElapsed = Number(values.testelapse);
  if (!Number.isFinite(testElapsed) || testElapsed < 20 || testElapsed > 3600) return false;

  return elapsedColumns.every((column) => {
    const elapsed = Number(values[column]);
    return Number.isFinite(elapsed) && elapsed >= 100 && elapsed <= 120000;
  });
}

function rowMap(headers: readonly string[], cells: readonly string[]): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};
  headers.forEach((header, index) => {
    map[header] = cells[index] ?? "";
  });
  return map;
}

function buildNorms(accumulators: Readonly<Record<Factor, FactorAccumulator>>, n: number): NormsOutput {
  const factors = Object.fromEntries(
    FACTORS.map((factor) => {
      const accumulator = accumulators[factor];
      const sorted = [...accumulator.rawSums].sort((left, right) => left - right);
      const mean = accumulator.totalSum / n;
      const sd = Math.sqrt(sampleVariance(accumulator.totalSum, accumulator.totalSquare, n));
      const percentileTable = Array.from({ length: 99 }, (_, index) => {
        const percentile = index + 1;
        return Object.freeze({ percentile, rawSum: percentileValue(sorted, percentile) });
      });
      const computedAlpha = Number(alpha(accumulator, n).toFixed(6));
      const publishedAlpha = PUBLISHED_ALPHAS[factor];
      const alphaDifference = Number(Math.abs(computedAlpha - publishedAlpha).toFixed(6));
      return [
        factor,
        Object.freeze({
          mean: Number(mean.toFixed(6)),
          sd: Number(sd.toFixed(6)),
          percentileTable: Object.freeze(percentileTable),
          alpha: computedAlpha,
          publishedAlpha,
          alphaDifference,
          alphaWithinTolerance: alphaDifference <= ALPHA_TOLERANCE,
          itemCount: 10 as const,
        }),
      ] as const;
    }),
  ) as Record<Factor, FactorNorm>;

  return {
    version: 1,
    source: SOURCE,
    sampleSize: n,
    factors,
  };
}

function accumulateRow(
  accumulators: Record<Factor, FactorAccumulator>,
  values: Readonly<Record<string, string>>,
): void {
  for (const factor of FACTORS) {
    const accumulator = accumulators[factor];
    const scored = COLUMNS[factor].map((column, index) => {
      const value = Number(values[column]);
      const positiveCount = factor === "extraversion" ? 5 : factor === "agreeableness" || factor === "conscientiousness" ? 6 : factor === "emotionalStability" ? 2 : 7;
      return index < positiveCount ? value : 6 - value;
    });
    const rawSum = scored.reduce((sum, value) => sum + value, 0);
    accumulator.rawSums.push(rawSum);
    accumulator.totalSum += rawSum;
    accumulator.totalSquare += rawSum * rawSum;
    scored.forEach((value, index) => {
      accumulator.itemSums[index] = (accumulator.itemSums[index] ?? 0) + value;
      accumulator.itemSquares[index] = (accumulator.itemSquares[index] ?? 0) + value * value;
    });
  }
}

function buildAspectNorms(accumulators: Readonly<Record<Aspect, FactorAccumulator>>, n: number): Record<Aspect, AspectNorm> {
  return Object.fromEntries(
    ASPECTS.map((aspect) => {
      const accumulator = accumulators[aspect];
      const sorted = [...accumulator.rawSums].sort((left, right) => left - right);
      const mean = accumulator.totalSum / n;
      const sd = Math.sqrt(sampleVariance(accumulator.totalSum, accumulator.totalSquare, n));
      const percentileTable = Array.from({ length: 99 }, (_, index) => {
        const percentile = index + 1;
        return Object.freeze({ percentile, rawSum: percentileValue(sorted, percentile) });
      });
      return [
        aspect,
        Object.freeze({
          mean: Number(mean.toFixed(6)),
          sd: Number(sd.toFixed(6)),
          percentileTable: Object.freeze(percentileTable),
          alpha: Number(alpha(accumulator, n, ASPECT_ITEM_COUNT).toFixed(6)),
          itemCount: 5 as const,
        }),
      ] as const;
    }),
  ) as Record<Aspect, AspectNorm>;
}

/**
 * emotionalStability 10문항에서 국면별 raw sum, 문항-자기국면잔여·문항-상대국면 상관 재료,
 * 대비(withdrawal − volatility) vs emotionalStability 총점 상관 재료를 함께 누적한다.
 * accumulateRow와 별도 함수로 둔 이유는 기존 5요인 누적 로직을 전혀 건드리지 않기 위해서다.
 */
function accumulateAspectRow(
  aspectAccumulators: Record<Aspect, FactorAccumulator>,
  itemDiscriminant: Readonly<Record<number, { readonly vsOwnRest: PairAccumulator; readonly vsOtherAspect: PairAccumulator }>>,
  contrastVsEmotionalStability: PairAccumulator,
  interAspectCorrelation: PairAccumulator,
  values: Readonly<Record<string, string>>,
): void {
  const columns = COLUMNS.emotionalStability;
  const scored = columns.map((column, index) => {
    const value = Number(values[column]);
    return index < EMOTIONAL_STABILITY_POSITIVE_COUNT ? value : 6 - value;
  });

  const aspectSums: Record<Aspect, number> = { withdrawal: 0, volatility: 0 };
  for (const aspect of ASPECTS) {
    const indices = ASPECT_COLUMN_INDICES[aspect];
    const aspectScored = indices.map((index) => scored[index]!);
    const rawSum = aspectScored.reduce((sum, value) => sum + value, 0);
    aspectSums[aspect] = rawSum;

    const accumulator = aspectAccumulators[aspect];
    accumulator.rawSums.push(rawSum);
    accumulator.totalSum += rawSum;
    accumulator.totalSquare += rawSum * rawSum;
    aspectScored.forEach((value, position) => {
      accumulator.itemSums[position] = (accumulator.itemSums[position] ?? 0) + value;
      accumulator.itemSquares[position] = (accumulator.itemSquares[position] ?? 0) + value * value;
    });
  }

  for (const aspect of ASPECTS) {
    const otherAspect: Aspect = aspect === "withdrawal" ? "volatility" : "withdrawal";
    for (const index of ASPECT_COLUMN_INDICES[aspect]) {
      const itemValue = scored[index]!;
      const ownRest = aspectSums[aspect] - itemValue;
      const entry = itemDiscriminant[index]!;
      addPair(entry.vsOwnRest, itemValue, ownRest);
      addPair(entry.vsOtherAspect, itemValue, aspectSums[otherAspect]);
    }
  }

  const contrast = aspectSums.withdrawal - aspectSums.volatility;
  const totalEmotionalStability = aspectSums.withdrawal + aspectSums.volatility;
  addPair(contrastVsEmotionalStability, contrast, totalEmotionalStability);
  addPair(interAspectCorrelation, aspectSums.withdrawal, aspectSums.volatility);
}

const ASPECT_ALPHA_THRESHOLD = 0.7;
const ASPECT_CORRELATION_THRESHOLD = 0.3;

function computeAspectGate(
  aspectAccumulators: Readonly<Record<Aspect, FactorAccumulator>>,
  itemDiscriminant: Readonly<Record<number, { readonly vsOwnRest: PairAccumulator; readonly vsOtherAspect: PairAccumulator }>>,
  contrastVsEmotionalStability: PairAccumulator,
  interAspectCorrelation: PairAccumulator,
  n: number,
): AspectGate {
  const aspectAlphas = Object.fromEntries(
    ASPECTS.map((aspect) => [aspect, Number(alpha(aspectAccumulators[aspect], n, ASPECT_ITEM_COUNT).toFixed(6))]),
  ) as Record<Aspect, number>;
  const aspectAlphaPasses = Object.fromEntries(
    ASPECTS.map((aspect) => [aspect, aspectAlphas[aspect] >= ASPECT_ALPHA_THRESHOLD]),
  ) as Record<Aspect, boolean>;

  const contrastVsEmotionalStabilityCorrelation = Number(pairCorrelation(contrastVsEmotionalStability).toFixed(6));
  const correlationPasses = Math.abs(contrastVsEmotionalStabilityCorrelation) < ASPECT_CORRELATION_THRESHOLD;

  const itemDiscriminantResults: ItemDiscriminantResult[] = ASPECTS.flatMap((aspect) =>
    ASPECT_COLUMN_INDICES[aspect].map((index) => {
      const column = COLUMNS.emotionalStability[index]!;
      const entry = itemDiscriminant[index]!;
      const ownAspectCorrelation = Number(pairCorrelation(entry.vsOwnRest).toFixed(6));
      const otherAspectCorrelation = Number(pairCorrelation(entry.vsOtherAspect).toFixed(6));
      return Object.freeze({
        column,
        aspect,
        ownAspectCorrelation,
        otherAspectCorrelation,
        discriminates: ownAspectCorrelation > otherAspectCorrelation,
      });
    }),
  );
  const itemDiscriminantAllPass = itemDiscriminantResults.every((item) => item.discriminates);
  const interAspectR = Number(pairCorrelation(interAspectCorrelation).toFixed(6));
  const contrastStandardDeviation = Number(Math.sqrt(Math.max(0, 2 * (1 - interAspectR))).toFixed(6));

  return Object.freeze({
    alphaThreshold: ASPECT_ALPHA_THRESHOLD,
    correlationThreshold: ASPECT_CORRELATION_THRESHOLD,
    aspectAlphas: Object.freeze(aspectAlphas),
    aspectAlphaPasses: Object.freeze(aspectAlphaPasses),
    contrastVsEmotionalStabilityCorrelation,
    correlationPasses,
    itemDiscriminant: Object.freeze(itemDiscriminantResults),
    itemDiscriminantAllPass,
    interAspectCorrelation: interAspectR,
    contrastStandardDeviation,
    overallPass:
      aspectAlphaPasses.withdrawal && aspectAlphaPasses.volatility && correlationPasses && itemDiscriminantAllPass,
  });
}

async function main(): Promise<void> {
  const input = argument("--input");
  const normsPath = argument("--out") ?? "src/engine/psychometrics/data/norms.json";
  const metaPath = argument("--meta") ?? "src/engine/psychometrics/data/norms.meta.json";
  if (!input) throw new Error("Usage: node --experimental-strip-types scripts/build-norms.ts --input <data-final.csv>");

  const ageColumn = argument("--age-column");
  const genderColumn = argument("--gender-column");
  if ((ageColumn && !genderColumn) || (!ageColumn && genderColumn)) {
    throw new Error("--age-column and --gender-column must be provided together");
  }

  const answerColumns = FACTORS.flatMap((factor) => [...COLUMNS[factor]]);
  const elapsedColumns = answerColumns.map((column) => `${column}_E`);
  const accumulators = makeAccumulators();
  const aspectAccumulators = makeAspectAccumulators();
  const itemDiscriminant = makeItemDiscriminantAccumulators();
  const contrastVsEmotionalStability = makePairAccumulator();
  const interAspectCorrelation = makePairAccumulator();
  const groupedAccumulators = new Map<string, { readonly accumulators: Record<Factor, FactorAccumulator>; sampleSize: number }>();
  const duplicatePatterns = new Set<string>();
  let inputRows = 0;
  let includedRows = 0;
  let excludedRows = 0;
  let headers: readonly string[] | null = null;

  const stream = createInterface({ input: createReadStream(resolve(input)), crlfDelay: Infinity });
  for await (const line of stream) {
    if (!line.trim()) continue;
    const cells = line.split("\t");
    if (!headers) {
      headers = cells;
      continue;
    }
    inputRows += 1;
    const values = rowMap(headers, cells);
    const answerPattern = FACTORS.flatMap((factor) => COLUMNS[factor].map((column) => values[column] ?? "")).join("|");
    if (!isQualityRow(values, answerColumns, elapsedColumns) || duplicatePatterns.has(answerPattern)) {
      excludedRows += 1;
      continue;
    }
    duplicatePatterns.add(answerPattern);
    includedRows += 1;

    accumulateRow(accumulators, values);
    accumulateAspectRow(aspectAccumulators, itemDiscriminant, contrastVsEmotionalStability, interAspectCorrelation, values);

    const key = stratificationKey(values, ageColumn, genderColumn);
    if (key) {
      const group = groupedAccumulators.get(key) ?? { accumulators: makeAccumulators(), sampleSize: 0 };
      accumulateRow(group.accumulators, values);
      group.sampleSize += 1;
      groupedAccumulators.set(key, group);
    }
  }

  if (includedRows < 2) throw new Error(`quality filters left only ${includedRows} rows`);
  const norms = buildNorms(accumulators, includedRows);
  const groups = Object.fromEntries(
    [...groupedAccumulators.entries()]
      .filter(([, group]) => group.sampleSize >= 2)
      .map(([key, group]) => [key, Object.freeze(buildNorms(group.accumulators, group.sampleSize).factors)]),
  ) as Record<string, Readonly<Record<Factor, FactorNorm>>>;
  if (Object.keys(groups).length > 0) {
    (norms as { groups?: Readonly<Record<string, { readonly sampleSize: number; readonly factors: Readonly<Record<Factor, FactorNorm>> }>> }).groups = Object.freeze(
      Object.fromEntries(
        Object.entries(groups).map(([key, factors]) => [
          key,
          Object.freeze({
            sampleSize: groupedAccumulators.get(key)?.sampleSize ?? 0,
            factors,
          }),
        ]),
      ),
    );
  }
  const aspectNorms = buildAspectNorms(aspectAccumulators, includedRows);
  (norms as { aspects?: Readonly<Record<Aspect, AspectNorm>> }).aspects = Object.freeze(aspectNorms);
  const aspectGate = computeAspectGate(
    aspectAccumulators,
    itemDiscriminant,
    contrastVsEmotionalStability,
    interAspectCorrelation,
    includedRows,
  );
  (norms as { aspectContrast?: AspectContrastNorm }).aspectContrast = Object.freeze({
    interAspectCorrelation: aspectGate.interAspectCorrelation,
    contrastStandardDeviation: aspectGate.contrastStandardDeviation,
  });

  const alphaComparison = Object.fromEntries(
    FACTORS.map((factor) => {
      const norm = norms.factors[factor];
      if (!norm.alphaWithinTolerance) {
        throw new Error(
          `${factor} alpha differs from published value by ${norm.alphaDifference}; ` +
            `tolerance is ${ALPHA_TOLERANCE}`,
        );
      }
      return [
        factor,
        Object.freeze({
          computed: norm.alpha,
          published: norm.publishedAlpha,
          difference: norm.alphaDifference,
          withinTolerance: norm.alphaWithinTolerance,
        }),
      ] as const;
    }),
  ) as Record<Factor, {
    computed: number;
    published: number;
    difference: number;
    withinTolerance: boolean;
  }>;
  const meta: MetaOutput = {
    version: 2,
    source: SOURCE,
    inputRows,
    includedRows,
    excludedRows,
    filters: [
      "all 50 responses must be integer values from 1 through 5",
      "exclude repeated exact response patterns",
      "exclude shared-IP records when IPC is present and not equal to 1",
      "test completion time must be 20–3600 seconds",
      "each item response time must be 100–120000 milliseconds",
      "exclude straight-line responses with one repeated answer",
    ],
    alphaComparison: Object.freeze(alphaComparison),
    stratification: Object.freeze({
      ageColumn: ageColumn ?? null,
      genderColumn: genderColumn ?? null,
      available: Object.keys(groups).length > 0,
      groupCount: Object.keys(groups).length,
      note: ageColumn && genderColumn
        ? "Age-by-gender groups are emitted only when both columns contain valid values and each group has at least two quality-filtered respondents."
        : "The source file did not provide age and gender columns; only aggregate norms were emitted.",
    }),
    aspectGate,
  };

  mkdirSync(dirname(resolve(normsPath)), { recursive: true });
  mkdirSync(dirname(resolve(metaPath)), { recursive: true });
  writeFileSync(resolve(normsPath), `${JSON.stringify(norms, null, 2)}\n`, "utf8");
  writeFileSync(resolve(metaPath), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  process.stdout.write(`Built norms from ${includedRows} of ${inputRows} rows.\n`);
  process.stdout.write(
    `Aspect gate (VW axis): withdrawal α=${aspectGate.aspectAlphas.withdrawal} volatility α=${aspectGate.aspectAlphas.volatility} ` +
      `contrastVsEmotionalStability r=${aspectGate.contrastVsEmotionalStabilityCorrelation} ` +
      `interAspectCorrelation r=${aspectGate.interAspectCorrelation} contrastSd=${aspectGate.contrastStandardDeviation} ` +
      `itemDiscriminantAllPass=${aspectGate.itemDiscriminantAllPass} overallPass=${aspectGate.overallPass}\n`,
  );
}

void main();
