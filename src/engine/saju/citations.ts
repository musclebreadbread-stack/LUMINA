import type { Citation } from "@engine/shared/citation";

/**
 * 사주 계산과 전통 해석을 구분해 표시하기 위한 참고문헌 묶음.
 * 고전 문헌 표지는 특정 문장을 직역했다는 뜻이 아니라, 해석 용어의 역사적 계보를
 * 안내하는 표지다. 실제 계산은 아래의 공개 계산 라이브러리와 이 프로젝트의 규칙을 따른다.
 */
export const ASTRONOMY_ENGINE: Citation = Object.freeze({
  authors: ["R. M. Sinnott"],
  year: 2024,
  title: "Astronomy Engine: high-precision astronomy library",
  venue: "GitHub repository",
  url: "https://github.com/cosinekitty/astronomy",
});

export const MEEUS_1998: Citation = Object.freeze({
  authors: ["Meeus, J."],
  year: 1998,
  title: "Astronomical algorithms (2nd ed.)",
  venue: "Willmann-Bell",
});

export const LUNAR_JAVASCRIPT: Citation = Object.freeze({
  authors: ["6tail"],
  year: 2024,
  title: "lunar-javascript: Chinese calendar and BaZi calculation library",
  venue: "GitHub repository",
  url: "https://github.com/6tail/lunar-javascript",
});

export const CLASSICAL_BAZI_LINEAGE: readonly Citation[] = Object.freeze([
  Object.freeze({
    authors: ["Classical BaZi tradition"],
    year: 1200,
    title: "Yuan Hai Zi Ping (淵海子平)",
    venue: "Historical text lineage marker",
  }),
  Object.freeze({
    authors: ["Wan, M. Y."],
    year: 1583,
    title: "San Ming Tong Hui (三命通會)",
    venue: "Historical text lineage marker",
  }),
  Object.freeze({
    authors: ["Classical BaZi tradition"],
    year: 1700,
    title: "Di Tian Sui (滴天髓)",
    venue: "Historical text lineage marker",
  }),
  Object.freeze({
    authors: ["Classical BaZi tradition"],
    year: 1700,
    title: "Qiong Tong Bao Jian (窮通寶鑑)",
    venue: "Historical text lineage marker",
  }),
]);

export const SAJU_CALCULATION_CITATIONS: readonly Citation[] = Object.freeze([
  ASTRONOMY_ENGINE,
  MEEUS_1998,
  LUNAR_JAVASCRIPT,
]);

export const SAJU_TRADITION_CITATIONS: readonly Citation[] = Object.freeze([
  ...CLASSICAL_BAZI_LINEAGE,
]);

export const SAJU_CITATIONS: readonly Citation[] = Object.freeze([
  ...SAJU_CALCULATION_CITATIONS,
  ...SAJU_TRADITION_CITATIONS,
]);
