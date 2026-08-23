/**
 * IPIP-50 — Goldberg(1992)의 50문항 Big Five 공개 척도.
 *
 * International Personality Item Pool(ipip.ori.org)이 퍼블릭 도메인으로 공개한
 * 문항이다("The items and scales are in the public domain... without asking
 * permission and without paying a fee" — ipip.ori.org). 원문 영어 문항을 그대로
 * 신고, 한국어 번역은 "나는 ~" 어간으로 통일해 붙였다.
 *
 * 계층 1(과학적 검증)의 근거축이 되는 유일한 엔진이다 — 문항 출처와 채점 방향이
 * 정확해야 그 지위가 성립하므로, 원문은 절대 임의로 고치지 않는다.
 */

export type BigFiveFactor =
  | "extraversion"
  | "agreeableness"
  | "conscientiousness"
  | "emotionalStability"
  | "intellect";

/** plus = 응답값 그대로 채점. minus = 역채점(6 − 응답값). */
export type ItemKey = "plus" | "minus";

export interface Item {
  readonly id: number; // 1~50, 고정
  readonly factor: BigFiveFactor;
  readonly key: ItemKey;
  readonly textEn: string;
  readonly textKo: string;
}

interface RawItem {
  readonly factor: BigFiveFactor;
  readonly key: ItemKey;
  readonly textEn: string;
  readonly textKo: string;
}

