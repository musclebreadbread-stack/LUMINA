import {
  computeTarotReading,
  suitOf,
  tarotCardExplanation,
  tarotSeedExplanation,
  type SpreadKey,
  type TarotResult,
} from "@engine/tarot";
import type { ExplanationBlock } from "@engine/shared/explanation";
import { assetPath } from "./assets";

/**
 * 타로 결과 → 화면 전용 뷰 모델.
 *
 * 이 파일은 로케일을 모른다. 카드·수트·자리 이름처럼 이미 ko/en 짝을 가진 엔진
 * 데이터(CardDef, SuitDef, SpreadPosition — @engine/tarot 참고)는 그 짝을 그대로
 * 실어 보내고, 문장으로 엮어야 하는 해석문은 조립하지 않은 채 원재료(카드 이름·
 * 방향·키워드)만 구조화된 값으로 남겨 둔다 — 실제 문장 조립은 next-intl 을 쓸 수
 * 있는 화면 쪽(TarotCard)이 한다.
 *
 * 톤 정책은 문장이 조립되는 화면 쪽에서도 지켜야 한다 — 단정적 예언 금지
 * ("~할 것이다" 대신 "~한 기운/경향"), 결정론적 표현 금지, 자리마다 자기성찰
 * 질문을 하나씩 남긴다.
 */

export interface CardView {
  readonly id: number;
  readonly positionKo: string;
  readonly positionEn: string;
  readonly promptKo: string;
  readonly promptEn: string;
  readonly name: string;
  readonly nameEn: string;
  readonly isMajor: boolean;
  readonly suitKo: string | null;
  readonly suitEn: string | null;
  /** 메이저: 0~21. 마이너: 1(에이스)~14(왕). 단위 표기는 화면에서 로케일에 맞게 붙인다. */
  readonly number: number;
  readonly orientation: "upright" | "reversed";
  readonly keywords: readonly string[];
  readonly keywordsEn: readonly string[];
  readonly iconographyKo: string;
  readonly iconographyEn: string;
  readonly explanation: ExplanationBlock;
  /** public/tarot/cards/{id}.webp — card.id(0~77)를 그대로 파일명으로 쓴다. */
  readonly imageSrc: string;
}

export interface TarotView {
  readonly spreadKo: string;
  readonly spreadEn: string;
  readonly seed: string;
  readonly cards: readonly CardView[];
  readonly method: ExplanationBlock;
}

export function buildTarotView(spread: SpreadKey, seed: string): TarotView {
  const result: TarotResult = computeTarotReading(spread, seed);

  return {
    spreadKo: result.spread.ko,
    spreadEn: result.spread.en,
    seed: result.seed,
    cards: result.cards.map((drawn) => {
      const { card, orientation, position } = drawn;
      const isMajor = card.suit === "major";
      const suit = isMajor ? null : suitOf(card.suit);

      return {
        id: card.id,
        positionKo: position.ko,
        positionEn: position.en,
        promptKo: position.prompt,
        promptEn: position.promptEn,
        name: card.name,
        nameEn: card.nameEn,
        isMajor,
        suitKo: suit ? suit.ko : null,
        suitEn: suit ? suit.en : null,
        number: card.number,
        orientation,
        keywords: orientation === "upright" ? card.keywordsUpright : card.keywordsReversed,
        keywordsEn: orientation === "upright" ? card.keywordsUprightEn : card.keywordsReversedEn,
        iconographyKo: card.iconography.ko,
        iconographyEn: card.iconography.en,
        explanation: tarotCardExplanation(card, orientation, position.key),
        imageSrc: assetPath("tarot/cards", String(card.id).padStart(2, "0")),
      };
    }),
    method: tarotSeedExplanation(result.seed),
  };
}
