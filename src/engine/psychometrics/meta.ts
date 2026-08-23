import type { BigFiveFactor } from "./items";

/**
 * 요인별 표시 정보. 양끝을 우열이 아니라 서로 다른 경향으로 설명한다 —
 * "낮음/높음"이 아니라 "무엇에 가까운가"로 읽히게 하는 것이 목적이다.
 * 정서 안정성이 낮다는 결과가 곧 진단이 되지 않도록, 성향 문구로만 쓴다.
 */
export interface FactorMeta {
  readonly key: BigFiveFactor;
  readonly ko: string;
  readonly en: string;
  readonly lowGloss: string;
  readonly lowGlossEn: string;
  readonly highGloss: string;
  readonly highGlossEn: string;
}

export const FACTOR_META: Readonly<Record<BigFiveFactor, FactorMeta>> = Object.freeze({
  extraversion: Object.freeze({
    key: "extraversion",
    ko: "외향성",
    en: "Extraversion",
    lowGloss: "혼자 있는 시간에서 에너지를 얻는 경향",
    lowGlossEn: "A tendency to draw energy from time alone",
    highGloss: "사람들과 있을 때 에너지를 얻는 경향",
    highGlossEn: "A tendency to draw energy from being around people",
  }),
  agreeableness: Object.freeze({
    key: "agreeableness",
    ko: "우호성",
    en: "Agreeableness",
    lowGloss: "직설적이고 독립적으로 판단하는 경향",
    lowGlossEn: "A tendency to judge things directly and independently",
    highGloss: "타인의 입장을 먼저 헤아리는 경향",
    highGlossEn: "A tendency to consider others' perspectives first",
  }),
  conscientiousness: Object.freeze({
    key: "conscientiousness",
    ko: "성실성",
    en: "Conscientiousness",
    lowGloss: "유연하고 즉흥적으로 움직이는 경향",
    lowGlossEn: "A tendency to stay flexible and spontaneous",
    highGloss: "계획하고 체계를 세우는 경향",
    highGlossEn: "A tendency to plan ahead and build structure",
  }),
  emotionalStability: Object.freeze({
    key: "emotionalStability",
    ko: "정서 안정성",
    en: "Emotional Stability",
    lowGloss: "감정의 기복을 더 자주 느끼는 경향",
    lowGlossEn: "A tendency to feel emotional ups and downs more often",
    highGloss: "감정 기복 앞에서도 비교적 안정적인 경향",
    highGlossEn: "A tendency to stay relatively steady through emotional swings",
  }),
  intellect: Object.freeze({
    key: "intellect",
    ko: "개방성",
    en: "Openness",
    lowGloss: "익숙하고 구체적인 것을 선호하는 경향",
    lowGlossEn: "A preference for the familiar and the concrete",
    highGloss: "새로운 생각과 추상적 개념을 즐기는 경향",
    highGlossEn: "A tendency to enjoy new ideas and abstract concepts",
  }),
});
