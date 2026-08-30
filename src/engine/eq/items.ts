/**
 * SSEIT (Schutte Self-Report Emotional Intelligence Test) — Schutte et al. (1998)의 33문항 정서지능 척도.
 *
 * 원문 출처: Schutte, N. S., Malouff, J. M., Hall, L. E., Haggerty, D. J., Cooper, J. T.,
 * Golden, C. J., & Dornheim, L. (1998). Development and validation of a measure of emotional
 * intelligence. Personality and Individual Differences, 25(2), 167–177.
 * 이 척도는 Salovey & Mayer(1990)의 정서지능 모형을 문항으로 조작화한 것이다.
 *
 * 요인 구조는 Ciarrochi, Chan & Bajgar(2001)의 4요인 해를 채택했다 —
 * SSEIT 문헌에서 가장 널리 인용되는 요인 구조다.
 * 다만 원저자들은 단일 총점을 전제로 척도를 개발했다. 따라서 **총점이 1차 지표**이고
 * 4개 하위요인은 보조 지표다 — 하위요인만 떼어 단독으로 해석하면 원척도의 근거를 넘어선다.
 *
 * 문항 번호는 원문 번호를 그대로 유지한다. 역채점 문항이 문헌에서 "5, 28, 33번"으로 고정 인용되기 때문에,
 * 다크 트라이어드처럼 요인별로 묶어 재번호를 매기면 문헌과 대조가 불가능해진다.
 * 그래서 RAW_ITEMS는 요인 순서가 아니라 원문 문항 순서를 따른다.
 *
 * 5점 Likert(1=전혀 그렇지 않다 ~ 5=매우 그렇다). 역채점 문항은 key="minus"로 표시하고 (6 − 응답값)을 적용한다.
 * 요인별 문항 수가 10/9/8/6으로 서로 다르므로 상수 하나로 나눌 수 없다 — 항상 데이터에서 세어 쓴다.
 *
 * 한국어 문항은 자체 번역이다. 공식 한국어판 검증 절차를 거치지 않았으므로
 * 카탈로그에서는 translation-not-validated로 표기된다.
 */

export type EqFactor =
  | "perceptionOfEmotion"
  | "managingOwnEmotions"
  | "managingOthersEmotions"
  | "utilisationOfEmotion";

/** plus = 응답값 그대로 채점. minus = 역채점(6 − 응답값). */
export type ItemKey = "plus" | "minus";

export interface Item {
  readonly id: number; // 1~33, 원문 문항 번호와 동일하게 고정
  readonly factor: EqFactor;
  readonly key: ItemKey;
  readonly textEn: string;
  readonly textKo: string;
}

interface RawItem {
  readonly factor: EqFactor;
  readonly key: ItemKey;
  readonly textEn: string;
  readonly textKo: string;
}

