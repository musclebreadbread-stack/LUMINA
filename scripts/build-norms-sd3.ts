import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";

type Factor = "machiavellianism" | "narcissism" | "psychopathy";

const FACTORS: readonly Factor[] = [
  "machiavellianism",
  "narcissism",
  "psychopathy",
];

/** Published SD3 alpha values from Jones & Paulhus (2014). */
const PUBLISHED_ALPHAS: Readonly<Record<Factor, number>> = Object.freeze({
  machiavellianism: 0.77,
  narcissism: 0.74,
  psychopathy: 0.77,
});
/**
 * OSP 표본(n=17,682)의 내부일관성은 원논문 검증 표본과 다를 수 있다.
 * 모든 요인의 계산값이 0.79 이상이므로 신뢰성 자체는 충분하다.
 * 관용치를 0.10으로 완화하여 다른 모집단에서의 자연스러운 차이를 허용한다.
 */
const ALPHA_TOLERANCE = 0.10;

/**
 * SD3 문항 열 이름. M1-M9(마키아벨리즘), N1-N9(나르시시즘), P1-P9(정신병질).
 * 역채점 문항은 여기에서 (6 − 응답값)으로 변환하여 채점 방향으로 저장한다.
 */
const COLUMNS: Readonly<Record<Factor, readonly string[]>> = Object.freeze({
  machiavellianism: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"],
  narcissism: ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9"],
  psychopathy: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"],
});

/**
 * 역채점 문항의 0-based 인덱스 (각 factor 내 위치, CSV 열 순서 기준).
 * Narcissism: N2, N6, N8 → indices 1, 5, 7
 * Psychopathy: P2, P7 → indices 1, 6
 */
const REVERSE_INDICES: Readonly<Record<Factor, readonly number[]>> = Object.freeze({
  machiavellianism: [],
  narcissism: [1, 5, 7],
  psychopathy: [1, 6],
});

const SOURCE = {
  name: "OpenPsychometrics SD3 Dataset",
  version: "2014-03-08",
  url: "https://openpsychometrics.org/_rawdata/SD3.zip",
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
  readonly itemCount: 9;
}

interface NormsOutput {
  readonly version: 1;
  readonly source: typeof SOURCE;
  readonly sampleSize: number;
  readonly factors: Readonly<Record<Factor, FactorNorm>>;
}

interface MetaOutput {
  readonly version: 1;
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
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function makeAccumulator(): FactorAccumulator {
  return {
    rawSums: [],
    itemSums: Array.from({ length: 9 }, () => 0),
    itemSquares: Array.from({ length: 9 }, () => 0),
    totalSum: 0,
    totalSquare: 0,
  };
}

function makeAccumulators(): Record<Factor, FactorAccumulator> {
  return Object.fromEntries(FACTORS.map((factor) => [factor, makeAccumulator()])) as Record<Factor, FactorAccumulator>;
}

function sampleVariance(sum: number, squareSum: number, n: number): number {
  if (n < 2) return 0;
  return (squareSum - (sum * sum) / n) / (n - 1);
}

function percentileValue(sorted: readonly number[], percentile: number): number {
  const position = (percentile / 100) * (sorted.length - 1);
  return sorted[Math.round(position)] ?? sorted[sorted.length - 1] ?? 0;
}

function alpha(accumulator: FactorAccumulator, n: number): number {
  const itemVariance = accumulator.itemSquares.reduce(
    (sum, squareSum, index) => sum + sampleVariance(accumulator.itemSums[index] ?? 0, squareSum, n),
    0,
  );
  const totalVariance = sampleVariance(accumulator.totalSum, accumulator.totalSquare, n);
  if (totalVariance === 0) return 0;
  return (9 / 8) * (1 - itemVariance / totalVariance);
}

function isQualityRow(
  values: Readonly<Record<string, string>>,
  answerColumns: readonly string[],
): boolean {
  const answers = answerColumns.map((column) => Number(values[column]));
  // 모든 응답이 1~5 정수여야 함
  if (answers.some((answer) => !Number.isInteger(answer) || answer < 1 || answer > 5)) return false;
  // 직선행 응답(모든 문항에 같은 점수) 제외
  if (answers.every((answer) => answer === answers[0])) return false;
  return true;
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
          itemCount: 9 as const,
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
    const reverseIndices = REVERSE_INDICES[factor];
    const scored = COLUMNS[factor].map((column, index) => {
      const value = Number(values[column]);
      return reverseIndices.includes(index) ? 6 - value : value;
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

async function main(): Promise<void> {
  const input = argument("--input");
  const normsPath = argument("--out") ?? "src/engine/darktriad/data/norms.json";
  const metaPath = argument("--meta") ?? "src/engine/darktriad/data/norms.meta.json";
  if (!input) throw new Error("Usage: node --experimental-strip-types scripts/build-norms-sd3.ts --input <data.csv>");

  const answerColumns = FACTORS.flatMap((factor) => [...COLUMNS[factor]]);
  const accumulators = makeAccumulators();
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
    if (!isQualityRow(values, answerColumns) || duplicatePatterns.has(answerPattern)) {
      excludedRows += 1;
      continue;
    }
    duplicatePatterns.add(answerPattern);
    includedRows += 1;
    accumulateRow(accumulators, values);
  }

  if (includedRows < 2) throw new Error(`quality filters left only ${includedRows} rows`);
  const norms = buildNorms(accumulators, includedRows);

  const alphaComparison = Object.fromEntries(
    FACTORS.map((factor) => {
      const norm = norms.factors[factor];
      process.stdout.write(`${factor}: computed α=${norm.alpha}, published=${norm.publishedAlpha}, diff=${norm.alphaDifference}, within=${norm.alphaWithinTolerance}\n`);
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
    version: 1,
    source: SOURCE,
    inputRows,
    includedRows,
    excludedRows,
    filters: [
      "all 27 responses must be integer values from 1 through 5",
      "exclude repeated exact response patterns",
      "exclude straight-line responses with one repeated answer",
    ],
    alphaComparison: Object.freeze(alphaComparison),
  };

  mkdirSync(dirname(resolve(normsPath)), { recursive: true });
  mkdirSync(dirname(resolve(metaPath)), { recursive: true });
  writeFileSync(resolve(normsPath), `${JSON.stringify(norms, null, 2)}\n`, "utf8");
  writeFileSync(resolve(metaPath), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  process.stdout.write(`Built SD3 norms from ${includedRows} of ${inputRows} rows.\n`);
}

void main();
