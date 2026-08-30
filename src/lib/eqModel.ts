import { FACTORS, TOTAL_ITEM_COUNT, type EqFactor } from "@engine/eq/items";
import { computeFactorScores, computeTotalScore, type ResponseMap } from "@engine/eq/scoring";
import type { EqScoreBase, ItemResponse } from "@engine/eq/scoring";

/**
 * SSEIT 결과 뷰모델.
 *
 * 엔진은 숫자만 낸다 — 요인 이름과 한 줄 설명처럼 사람이 읽는 문장은 전부 여기 모아 둔다.
 * 화면에 바로 꽂히는 짧은 라벨은 두 언어를 같은 자리에 두는 편이 어긋날 여지가 적어
 * 다크 트라이어드와 동일하게 ko/en 필드로 갖고 있고, 문단 단위 문구만 messages/*.json이 맡는다.
 */

export interface FactorMeta {
  readonly key: EqFactor;
  readonly ko: string;
  readonly en: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
}

const FACTOR_META: Readonly<Record<EqFactor, FactorMeta>> = {
  perceptionOfEmotion: {
    key: "perceptionOfEmotion",
    ko: "정서 인식",
    en: "Perception of Emotion",
    descriptionKo: "표정·목소리·자기 감각에서 감정 신호를 알아차린다고 보고하는 정도.",
    descriptionEn: "Self-reported attention to emotional cues in faces, voices, and one's own experience.",
  },
  managingOwnEmotions: {
    key: "managingOwnEmotions",
    ko: "자기 정서 조절",
    en: "Managing Own Emotions",
    descriptionKo: "어려움 앞에서 기분을 추스르고 시도를 이어 간다고 보고하는 정도.",
    descriptionEn: "Self-reported ability to steady one's mood and keep going when facing obstacles.",
  },
  managingOthersEmotions: {
    key: "managingOthersEmotions",
    ko: "타인 정서 조절",
    en: "Managing Others' Emotions",
    descriptionKo: "다른 사람의 기분을 살피고 관계의 분위기를 다룬다고 보고하는 정도.",
    descriptionEn: "Self-reported attention to others' feelings and to the emotional tone of a relationship.",
  },
  utilisationOfEmotion: {
    key: "utilisationOfEmotion",
    ko: "정서 활용",
    en: "Utilisation of Emotion",
    descriptionKo: "기분의 변화를 판단·발상·동기의 재료로 쓴다고 보고하는 정도.",
    descriptionEn: "Self-reported use of shifting moods as material for judgment, ideas, and motivation.",
  },
};

export interface ScoreView {
  readonly scalePosition: number;
  readonly mean: number;
  readonly rawSum: number;
  readonly itemCount: number;
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

export interface FactorView extends ScoreView {
  readonly key: EqFactor;
  readonly ko: string;
  readonly en: string;
  readonly descriptionKo: string;
  readonly descriptionEn: string;
}

export interface EqView {
  readonly itemCount: number;
  readonly factors: readonly FactorView[];
  /** 하위요인 중 척도 내 상대 위치가 가장 높은 하나. 순위가 아니라 대화의 출발점으로만 쓴다. */
  readonly dominantFactor: EqFactor | null;
  /** SSEIT의 1차 지표. 규준·신뢰구간이 실제로 붙는 유일한 점수다. */
  readonly total: ScoreView;
}

/** 강하게/약하게 동의한 문항을 각각 두 개씩 고른다. 동점이면 문항 번호가 작은 쪽이 앞선다. */
function extremeItems(itemResponses: readonly ItemResponse[]): {
  readonly strongestItems: readonly ItemResponse[];
  readonly weakestItems: readonly ItemResponse[];
} {
  const strongestItems = [...itemResponses]
    .sort((left, right) => right.scoredResponse - left.scoredResponse || left.itemId - right.itemId)
    .slice(0, 2);
  const strongestIds = new Set(strongestItems.map((item) => item.itemId));
  const weakestItems = [...itemResponses]
    .sort((left, right) => left.scoredResponse - right.scoredResponse || left.itemId - right.itemId)
    .filter((item) => !strongestIds.has(item.itemId))
    .slice(0, 2);

  return { strongestItems: Object.freeze(strongestItems), weakestItems: Object.freeze(weakestItems) };
}

function toScoreView(score: EqScoreBase): ScoreView {
  const { strongestItems, weakestItems } = extremeItems(score.itemResponses);
  return {
    scalePosition: score.scalePosition0to100,
    mean: score.mean,
    rawSum: score.rawSum,
    itemCount: score.itemCount,
    norm: score.norm,
    reliability: score.reliability,
    consistency: score.consistency,
    strongestItems,
    weakestItems,
  };
}

export function buildEqView(responses: ResponseMap): EqView {
  const factors = computeFactorScores(responses).map((score) => {
    const meta = FACTOR_META[score.factor];
    return {
      key: meta.key,
      ko: meta.ko,
      en: meta.en,
      descriptionKo: meta.descriptionKo,
      descriptionEn: meta.descriptionEn,
      ...toScoreView(score),
    } satisfies FactorView;
  });

  /**
   * 하위요인은 출판 규준이 없어 norm이 항상 null이다 — z점수끼리 비교할 수 없으므로
   * 요인마다 문항 수가 달라도 같은 축이 되는 scalePosition(이론 범위 0~100)으로만 고른다.
   */
  const dominantFactor = factors.reduce<FactorView | null>(
    (best, factor) => (best === null || factor.scalePosition > best.scalePosition ? factor : best),
    null,
  );

  return {
    itemCount: TOTAL_ITEM_COUNT,
    factors: Object.freeze(factors),
    dominantFactor: dominantFactor?.key ?? null,
    total: Object.freeze(toScoreView(computeTotalScore(responses))),
  };
}

/** 화면이 요인 순서를 임의로 바꾸지 않도록 엔진의 고정 순서를 그대로 다시 내보낸다. */
export const EQ_FACTOR_ORDER: readonly EqFactor[] = FACTORS;
