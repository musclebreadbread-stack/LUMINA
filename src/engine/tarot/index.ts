import type { EvidenceTier } from "@engine/shared/tier";
import type { CardDef } from "./constants";
import { drawCards, type Orientation } from "./shuffle";
import { spreadOf, spreadSize, type SpreadDef, type SpreadKey, type SpreadPosition } from "./spreads";

export * from "./constants";
export * from "./shuffle";
export * from "./spreads";
export * from "./citations";
export * from "./explanations";

export interface DrawnPosition {
  readonly position: SpreadPosition;
  readonly card: CardDef;
  readonly orientation: Orientation;
}

export interface TarotResult {
  readonly engine: "tarot";
  readonly tier: EvidenceTier;
  readonly version: 1;
  readonly spread: SpreadDef;
  /** 이 결과를 만든 시드. 공유 링크에 실어 두면 재현된다. */
  readonly seed: string;
  readonly cards: readonly DrawnPosition[];
}

/**
 * 타로 스프레드 산출.
 *
 * 시드는 호출부가 만든다 — 엔진은 Math.random 도, 현재 시각도 읽지 않는다.
 * 같은 (스프레드, 시드) 는 언제나 같은 카드·정역방향·자리를 낸다.
 */
export function computeTarotReading(spread: SpreadKey, seed: string): TarotResult {
  const def = spreadOf(spread);
  const drawn = drawCards(seed, spreadSize(spread));

  return Object.freeze({
    engine: "tarot" as const,
    tier: "cultural" as EvidenceTier,
    version: 1 as const,
    spread: def,
    seed,
    cards: Object.freeze(
      def.positions.map((position, i) =>
        Object.freeze({
          position,
          card: drawn[i]!.card,
          orientation: drawn[i]!.orientation,
        }),
      ),
    ),
  });
}
