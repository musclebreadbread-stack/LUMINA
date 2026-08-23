/** 수비학(Numerology) 기본 상수 — 피타고라스 문자값, 마스터 넘버, 숫자별 경향. */

/** 11·22·33 — 더 줄이지 않고 그대로 두는 세 마스터 넘버. */
export const MASTER_NUMBERS: readonly number[] = Object.freeze([11, 22, 33]);

/**
 * 피타고라스 문자표. A~Z를 1~9에 3개씩(9만 2개) 배정한다.
 * 로마자 이름에만 적용된다 — 한글·한자 이름은 계산에서 제외된다.
 */
export const LETTER_VALUES: Readonly<Record<string, number>> = Object.freeze({
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9,
});

export interface NumberMeaning {
  readonly value: number;
  readonly isMaster: boolean;
  readonly ko: string;
  readonly en: string;
  readonly keywords: readonly string[];
  readonly keywordsEn: readonly string[];
  /** 한 줄 경향 — 단정하지 않는다. */
  readonly gloss: string;
  readonly glossEn: string;
}

const MEANING_DATA: readonly (readonly [
  number,
  string,
  string,
  readonly string[],
  readonly string[],
  string,
  string,
])[] = [
  [1, "하나", "One", ["리더십", "독립"], ["Leadership", "Independence"], "스스로 길을 여는 경향", "A tendency to open its own path."],
  [2, "둘", "Two", ["협력", "조화"], ["Cooperation", "Harmony"], "관계 속에서 균형을 찾는 경향", "A tendency to find balance within relationships."],
  [3, "셋", "Three", ["표현", "창의"], ["Expression", "Creativity"], "생각을 겉으로 꺼내는 경향", "A tendency to bring thoughts out into the open."],
  [4, "넷", "Four", ["체계", "근면"], ["Structure", "Diligence"], "단단하게 쌓아 올리는 경향", "A tendency to build things up solidly."],
  [5, "다섯", "Five", ["자유", "변화"], ["Freedom", "Change"], "새로운 경험을 향해 움직이는 경향", "A tendency to move toward new experiences."],
  [6, "여섯", "Six", ["책임", "돌봄"], ["Responsibility", "Care"], "주변을 챙기는 경향", "A tendency to look after those nearby."],
  [7, "일곱", "Seven", ["탐구", "성찰"], ["Inquiry", "Reflection"], "질문을 파고드는 경향", "A tendency to dig deep into questions."],
  [8, "여덟", "Eight", ["성취", "실행력"], ["Achievement", "Execution"], "결과를 만들어 내는 경향", "A tendency to turn effort into results."],
  [9, "아홉", "Nine", ["이상", "포용"], ["Idealism", "Inclusiveness"], "넓게 품는 경향", "A tendency to embrace things broadly."],
  [11, "마스터 11", "Master Eleven", ["통찰", "영감"], ["Insight", "Inspiration"], "직관이 예민한 경향", "A tendency toward sharp intuition."],
  [22, "마스터 22", "Master Twenty-Two", ["실현력", "설계"], ["Realization", "Vision"], "큰 그림을 현실로 옮기는 경향", "A tendency to turn a large vision into reality."],
  [33, "마스터 33", "Master Thirty-Three", ["헌신", "가르침"], ["Devotion", "Teaching"], "돌봄을 널리 베푸는 경향", "A tendency to extend care widely to others."],
];

export const NUMBER_MEANINGS: readonly NumberMeaning[] = Object.freeze(
  MEANING_DATA.map(([value, ko, en, keywords, keywordsEn, gloss, glossEn]) =>
    Object.freeze({
      value,
      isMaster: MASTER_NUMBERS.includes(value),
      ko,
      en,
      keywords: Object.freeze([...keywords]),
      keywordsEn: Object.freeze([...keywordsEn]),
      gloss,
      glossEn,
    }),
  ),
);

export function meaningOf(value: number): NumberMeaning {
  const m = NUMBER_MEANINGS.find((x) => x.value === value);
  if (!m) throw new RangeError(`no meaning defined for number: ${value}`);
  return m;
}
