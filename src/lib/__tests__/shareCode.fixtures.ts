import { ITEMS as BIGFIVE_ITEMS, type BigFiveFactor } from "@engine/psychometrics/items";
import { computeFactorScores as computeBigFiveFactorScores, type FactorScore as BigFiveFactorScore, type ResponseMap } from "@engine/psychometrics/scoring";
import { computeJungianLenses, type JungianLensResult } from "@engine/psychometrics/jungian";
import { computeAspectScores, type EmotionalAspect } from "@engine/psychometrics/aspects";
import { ITEMS as DARKTRIAD_ITEMS, type DarkTriadFactor } from "@engine/darktriad/items";
import { computeFactorScores as computeDarkTriadFactorScores, type FactorScore as DarkTriadFactorScore } from "@engine/darktriad/scoring";
import { ITEMS as EQ_ITEMS } from "@engine/eq/items";
import {
  computeFactorScores as computeEqFactorScores,
  type FactorScore as EqFactorScore,
  type LikertResponse as EqLikertResponse,
  type ResponseMap as EqResponseMap,
} from "@engine/eq/scoring";
import {
  DOMAINS as COGNITIVE_DOMAINS,
  ITEMS as COGNITIVE_ITEMS,
  type CognitiveDomain,
  type Item as CognitiveItem,
} from "@engine/cognitive/items";
import {
  scoreCognitive,
  type CognitiveResult,
  type ResponseMap as CognitiveResponseMap,
} from "@engine/cognitive/scoring";
import type { AttachmentQuadrant } from "@engine/attachment/quadrants";
import type { AttachmentView } from "../attachmentModel";

/**
 * shareCode 테스트 전용 픽스처 빌더.
 *
 * 손으로 FactorScore 전체 필드를 채우는 대신 실제 채점 엔진을 중립 응답(3점)으로
 * 한 번 돌리고 norm만 원하는 값으로 덮어쓴다 — jungian.test.ts의 scoresWithZ와 같은
 * 방식이라, 엔진의 실제 FactorScore 모양과 어긋날 일이 없다.
 */

function neutralBigFiveResponses(): ResponseMap {
  return Object.fromEntries(BIGFIVE_ITEMS.map((item) => [item.id, 3])) as ResponseMap;
}

function neutralDarkTriadResponses(): ResponseMap {
  return Object.fromEntries(DARKTRIAD_ITEMS.map((item) => [item.id, 3])) as ResponseMap;
}

export function bigFiveScoresWithTScore(
  tScoreByFactor: Partial<Record<BigFiveFactor, number>>,
): readonly BigFiveFactorScore[] {
  return computeBigFiveFactorScores(neutralBigFiveResponses()).map((score) => {
    const tScore = tScoreByFactor[score.factor];
    if (tScore === undefined) return { ...score, norm: null };
    return {
      ...score,
      norm: {
        zScore: (tScore - 50) / 10,
        tScore,
        percentile: 50,
        normGroup: "all" as const,
        sampleSize: 100,
        standardDeviation: 5,
      },
    };
  });
}

export function darkTriadScoresWithTScore(
  tScoreByFactor: Partial<Record<DarkTriadFactor, number>>,
): readonly DarkTriadFactorScore[] {
  return computeDarkTriadFactorScores(neutralDarkTriadResponses()).map((score) => {
    const tScore = tScoreByFactor[score.factor];
    if (tScore === undefined) return { ...score, norm: null };
    return {
      ...score,
      norm: {
        zScore: (tScore - 50) / 10,
        tScore,
        percentile: 50,
        normGroup: "all" as const,
        sampleSize: 100,
        standardDeviation: 5,
      },
    };
  });
}