/** 원문 1~33번 순서. 배열 인덱스 + 1 이 곧 출판된 문항 번호가 되도록 순서를 절대 바꾸지 않는다. */
const RAW_ITEMS: readonly RawItem[] = [
  { factor: "managingOthersEmotions", key: "plus", textEn: "I know when to speak about my personal problems to others.", textKo: "나는 내 개인적인 고민을 언제 다른 사람에게 이야기해야 할지 안다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "When I am faced with obstacles, I remember times I faced similar obstacles and overcame them.", textKo: "어려움에 부딪히면 비슷한 어려움을 이겨냈던 때를 떠올린다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "I expect that I will do well on most things I try.", textKo: "나는 내가 시도하는 대부분의 일을 잘해낼 것이라고 기대한다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "Other people find it easy to confide in me.", textKo: "다른 사람들은 나에게 속마음을 털어놓기 편해한다." },
  { factor: "perceptionOfEmotion", key: "minus", textEn: "I find it hard to understand the non-verbal messages of other people.", textKo: "나는 다른 사람의 비언어적 신호를 이해하기 어렵다." },
  { factor: "utilisationOfEmotion", key: "plus", textEn: "Some of the major events of my life have led me to re-evaluate what is important and not important.", textKo: "내 인생의 큰 사건들을 겪으며 무엇이 중요하고 중요하지 않은지 다시 생각하게 되었다." },
  { factor: "utilisationOfEmotion", key: "plus", textEn: "When my mood changes, I see new possibilities.", textKo: "기분이 달라지면 새로운 가능성이 보인다." },
  { factor: "utilisationOfEmotion", key: "plus", textEn: "Emotions are one of the things that make my life worth living.", textKo: "감정은 내 삶을 살 만하게 만드는 것들 중 하나다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I am aware of my emotions as I experience them.", textKo: "나는 감정을 느끼는 그 순간에 그 감정을 알아차린다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "I expect good things to happen.", textKo: "나는 좋은 일이 생길 것이라고 기대한다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "I like to share my emotions with others.", textKo: "나는 내 감정을 다른 사람과 나누는 것을 좋아한다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "When I experience a positive emotion, I know how to make it last.", textKo: "긍정적인 감정을 느낄 때 나는 그것을 오래 유지하는 방법을 안다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "I arrange events others enjoy.", textKo: "나는 다른 사람들이 즐거워할 자리를 잘 마련한다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "I seek out activities that make me happy.", textKo: "나는 나를 행복하게 하는 활동을 찾아 나선다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I am aware of the non-verbal messages I send to others.", textKo: "나는 내가 다른 사람에게 보내는 비언어적 신호를 알아차린다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "I present myself in a way that makes a good impression on others.", textKo: "나는 다른 사람에게 좋은 인상을 주는 방식으로 나를 드러낸다." },
  { factor: "utilisationOfEmotion", key: "plus", textEn: "When I am in a positive mood, solving problems is easy for me.", textKo: "기분이 좋을 때는 문제를 푸는 일이 쉽게 느껴진다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "By looking at their facial expressions, I recognize the emotions people are experiencing.", textKo: "나는 표정만 봐도 그 사람이 어떤 감정을 느끼는지 알아본다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I know why my emotions change.", textKo: "나는 내 감정이 왜 바뀌는지 안다." },
  { factor: "utilisationOfEmotion", key: "plus", textEn: "When I am in a positive mood, I am able to come up with new ideas.", textKo: "기분이 좋을 때 나는 새로운 아이디어를 잘 떠올린다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "I have control over my emotions.", textKo: "나는 내 감정을 조절할 수 있다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I easily recognize my emotions as I experience them.", textKo: "나는 감정을 느끼는 순간 그 감정을 쉽게 알아차린다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "I motivate myself by imagining a good outcome to tasks I take on.", textKo: "나는 맡은 일이 좋은 결과로 이어지는 모습을 그리며 스스로를 북돋운다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "I compliment others when they have done something well.", textKo: "나는 다른 사람이 잘했을 때 칭찬해 준다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I am aware of the non-verbal messages other people send.", textKo: "나는 다른 사람이 보내는 비언어적 신호를 알아차린다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "When another person tells me about an important event in his or her life, I almost feel as though I have experienced this event myself.", textKo: "누군가 자기 인생의 중요한 사건을 이야기하면 나는 그 일을 직접 겪은 것처럼 느껴진다." },
  { factor: "utilisationOfEmotion", key: "plus", textEn: "When I feel a change in emotions, I tend to come up with new ideas.", textKo: "감정이 달라지는 것을 느낄 때 나는 새로운 아이디어를 떠올리곤 한다." },
  { factor: "managingOwnEmotions", key: "minus", textEn: "When I am faced with a challenge, I give up because I believe I will fail.", textKo: "나는 어려운 일에 부딪히면 실패할 것 같아 포기한다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I know what other people are feeling just by looking at them.", textKo: "나는 다른 사람을 보기만 해도 그 사람이 무엇을 느끼는지 안다." },
  { factor: "managingOthersEmotions", key: "plus", textEn: "I help other people feel better when they are down.", textKo: "나는 기운이 없는 사람의 기분이 나아지도록 돕는다." },
  { factor: "managingOwnEmotions", key: "plus", textEn: "I use good moods to help myself keep trying in the face of obstacles.", textKo: "나는 좋은 기분을 활용해 어려움 앞에서도 계속 시도한다." },
  { factor: "perceptionOfEmotion", key: "plus", textEn: "I can tell how people are feeling by listening to the tone of their voice.", textKo: "나는 목소리 톤만 들어도 그 사람의 기분을 알 수 있다." },
  { factor: "perceptionOfEmotion", key: "minus", textEn: "It is difficult for me to understand why people feel the way they do.", textKo: "나는 사람들이 왜 그렇게 느끼는지 이해하기 어렵다." },
];

/** 1-based id를 붙여 고정된 ITEMS 배열을 만든다. id는 원문 문항 번호와 1:1로 일치한다. */
export const ITEMS: readonly Item[] = Object.freeze(
  RAW_ITEMS.map((raw, index) =>
    Object.freeze({ ...raw, id: index + 1 }),
  ),
);

/** Ciarrochi et al.(2001) 4요인. 논문의 요인 번호 순서(1~4)를 그대로 따른다. */
export const FACTORS: readonly EqFactor[] = Object.freeze([
  "perceptionOfEmotion",
  "managingOwnEmotions",
  "managingOthersEmotions",
  "utilisationOfEmotion",
]);

export const TOTAL_ITEM_COUNT = 33 as const;

/**
 * 역채점 문항 번호. 문헌에 "5, 28, 33"으로 고정 보고된 값이며,
 * ITEMS의 key="minus"와 어긋나면 척도가 조용히 망가지므로 테스트에서 양쪽을 대조한다.
 */
export const REVERSE_SCORED_ITEM_IDS: readonly number[] = Object.freeze([5, 28, 33]);

export function itemsOfFactor(factor: EqFactor): readonly Item[] {
  return ITEMS.filter((item) => item.factor === factor);
}

/**
 * 요인별 문항 수는 10/9/8/6으로 균등하지 않다 — 상수를 두면 요인을 바꿀 때 조용히 틀리므로
 * 반드시 ITEMS에서 세어 만든다.
 */
export const ITEM_COUNT_BY_FACTOR: Readonly<Record<EqFactor, number>> = Object.freeze(
  FACTORS.reduce<Record<EqFactor, number>>(
    (counts, factor) => ({ ...counts, [factor]: itemsOfFactor(factor).length }),
    {
      perceptionOfEmotion: 0,
      managingOwnEmotions: 0,
      managingOthersEmotions: 0,
      utilisationOfEmotion: 0,
    },
  ),
);
