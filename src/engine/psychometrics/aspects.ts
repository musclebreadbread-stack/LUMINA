import { itemAt } from "./items";
import { scoreItem, type LikertResponse, type ResponseMap } from "./scoring";
import {
  aspectContrastStandardDeviation,
  aspectNormScoreFor,
  aspectReliabilityFor,
  type EmotionalAspect,
  type NormScore,
} from "./norms";

export type { EmotionalAspect };

/**
 * DeYoung, Quilty & Peterson (2007)의 신경증(Neuroticism) 국면 분해.
 *
 * IPIP-50에는 국면 전용 문항이 없다. emotionalStability 요인(문항 id 31~40)의 기존 10문항을
 * 이미 있는 두 5문항 하위집합으로 재편성할 뿐, 새 문항은 추가하지 않는다.
 *   withdrawal(침잠) = 불안·낮은 기분   — Am relaxed(+) / Seldom feel blue(+) / Get stressed
 *     out easily(−) / Worry about things(−) / Often feel blue(−)
 *   volatility(표출) = 성마름·기분 변화 — Am easily disturbed(−) / Get upset easily(−) /
 *     Change my mood a lot(−) / Have frequent mood swings(−) / Get irritated easily(−)
 *
 * 이 배정은 scripts/build-norms.ts의 ASPECT_COLUMN_INDICES와 반드시 같아야 한다 — 그
 * 스크립트가 이 정확한 배정으로 공개 IPIP-FFM 원자료(N=551,607)를 계산해 신뢰도(α)·판별
 * 타당도 게이트를 통과시켰다(LUMINA MBTI 64유형 전환 계획 1절, 2026-09).
 */
export const EMOTIONAL_ASPECTS: readonly EmotionalAspect[] = Object.freeze(["withdrawal", "volatility"]);

export const ASPECT_ITEM_COUNT = 5;

const ASPECT_ITEM_IDS: Readonly<Record<EmotionalAspect, readonly number[]>> = Object.freeze({
  withdrawal: Object.freeze([31, 32, 33, 34, 40]),
  volatility: Object.freeze([35, 36, 37, 38, 39]),
});

export function itemIdsOfAspect(aspect: EmotionalAspect): readonly number[] {
  return ASPECT_ITEM_IDS[aspect];
}

export class AspectInputError extends Error {
  constructor(
    message: string,
    readonly missingItemIds: readonly number[] = [],
  ) {
    super(message);
    this.name = "AspectInputError";
  }
}

export interface AspectScore {
  readonly aspect: EmotionalAspect;
  /** 5문항 × 1~5점, 이미 역채점 반영 → 5~25. */
  readonly rawSum: number;
  /** 문항 평균. 1.0~5.0. */
  readonly mean: number;
  readonly itemCount: number;
  readonly norm: NormScore | null;
  readonly reliability: {
    readonly alpha: number;
    readonly sem: number;
    readonly ci95: readonly [number, number];
  };
}

function assertAspectComplete(aspect: EmotionalAspect, responses: ResponseMap): void {
  const missing = itemIdsOfAspect(aspect).filter((id) => responses[id] === undefined);
  if (missing.length > 0) {
    throw new AspectInputError(
      `missing responses for aspect ${aspect}: ${missing.length} item(s): ${missing.join(", ")}`,
      missing,
    );
  }
}

/**
 * 국면별 점수. computeFactorScores와 같은 50문항 응답을 입력으로 받아 emotionalStability의
 * 10문항을 두 5문항 국면으로 다시 합산한다 — 새 문항이나 별도 설문을 요구하지 않는다.
 */
export function computeAspectScores(responses: ResponseMap): readonly AspectScore[] {
  return Object.freeze(
    EMOTIONAL_ASPECTS.map((aspect) => {
      assertAspectComplete(aspect, responses);
      const ids = itemIdsOfAspect(aspect);
      const rawSum = ids.reduce(
        (sum, id) => sum + scoreItem(itemAt(id), responses[id] as LikertResponse),
        0,
      );
      const norm = aspectNormScoreFor(aspect, rawSum);
      return Object.freeze({
        aspect,
        rawSum,
        mean: rawSum / ids.length,
        itemCount: ids.length,
        norm,
        reliability: aspectReliabilityFor(aspect, rawSum, norm),
      });
    }),
  );
}

export { aspectContrastStandardDeviation };
