import type { Citation } from "@engine/shared/citation";

/**
 * 인지능력 탐색이 기대는 문헌.
 *
 * 주의: 아래 문헌들은 이 검사가 따르는 **문항 형식**의 출처다. 문항 자체의 출처가 아니다.
 * LUMINA의 16문항은 자체 작성이므로 이 연구들의 규준·타당도 근거는 그대로 적용되지 않는다.
 */

/** ICAR의 네 가지 문항 형식 분류를 제시한 논문. 우리는 형식만 따르고 문항은 쓰지 않는다. */
export const CONDON_REVELLE_2014: Citation = Object.freeze({
  authors: Object.freeze(["Condon, D. M.", "Revelle, W."]),
  year: 2014,
  title:
    "The International Cognitive Ability Resource: Development and initial validation of a public-domain measure",
  venue: "Intelligence, 43, 52-64",
  url: "https://doi.org/10.1016/j.intell.2014.01.004",
});

/** 행렬 추론 형식의 기원. */
export const RAVEN_1938: Citation = Object.freeze({
  authors: Object.freeze(["Raven, J. C."]),
  year: 1938,
  title: "Progressive Matrices: A perceptual test of intelligence",
  venue: "H. K. Lewis, London",
});

/** 3차원 회전 형식의 기원. */
export const SHEPARD_METZLER_1971: Citation = Object.freeze({
  authors: Object.freeze(["Shepard, R. N.", "Metzler, J."]),
  year: 1971,
  title: "Mental rotation of three-dimensional objects",
  venue: "Science, 171(3972), 701-703",
  url: "https://doi.org/10.1126/science.171.3972.701",
});

export const COGNITIVE_CITATIONS: readonly Citation[] = Object.freeze([
  CONDON_REVELLE_2014,
  RAVEN_1938,
  SHEPARD_METZLER_1971,
]);
