/**
 * 인지능력 탐색의 출처·규준 부재를 코드에 명시적으로 남기는 곳.
 *
 * norms.ts를 만들지 않은 것은 실수가 아니라 결정이다. 규준 표본이 없으므로 백분위·z점수·T점수·
 * IQ 환산치를 낼 근거가 없고, 그 사실을 파일 하나로 못 박아 둔다.
 * 나중에 누군가 "백분위 정도는 넣자"고 할 때 이 상수가 그 대화를 먼저 시작하게 만든다.
 */

/** 문항이 어디서 왔는지. ICAR 라이선스를 확보하면 이 값과 items.ts의 데이터만 함께 바뀐다. */
export const ITEM_PROVENANCE = Object.freeze({
  /** 따르는 것: ICAR의 4개 문항 형식 분류. 쓰지 않는 것: ICAR의 실제 문항. */
  formatTaxonomy: "ICAR (International Cognitive Ability Resource), Condon & Revelle (2014)",
  /** 문항 본문의 저자. 원문 문항을 기억에서 복원해 옮겨 적지 않았다. */
  itemAuthor: "LUMINA (original items written in ICAR-style formats)",
  usesPublishedItems: false,
  reason:
    "ICAR figural items are diagrams, not text, and cannot be reproduced accurately from memory. " +
    "Writing original items and then attaching ICAR norms would be a silent overclaim, so both the " +
    "items and the absence of norms are stated openly.",
  licenseStatus: "not-required-for-original-items",
} as const);

/**
 * 규준 표본이 없다는 사실 자체. reportedMetrics 밖의 값은 이 검사에서 만들어 내지 않는다.
 * withheldMetrics는 "아직 계산하지 않은 값"이 아니라 "계산할 근거가 없는 값"이다.
 */
export const COGNITIVE_NORM_ABSENCE = Object.freeze({
  hasNormSample: false,
  normSource: null,
  reason:
    "The items are LUMINA-authored, so no published sample has ever answered them. A percentile " +
    "derived from a sample that answered different questions would not describe this respondent.",
  /** 이 검사가 실제로 보고하는 지표. */
  reportedMetrics: Object.freeze([
    "per-domain correct count",
    "per-domain accuracy (0-100)",
    "overall correct count",
    "overall accuracy (0-100)",
    "elapsed time (client-measured, descriptive only)",
  ]),
  /** 근거가 없어 보고하지 않는 지표. 이 목록은 줄이지 않는다. */
  withheldMetrics: Object.freeze([
    "percentile",
    "z-score",
    "T-score",
    "IQ-equivalent",
    "deviation IQ",
    "ability rank",
  ]),
} as const);

/**
 * 정답 키가 클라이언트 번들에 들어 있다는 사실. 백엔드가 없는 구조에서는 피할 수 없다.
 * 숨기는 대신 결과 화면이 이 사실을 담담하게 한 문장으로 말하게 한다.
 */
export const ANSWER_KEY_EXPOSURE = Object.freeze({
  keysShipToClient: true,
  reason:
    "LUMINA has no backend, so the answer key is part of the downloaded bundle. The result is only " +
    "meaningful if the assessment was taken unaided.",
} as const);
