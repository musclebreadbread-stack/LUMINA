/**
 * ECR 규준 생성 스크립트
 *
 * Usage: node --experimental-strip-types scripts/build-norms-ecr.ts
 *
 * raw/ECR/ECR-data-1March2018/data.csv를 읽어
 * src/engine/attachment/norms.json을 생성합니다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RAW_PATH = "raw/ECR/ECR-data-1March2018/data.csv";
const OUTPUT_PATH = "src/engine/attachment/norms.json";

// ECR 문항 매핑 (1-based index)
// Anxiety: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36
// Avoidance: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35
const ANXIETY_ITEMS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
const AVOIDANCE_ITEMS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35];

// 역채점 문항
// Avoidance: 3, 15 (긍정적 표현)
const REVERSE_ITEMS = [3, 15];

function reverseScore(value: number): number {
  return 6 - value; // 1->5, 2->4, 3->3, 4->2, 5->1
}

function calculateCronbachAlpha(items: number[][], n: number): number {
  const k = items.length;
  const itemVariances = items.map(scores => {
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    return variance;
  });

  const totalScores = Array(n).fill(0).map((_, i) =>
    items.reduce((sum, scores) => sum + scores[i]!, 0)
  );
  const totalMean = totalScores.reduce((a, b) => a + b, 0) / n;
  const totalVariance = totalScores.reduce((a, b) => a + Math.pow(b - totalMean, 2), 0) / (n - 1);

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);

  return (k / (k - 1)) * (1 - sumItemVariances / totalVariance);
}

function calculatePercentiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const percentiles: number[] = [];

  for (let i = 0; i < 100; i++) {
    const index = (i / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    const value = sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
    percentiles.push(Math.round(value * 1000) / 1000);
  }

  return percentiles;
}

function main() {
  console.log("Reading ECR data...");

  const csvContent = readFileSync(join(process.cwd(), RAW_PATH), "utf-8");
  const lines = csvContent.trim().split("\n");

  // 첫 줄은 헤더
  const headers = lines[0]!.split(",").map(h => h.trim());
  const q1Index = headers.indexOf("Q1");

  if (q1Index === -1) {
    console.error("Q1 not found in headers");
    process.exit(1);
  }

  console.log(`Processing ${lines.length - 1} respondents...`);

  const anxietyScores: number[] = [];
  const avoidanceScores: number[] = [];
  const anxietyItemScores: number[][] = ANXIETY_ITEMS.map(() => []);
  const avoidanceItemScores: number[][] = AVOIDANCE_ITEMS.map(() => []);

  let validCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(",").map(v => v.trim());

    // 모든 36개 문항이 있는지 확인
    const responses: { [key: number]: number } = {};
    let valid = true;

    for (let j = 1; j <= 36; j++) {
      const value = parseInt(values[q1Index + j - 1]!, 10);
      if (isNaN(value) || value < 1 || value > 5) {
        valid = false;
        break;
      }
      responses[j] = REVERSE_ITEMS.includes(j) ? reverseScore(value) : value;
    }

    if (!valid) continue;

    // Anxiety 점수 계산
    const anxietySum = ANXIETY_ITEMS.reduce((sum, item) => sum + responses[item]!, 0);
    anxietyScores.push(anxietySum / ANXIETY_ITEMS.length);

    ANXIETY_ITEMS.forEach((item, idx) => {
      anxietyItemScores[idx]!.push(responses[item]!);
    });

    // Avoidance 점수 계산
    const avoidanceSum = AVOIDANCE_ITEMS.reduce((sum, item) => sum + responses[item]!, 0);
    avoidanceScores.push(avoidanceSum / AVOIDANCE_ITEMS.length);

    AVOIDANCE_ITEMS.forEach((item, idx) => {
      avoidanceItemScores[idx]!.push(responses[item]!);
    });

    validCount++;
  }

  console.log(`Valid responses: ${validCount}`);

  // 통계 계산
  const anxietyMean = anxietyScores.reduce((a, b) => a + b, 0) / validCount;
  const anxietySD = Math.sqrt(
    anxietyScores.reduce((a, b) => a + Math.pow(b - anxietyMean, 2), 0) / (validCount - 1)
  );

  const avoidanceMean = avoidanceScores.reduce((a, b) => a + b, 0) / validCount;
  const avoidanceSD = Math.sqrt(
    avoidanceScores.reduce((a, b) => a + Math.pow(b - avoidanceMean, 2), 0) / (validCount - 1)
  );

  const anxietyAlpha = calculateCronbachAlpha(anxietyItemScores, validCount);
  const avoidanceAlpha = calculateCronbachAlpha(avoidanceItemScores, validCount);

  const anxietyPercentiles = calculatePercentiles(anxietyScores);
  const avoidancePercentiles = calculatePercentiles(avoidanceScores);

  const norms = {
    anxiety: {
      mean: Math.round(anxietyMean * 1000) / 1000,
      sd: Math.round(anxietySD * 1000) / 1000,
      percentiles: anxietyPercentiles,
      sampleSize: validCount,
      alpha: Math.round(anxietyAlpha * 1000) / 1000,
    },
    avoidance: {
      mean: Math.round(avoidanceMean * 1000) / 1000,
      sd: Math.round(avoidanceSD * 1000) / 1000,
      percentiles: avoidancePercentiles,
      sampleSize: validCount,
      alpha: Math.round(avoidanceAlpha * 1000) / 1000,
    },
  };

  console.log("\nResults:");
  console.log(`Anxiety: mean=${norms.anxiety.mean}, SD=${norms.anxiety.sd}, α=${norms.anxiety.alpha}`);
  console.log(`Avoidance: mean=${norms.avoidance.mean}, SD=${norms.avoidance.sd}, α=${norms.avoidance.alpha}`);

  writeFileSync(join(process.cwd(), OUTPUT_PATH), JSON.stringify(norms, null, 2));
  console.log(`\nNorms written to ${OUTPUT_PATH}`);
}

main();