export function jungianResultFromZ(
  zByFactor: Partial<Record<BigFiveFactor, number>>,
  zByAspect: Partial<Record<EmotionalAspect, number>> = {},
): JungianLensResult {
  const responses = neutralBigFiveResponses();
  const scores = computeBigFiveFactorScores(responses).map((score) => {
    const zScore = zByFactor[score.factor] ?? 0;
    return {
      ...score,
      norm: {
        zScore,
        tScore: 50 + zScore * 10,
        percentile: 50,
        normGroup: "all" as const,
        sampleSize: 100,
        standardDeviation: 5,
      },
    };
  });
  const aspectScores = computeAspectScores(responses).map((score) => {
    const zScore = zByAspect[score.aspect] ?? 0;
    return {
      ...score,
      norm: {
        zScore,
        tScore: 50 + zScore * 10,
        percentile: 50,
        normGroup: "all" as const,
        sampleSize: 100,
        standardDeviation: 5,
      },
    };
  });
  return computeJungianLenses(scores, aspectScores);
}

export function attachmentViewFixture(
  anxietyMean: number,
  avoidanceMean: number,
  quadrant: AttachmentQuadrant,
): AttachmentView {
  return {
    anxiety: { rawSum: anxietyMean * 18, mean: anxietyMean, labelKo: "불안", labelEn: "Anxiety" },
    avoidance: { rawSum: avoidanceMean * 18, mean: avoidanceMean, labelKo: "회피", labelEn: "Avoidance" },
    classification: {
      quadrant,
      labelKo: "테스트",
      labelEn: "test",
      descriptionKo: "테스트",
      descriptionEn: "test",
    },
  };
}

/**
 * EQ는 하위요인 규준이 아예 없어(SUBSCALE_NORMS 전부 null) norm을 덮어써도 어댑터가
 * 실제로 지나가는 경로와 달라진다 — 그래서 다른 kind와 달리 응답값 자체를 바꿔 가며
 * 엔진이 낸 진짜 FactorScore를 그대로 쓴다.
 */
export function eqResponsesFor(responseFor: (itemId: number) => EqLikertResponse): EqResponseMap {
  return Object.fromEntries(EQ_ITEMS.map((item) => [item.id, responseFor(item.id)])) as EqResponseMap;
}

export function eqScoresFor(responseFor: (itemId: number) => EqLikertResponse): readonly EqFactorScore[] {
  return computeEqFactorScores(eqResponsesFor(responseFor));
}

/** 33문항 전체에 같은 값을 답한 응답 — 총점이 이론 최소(33)·최대(165)에 정확히 닿는다. */
export function eqScoresFromUniformResponse(response: EqLikertResponse): readonly EqFactorScore[] {
  return eqScoresFor(() => response);
}

/**
 * 문항마다 "맞힐 것인가"만 정해 실제 채점기를 한 번 돌린다 — 정답률을 손으로 적어 넣지 않으므로
 * 영역 구성(영역당 4문항)이 바뀌면 픽스처가 아니라 엔진 쪽에서 먼저 어긋난다.
 * 오답은 정답 다음 색인으로 고른다(보기 수로 나눈 나머지라 항상 유효한 색인이다).
 */
export function cognitiveResultWith(
  shouldAnswerCorrectly: (item: CognitiveItem) => boolean,
): CognitiveResult {
  const responses = Object.fromEntries(
    COGNITIVE_ITEMS.map((item) => [
      item.id,
      shouldAnswerCorrectly(item)
        ? item.correctOptionIndex
        : (item.correctOptionIndex + 1) % item.options.length,
    ]),
  ) as CognitiveResponseMap;
  return scoreCognitive({ responses });
}

/** 영역별로 정확히 n문항만 맞힌 결과. 앞에서부터 n문항을 맞히게 한다. */
export function cognitiveResultWithCorrectCounts(
  correctCountByDomain: Readonly<Record<CognitiveDomain, number>>,
): CognitiveResult {
  const seenByDomain = new Map<CognitiveDomain, number>(COGNITIVE_DOMAINS.map((domain) => [domain, 0] as const));
  return cognitiveResultWith((item) => {
    const seen = seenByDomain.get(item.domain) ?? 0;
    seenByDomain.set(item.domain, seen + 1);
    return seen < correctCountByDomain[item.domain];
  });
}
