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
    descriptionKo: "전략적이고 계산적인 대인관계 스타일. 타인을 도구로 활용하려는 경향.",
    descriptionEn: "Strategic and calculating interpersonal style. Tendency to use others as tools.",
  },
  narcissism: {
    key: "narcissism",
    ko: "나르시시즘",
    en: "Narcissism",
    descriptionKo: "과장된 자아중심성과 인정 욕구. 자신의 중요성을 과대평가하는 경향.",
    descriptionEn: "Grandiose self-centeredness and need for admiration. Tendency to overestimate one's importance.",
  },
  psychopathy: {
    key: "psychopathy",
    ko: "정신병질",
    en: "Psychopathy",
    descriptionKo: "공감 결핍과 충동성. 타인의 고통에 무감각하고 위험을 추구하는 경향.",
    descriptionEn: "Lack of empathy and impulsivity. Insensitivity to others' suffering and risk-seeking behavior.",
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
