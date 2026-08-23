/**
 * Short Dark Triad (SD3) — Jones & Paulhus (2014)의 27문항 다크 트라이어드 척도.
 *
 * 원문 출처: Jones, D. N., & Paulhus, D. L. (2014). Introducing the Short Dark Triad (SD3):
 * A brief measure of dark personality traits. Assessment, 21(1), 28–41.
 *
 * 계층 1(과학적 검증)로 분류된다 — 동료검토를 거친 학술 척도이며,
 * OpenPsychometrics.org의 대규모 응답자 데이터(n=18,192)로 규준을 산출했다.
 *
 * 3요인 × 9문항 = 27문항. 5점 Likert(1=전혀 동의하지 않는다 ~ 5=매우 동의한다).
 * 역채점 문항은 key="minus"로 표시하며, 채점 시 (6 − 응답값)을 적용한다.
 */

export type DarkTriadFactor =
  | "machiavellianism"
  | "narcissism"
  | "psychopathy";

/** plus = 응답값 그대로 채점. minus = 역채점(6 − 응답값). */
export type ItemKey = "plus" | "minus";

export interface Item {
  readonly id: number; // 1~27, 고정
  readonly factor: DarkTriadFactor;
  readonly key: ItemKey;
  readonly textEn: string;
  readonly textKo: string;
}

interface RawItem {
  readonly factor: DarkTriadFactor;
  readonly key: ItemKey;
  readonly textEn: string;
  readonly textKo: string;
}

const RAW_ITEMS: readonly RawItem[] = [
  // Machiavellianism — plus 9
  { factor: "machiavellianism", key: "plus", textEn: "It's not wise to tell your secrets.", textKo: "비밀을 말하는 것은 현명하지 못하다." },
  { factor: "machiavellianism", key: "plus", textEn: "I like to use clever manipulation to get my way.", textKo: "나는 내 뜻을 관철하기 위해 교묘한 조작을 사용한다." },
  { factor: "machiavellianism", key: "plus", textEn: "Whatever it takes, you must get the important people on your side.", textKo: "무슨 수를 써서라도 중요한 사람들을 내 편으로 만들어야 한다." },
  { factor: "machiavellianism", key: "plus", textEn: "Avoid direct conflict with others because they may be useful in the future.", textKo: "다른 사람과 직접적인 갈등은 피한다. 나중에 쓸모 있을 수 있기 때문이다." },
  { factor: "machiavellianism", key: "plus", textEn: "It's wise to keep track of information that you can use against people later.", textKo: "나중에 다른 사람에게 쓸 수 있는 정보를 기록해 두는 것이 현명하다." },
  { factor: "machiavellianism", key: "plus", textEn: "You should wait for the right time to get back at people.", textKo: "다른 사람에게 되갚을 올바른 시기를 기다려야 한다." },
  { factor: "machiavellianism", key: "plus", textEn: "There are things you should hide from other people because they don't need to know.", textKo: "다른 사람에게 숨겨야 할 것들이 있다. 알 필요가 없기 때문이다." },
  { factor: "machiavellianism", key: "plus", textEn: "Make sure your plans benefit you, not others.", textKo: "내 계획이 다른 사람이 아니라 나에게 이익이 되도록 해야 한다." },
  { factor: "machiavellianism", key: "plus", textEn: "Most people can be manipulated.", textKo: "대부분의 사람들은 조종될 수 있다." },

  // Narcissism — N1-N9 (N2, N6, N8 are reverse-scored)
  { factor: "narcissism", key: "plus", textEn: "People see me as a natural leader.", textKo: "사람들은 나를 타고난 리더로 본다." },
  { factor: "narcissism", key: "minus", textEn: "I hate being the center of attention.", textKo: "나는 주목받는 것이 싫다." },
  { factor: "narcissism", key: "plus", textEn: "Many group activities tend to be dull without me.", textKo: "내가 없는 집단 활동은 대체로 재미없다." },
  { factor: "narcissism", key: "plus", textEn: "I know that I am special because everyone keeps telling me so.", textKo: "나는 내가 특별하다는 것을 안다. 모두가 그렇게 말해주기 때문이다." },
  { factor: "narcissism", key: "plus", textEn: "I like to get acquainted with important people.", textKo: "나는 중요한 사람들과 친해지는 것을 좋아한다." },
  { factor: "narcissism", key: "minus", textEn: "I feel embarrassed if someone compliments me.", textKo: "누군가 나를 칭찬하면 창피하다." },
  { factor: "narcissism", key: "plus", textEn: "I have been compared to famous people.", textKo: "나는 유명인들과 비교된 적이 있다." },
  { factor: "narcissism", key: "minus", textEn: "I am an average person.", textKo: "나는 평범한 사람이다." },
  { factor: "narcissism", key: "plus", textEn: "I insist on getting the respect I deserve.", textKo: "나는 마땅히 받아야 할 존경을 요구한다." },

  // Psychopathy — P1-P9 (P2, P7 are reverse-scored)
  { factor: "psychopathy", key: "plus", textEn: "I like to get revenge on authorities.", textKo: "나는 권위자에게 복수하는 것을 좋아한다." },
  { factor: "psychopathy", key: "minus", textEn: "I avoid dangerous situations.", textKo: "나는 위험한 상황을 피한다." },
  { factor: "psychopathy", key: "plus", textEn: "Payback needs to be quick and nasty.", textKo: "복수는 빠르고 잔인해야 한다." },
  { factor: "psychopathy", key: "plus", textEn: "People often say I'm out of control.", textKo: "사람들은 내가 통제 불능이라고 말한다." },
  { factor: "psychopathy", key: "plus", textEn: "It's true that I can be mean to others.", textKo: "내가 다른 사람에게 비열할 수 있다는 것은 사실이다." },
  { factor: "psychopathy", key: "plus", textEn: "People who mess with me always regret it.", textKo: "나와 얽힌 사람들은 항상 후회한다." },
  { factor: "psychopathy", key: "minus", textEn: "I have never gotten into trouble with the law.", textKo: "나는 법적으로 문제를 일으킨 적이 없다." },
  { factor: "psychopathy", key: "plus", textEn: "I enjoy having sex with people I hardly know.", textKo: "나는 거의 모르는 사람과 성관계를 갖는 것을 즐긴다." },
  { factor: "psychopathy", key: "plus", textEn: "I'll say anything to get what I want.", textKo: "나는 내가 원하는 것을 얻기 위해서라면 뭐든 말한다." },
];

/** 1-based id를 붙여 고정된 ITEMS 배열을 만든다. */
export const ITEMS: readonly Item[] = Object.freeze(
  RAW_ITEMS.map((raw, index) =>
    Object.freeze({ ...raw, id: index + 1 }),
  ),
);

/** 3요인 정의. 각 요인별 문항 수와 원논문 알파값을 명시한다. */
export const FACTORS: readonly DarkTriadFactor[] = Object.freeze([
  "machiavellianism",
  "narcissism",
  "psychopathy",
]);

export const ITEMS_PER_FACTOR = 9 as const;

/** 원논문(Jones & Paulhus, 2014) 보고 내부일관성. 규준 빌드 시 ±0.05 이내 검증. */
export const PUBLISHED_ALPHAS: Readonly<Record<DarkTriadFactor, number>> = Object.freeze({
  machiavellianism: 0.77,
  narcissism: 0.74,
  psychopathy: 0.77,
});

export function itemsOfFactor(factor: DarkTriadFactor): readonly Item[] {
  return ITEMS.filter((item) => item.factor === factor);
}
