import { hashSeed, rngFromSeed } from "@engine/shared/random";
import { DECK, type CardDef } from "./constants";

/**
 * 결정론적 셔플.
 *
 * 엔진은 내부에서 Math.random 이나 현재 시각을 읽지 않는다 — 사주 엔진과 같은 규율이다.
 * 호출부(클라이언트)가 시드를 만들어 넘기고, 그 시드를 공유 링크에 그대로 실어 두면
 * 몇 달 뒤에 같은 링크를 열어도 같은 카드가 나온다.
 *
 * 시드 해시·PRNG 자체는 @engine/shared/random 에 있다 — 오늘의 운세 엔진도 같은
 * 것을 쓴다. 여기서는 재수출만 해서 기존 임포트 경로를 그대로 유지한다.
 */
export { hashSeed, rngFromSeed };

export type Orientation = "upright" | "reversed";

/** Fisher–Yates. 주어진 rng 를 그대로 소비하므로 이후 호출과 이어서 결정론적이다. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

export interface DrawnCard {
  readonly card: CardDef;
  readonly orientation: Orientation;
}

export class TarotSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TarotSeedError";
  }
}

/**
 * 시드로부터 count 장을 뽑는다. 같은 시드 + 같은 매수 → 언제나 같은 카드·같은 순서·
 * 같은 정역방향.
 *
 * 셔플 다음에 카드마다 방향을 하나씩 더 뽑는다 — 같은 rng 수열 위에서 일어나는
 * 일이므로 시드 하나가 전체 결과를 완전히 결정한다.
 */
export function drawCards(seed: string, count: number): readonly DrawnCard[] {
  if (!seed) throw new TarotSeedError("seed must be a non-empty string");
  if (!Number.isInteger(count) || count < 1 || count > DECK.length) {
    throw new TarotSeedError(`count must be an integer in 1..${DECK.length}, got ${count}`);
  }

  const rng = rngFromSeed(seed);
  const shuffled = shuffle(DECK, rng);

  return Object.freeze(
    shuffled.slice(0, count).map((card) =>
      Object.freeze({
        card,
        orientation: (rng() < 0.5 ? "upright" : "reversed") as Orientation,
      }),
    ),
  );
}
