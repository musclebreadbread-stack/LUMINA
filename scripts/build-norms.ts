import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";

type Factor = "extraversion" | "agreeableness" | "conscientiousness" | "emotionalStability" | "intellect";
type GroupGender = "male" | "female";
type AgeBand = "18-24" | "25-34" | "35-44" | "45-54" | "55+";

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

interface NormsOutput {
  readonly version: 1;
  readonly source: typeof SOURCE;
  readonly sampleSize: number;
  readonly factors: Readonly<Record<Factor, FactorNorm>>;
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
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function makeAccumulator(): FactorAccumulator {
  return {
    rawSums: [],
    itemSums: Array.from({ length: 10 }, () => 0),
    itemSquares: Array.from({ length: 10 }, () => 0),
    totalSum: 0,
    totalSquare: 0,
  };
}

function makeAccumulators(): Record<Factor, FactorAccumulator> {
  return Object.fromEntries(FACTORS.map((factor) => [factor, makeAccumulator()])) as Record<Factor, FactorAccumulator>;
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

function alpha(accumulator: FactorAccumulator, n: number): number {
  const itemVariance = accumulator.itemSquares.reduce(
    (sum, squareSum, index) => sum + sampleVariance(accumulator.itemSums[index] ?? 0, squareSum, n),
    0,
  );
  const totalVariance = sampleVariance(accumulator.totalSum, accumulator.totalSquare, n);
  if (totalVariance === 0) return 0;
  return (10 / 9) * (1 - itemVariance / totalVariance);
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
  };

  mkdirSync(dirname(resolve(normsPath)), { recursive: true });
  mkdirSync(dirname(resolve(metaPath)), { recursive: true });
  writeFileSync(resolve(normsPath), `${JSON.stringify(norms, null, 2)}\n`, "utf8");
  writeFileSync(resolve(metaPath), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  process.stdout.write(`Built norms from ${includedRows} of ${inputRows} rows.\n`);
}

void main();