const RAW_ITEMS: readonly RawItem[] = [
  // Extraversion — plus 5
  { factor: "extraversion", key: "plus", textEn: "Am the life of the party.", textKo: "나는 파티의 중심인물이다." },
  { factor: "extraversion", key: "plus", textEn: "Feel comfortable around people.", textKo: "나는 사람들과 있을 때 편안하다." },
  { factor: "extraversion", key: "plus", textEn: "Start conversations.", textKo: "나는 먼저 대화를 시작한다." },
  { factor: "extraversion", key: "plus", textEn: "Talk to a lot of different people at parties.", textKo: "나는 파티에서 다양한 사람과 이야기를 나눈다." },
  { factor: "extraversion", key: "plus", textEn: "Don't mind being the center of attention.", textKo: "나는 주목받는 것을 개의치 않는다." },
  // Extraversion — minus 5
  { factor: "extraversion", key: "minus", textEn: "Don't talk a lot.", textKo: "나는 말수가 적은 편이다." },
  { factor: "extraversion", key: "minus", textEn: "Keep in the background.", textKo: "나는 나서지 않고 뒤에 머무는 편이다." },
  { factor: "extraversion", key: "minus", textEn: "Have little to say.", textKo: "나는 할 말이 별로 없는 편이다." },
  { factor: "extraversion", key: "minus", textEn: "Don't like to draw attention to myself.", textKo: "나는 주목받는 것을 좋아하지 않는다." },
  { factor: "extraversion", key: "minus", textEn: "Am quiet around strangers.", textKo: "나는 낯선 사람들 앞에서 조용해진다." },

  // Agreeableness — plus 6
  { factor: "agreeableness", key: "plus", textEn: "Am interested in people.", textKo: "나는 사람에게 관심이 많다." },
  { factor: "agreeableness", key: "plus", textEn: "Sympathize with others' feelings.", textKo: "나는 다른 사람의 감정에 공감한다." },
  { factor: "agreeableness", key: "plus", textEn: "Have a soft heart.", textKo: "나는 마음이 여린 편이다." },
  { factor: "agreeableness", key: "plus", textEn: "Take time out for others.", textKo: "나는 다른 사람을 위해 시간을 낸다." },
  { factor: "agreeableness", key: "plus", textEn: "Feel others' emotions.", textKo: "나는 다른 사람의 감정을 느낀다." },
  { factor: "agreeableness", key: "plus", textEn: "Make people feel at ease.", textKo: "나는 사람들을 편안하게 해준다." },
  // Agreeableness — minus 4
  { factor: "agreeableness", key: "minus", textEn: "Am not really interested in others.", textKo: "나는 다른 사람에게 별로 관심이 없다." },
  { factor: "agreeableness", key: "minus", textEn: "Insult people.", textKo: "나는 사람들에게 모욕적인 말을 한다." },
  { factor: "agreeableness", key: "minus", textEn: "Am not interested in other people's problems.", textKo: "나는 다른 사람의 문제에 관심이 없다." },
  { factor: "agreeableness", key: "minus", textEn: "Feel little concern for others.", textKo: "나는 다른 사람을 별로 신경 쓰지 않는다." },

  // Conscientiousness — plus 6
  { factor: "conscientiousness", key: "plus", textEn: "Am always prepared.", textKo: "나는 항상 준비되어 있다." },
  { factor: "conscientiousness", key: "plus", textEn: "Pay attention to details.", textKo: "나는 세부적인 것까지 신경 쓴다." },
  { factor: "conscientiousness", key: "plus", textEn: "Get chores done right away.", textKo: "나는 해야 할 일을 바로 처리한다." },
  { factor: "conscientiousness", key: "plus", textEn: "Like order.", textKo: "나는 정돈된 것을 좋아한다." },
  { factor: "conscientiousness", key: "plus", textEn: "Follow a schedule.", textKo: "나는 일정을 지킨다." },
  { factor: "conscientiousness", key: "plus", textEn: "Am exacting in my work.", textKo: "나는 일을 꼼꼼하게 한다." },
  // Conscientiousness — minus 4
  { factor: "conscientiousness", key: "minus", textEn: "Leave my belongings around.", textKo: "나는 물건을 아무 데나 놓아둔다." },
  { factor: "conscientiousness", key: "minus", textEn: "Make a mess of things.", textKo: "나는 일을 엉망으로 만든다." },
  { factor: "conscientiousness", key: "minus", textEn: "Often forget to put things back in their proper place.", textKo: "나는 물건을 제자리에 두는 것을 자주 잊는다." },
  { factor: "conscientiousness", key: "minus", textEn: "Shirk my duties.", textKo: "나는 해야 할 일을 미루거나 피한다." },

  // Emotional Stability — plus 2
  { factor: "emotionalStability", key: "plus", textEn: "Am relaxed most of the time.", textKo: "나는 대체로 여유롭다." },
  { factor: "emotionalStability", key: "plus", textEn: "Seldom feel blue.", textKo: "나는 우울함을 잘 느끼지 않는다." },
  // Emotional Stability — minus 8
  { factor: "emotionalStability", key: "minus", textEn: "Get stressed out easily.", textKo: "나는 쉽게 스트레스를 받는다." },
  { factor: "emotionalStability", key: "minus", textEn: "Worry about things.", textKo: "나는 여러 일을 걱정한다." },
  { factor: "emotionalStability", key: "minus", textEn: "Am easily disturbed.", textKo: "나는 쉽게 동요한다." },
  { factor: "emotionalStability", key: "minus", textEn: "Get upset easily.", textKo: "나는 쉽게 화가 난다." },
  { factor: "emotionalStability", key: "minus", textEn: "Change my mood a lot.", textKo: "나는 기분이 자주 바뀐다." },
  { factor: "emotionalStability", key: "minus", textEn: "Have frequent mood swings.", textKo: "나는 감정 기복이 심한 편이다." },
  { factor: "emotionalStability", key: "minus", textEn: "Get irritated easily.", textKo: "나는 쉽게 짜증이 난다." },
  { factor: "emotionalStability", key: "minus", textEn: "Often feel blue.", textKo: "나는 우울함을 자주 느낀다." },

  // Intellect/Imagination — plus 7
  { factor: "intellect", key: "plus", textEn: "Have a rich vocabulary.", textKo: "나는 어휘가 풍부하다." },
  { factor: "intellect", key: "plus", textEn: "Have a vivid imagination.", textKo: "나는 상상력이 풍부하다." },
  { factor: "intellect", key: "plus", textEn: "Have excellent ideas.", textKo: "나는 좋은 아이디어를 잘 낸다." },
  { factor: "intellect", key: "plus", textEn: "Am quick to understand things.", textKo: "나는 이해가 빠른 편이다." },
  { factor: "intellect", key: "plus", textEn: "Use difficult words.", textKo: "나는 어려운 단어를 즐겨 쓴다." },
  { factor: "intellect", key: "plus", textEn: "Spend time reflecting on things.", textKo: "나는 생각에 잠기는 시간을 갖는다." },
  { factor: "intellect", key: "plus", textEn: "Am full of ideas.", textKo: "나는 아이디어가 넘친다." },
  // Intellect/Imagination — minus 3
  { factor: "intellect", key: "minus", textEn: "Have difficulty understanding abstract ideas.", textKo: "나는 추상적인 개념을 이해하기 어려워한다." },
  { factor: "intellect", key: "minus", textEn: "Am not interested in abstract ideas.", textKo: "나는 추상적인 개념에 관심이 없다." },
  { factor: "intellect", key: "minus", textEn: "Do not have a good imagination.", textKo: "나는 상상력이 풍부하지 않다." },
];

export const ITEMS: readonly Item[] = Object.freeze(
  RAW_ITEMS.map((raw, i) => Object.freeze({ id: i + 1, ...raw })),
);

export const ITEM_COUNT = 50;
export const ITEMS_PER_FACTOR = 10;

export function itemAt(id: number): Item {
  const item = ITEMS[id - 1];
  if (!item) throw new RangeError(`invalid item id: ${id} (expected 1..${ITEM_COUNT})`);
  return item;
}

export function itemsOfFactor(factor: BigFiveFactor): readonly Item[] {
  return ITEMS.filter((i) => i.factor === factor);
}

export const FACTORS: readonly BigFiveFactor[] = Object.freeze([
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "emotionalStability",
  "intellect",
]);
