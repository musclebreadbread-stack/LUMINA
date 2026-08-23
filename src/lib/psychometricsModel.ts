import {
  computeBigFive,
  factorExplanation,
  profileCombinationExplanation,
  reflectionQuestion,
} from "@engine/psychometrics";
import type { NormContext } from "@engine/psychometrics";
import type { BigFiveFactor } from "@engine/psychometrics/items";
import type { ItemResponse, ResponseMap } from "@engine/psychometrics/scoring";
import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { assetPath } from "./assets";

/**
 * Big Five 결과 → 화면 전용 뷰 모델.
 *
 * 이 파일은 로케일을 모른다. FACTOR_META가 이미 ko/en 짝을 가지고 있으므로
 * 그 짝을 그대로 실어 보내고(사주의 CharCell·dayMaster와 같은 방식), 로케일에
 * 맞는 문구 선택은 렌더 시점의 컴포넌트가 한다. 평균 점수도 그대로 숫자로
 * 남겨 두고, "평균"이라는 말과 소수점 자리수 표기는 화면(FactorBar)에서
 * 메시지 카탈로그를 통해 붙인다.
 */

export interface FactorView {
  readonly key: BigFiveFactor;
  readonly ko: string;
  readonly en: string;
  readonly lowGloss: string;
  readonly lowGlossEn: string;
  readonly highGloss: string;
  readonly highGlossEn: string;
  readonly scalePosition: number;
  readonly mean: number;
  readonly rawSum: number;
  readonly norm: {
    readonly zScore: number;
    readonly tScore: number;
    readonly percentile: number;
    readonly normGroup: "all" | "age-gender";
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
  readonly explanation: ExplanationBlock;
  readonly reflectionQuestion: LocalizedText;
  /** public/psychometrics/factors/{key}.webp */
  readonly imageSrc: string;
}

export interface BigFiveView {
  readonly itemCount: number;
  readonly factors: readonly FactorView[];
  readonly profileExplanation: ExplanationBlock | null;
}

export function buildBigFiveView(responses: ResponseMap, normContext?: NormContext): BigFiveView {
  const result = computeBigFive(responses, normContext);
  const factors = result.factors.map((f) => {
    const strongestItems = [...f.itemResponses]
      .sort((left, right) => right.scoredResponse - left.scoredResponse || left.itemId - right.itemId)
      .slice(0, 2);
    const strongestIds = new Set(strongestItems.map((item) => item.itemId));
    const weakestItems = [...f.itemResponses]
      .sort((left, right) => left.scoredResponse - right.scoredResponse || left.itemId - right.itemId)
      .filter((item) => !strongestIds.has(item.itemId))
      .slice(0, 2);

    return {
      key: f.meta.key,
      ko: f.meta.ko,
      en: f.meta.en,
      lowGloss: f.meta.lowGloss,
      lowGlossEn: f.meta.lowGlossEn,
      highGloss: f.meta.highGloss,
      highGlossEn: f.meta.highGlossEn,
      scalePosition: f.scalePosition0to100,
      mean: f.mean,
      rawSum: f.rawSum,
      norm: f.norm,
      reliability: f.reliability,
      consistency: f.consistency,
      strongestItems: Object.freeze(strongestItems),
      weakestItems: Object.freeze(weakestItems),
      explanation: factorExplanation(f),
      reflectionQuestion: reflectionQuestion(f),
      imageSrc: assetPath("psychometrics/factors", f.meta.key),
    } satisfies FactorView;
  });

  return {
    itemCount: result.itemCount,
    factors: Object.freeze(factors),
    profileExplanation: profileCombinationExplanation(result.factors),
  };
}
