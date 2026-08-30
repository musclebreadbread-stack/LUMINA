import { computeFactorScores, type ResponseMap } from "@engine/darktriad/scoring";
import { FACTORS, ITEMS_PER_FACTOR, type DarkTriadFactor } from "@engine/darktriad/items";
import type { ItemResponse } from "@engine/darktriad/scoring";

export interface FactorMeta {
  readonly key: DarkTriadFactor;
  readonly ko: string;
  readonly en: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
}

const FACTOR_META: Readonly<Record<DarkTriadFactor, FactorMeta>> = {
  machiavellianism: {
    key: "machiavellianism",
    ko: "마키아벨리즘",
    en: "Machiavellianism",
    descriptionKo: "대인관계에서 전략적으로 계획하고 계산하는 경향.",
    descriptionEn: "Strategic interpersonal orientation and preference for calculated planning.",
  },
  narcissism: {
    key: "narcissism",
    ko: "나르시시즘",
    en: "Narcissism",
    descriptionKo: "자기중심적 관심과 인정·칭찬에 대한 민감성 경향.",
    descriptionEn: "Self-focused orientation and sensitivity to recognition or admiration.",
  },
  psychopathy: {
    key: "psychopathy",
    ko: "정신병질",
    en: "Psychopathy",
    descriptionKo: "공감적 관심이 낮거나 충동·위험 선호가 높게 나타나는 경향.",
    descriptionEn: "Lower empathic concern and greater impulsive or risk-oriented tendencies.",
  },
};

export interface FactorView {
  readonly key: DarkTriadFactor;
  readonly ko: string;
  readonly en: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
  readonly scalePosition: number;
  readonly mean: number;
  readonly rawSum: number;
  readonly norm: {
    readonly zScore: number;
    readonly tScore: number;
    readonly percentile: number;
    readonly sampleSize: number;
    readonly standardDeviation: number;
  } | null;
  readonly reliability: {
    readonly alpha: number;
    readonly sem: number;
    readonly ci95: readonly [number, number];
  };
  readonly consistency: {
    readonly withinFactorSD: number;
    readonly midpointRate: number;
  };
  readonly strongestItems: readonly ItemResponse[];
  readonly weakestItems: readonly ItemResponse[];
}

export interface DarkTriadView {
  readonly itemCount: number;
  readonly factors: readonly FactorView[];
  readonly dominantFactor: DarkTriadFactor | null;
  readonly totalScore: number;
}

export function buildDarkTriadView(responses: ResponseMap): DarkTriadView {
  const result = computeFactorScores(responses);
  
  const factors = result.map((f) => {
    const meta = FACTOR_META[f.factor];
    const strongestItems = [...f.itemResponses]
      .sort((left, right) => right.scoredResponse - left.scoredResponse || left.itemId - right.itemId)
      .slice(0, 2);
    const strongestIds = new Set(strongestItems.map((item) => item.itemId));
    const weakestItems = [...f.itemResponses]
      .sort((left, right) => left.scoredResponse - right.scoredResponse || left.itemId - right.itemId)
      .filter((item) => !strongestIds.has(item.itemId))
      .slice(0, 2);

    return {
      key: meta.key,
      ko: meta.ko,
      en: meta.en,
      descriptionKo: meta.descriptionKo,
      descriptionEn: meta.descriptionEn,
      scalePosition: f.scalePosition0to100,
      mean: f.mean,
      rawSum: f.rawSum,
      norm: f.norm,
      reliability: f.reliability,
      consistency: f.consistency,
      strongestItems: Object.freeze(strongestItems),
      weakestItems: Object.freeze(weakestItems),
    } satisfies FactorView;
  });

  // Find dominant factor (highest z-score, or highest rawSum if no norms)
  const dominantFactor = factors.reduce<DarkTriadFactor | null>((acc, factor) => {
    const currentZ = factor.norm?.zScore ?? factor.scalePosition;
    const accZ = acc 
      ? (factors.find(f => f.key === acc)?.norm?.zScore ?? factors.find(f => f.key === acc)?.scalePosition ?? 0)
      : -Infinity;
    return currentZ > accZ ? factor.key : acc;
  }, null);

  const totalScore = factors.reduce((sum, f) => sum + f.rawSum, 0);

  return {
    itemCount: FACTORS.length * ITEMS_PER_FACTOR,
    factors: Object.freeze(factors),
    dominantFactor,
    totalScore,
  };
}
