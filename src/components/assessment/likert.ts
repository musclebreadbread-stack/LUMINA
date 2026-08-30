/**
 * 네 개의 자기보고 척도(빅파이브·다크 트라이어드·EQ·애착)가 공유하는 5점 리커트 값.
 *
 * 엔진마다 같은 유니언을 따로 선언해 두었다 — 채점 규칙이 엔진에 속한다는 경계는 그대로 두고,
 * 화면 쪽에서만 쓰는 접점 타입을 여기 한 번 둔다. 구조가 같으므로 어느 엔진 값이든 그대로 오간다.
 */
export type LikertValue = 1 | 2 | 3 | 4 | 5;

export const LIKERT_VALUES: readonly LikertValue[] = Object.freeze([1, 2, 3, 4, 5]);

/**
 * 1점부터 5점까지의 척도 문구.
 *
 * 배열이 아니라 레코드로 못 박는다 — noUncheckedIndexedAccess 아래에서 배열 인덱싱은
 * 언제나 undefined를 달고 나오므로, 문구가 비어 버려도 타입이 잡아 주지 못한다.
 */
export type LikertScaleLabels = Readonly<Record<LikertValue, string>>;

/** 응답 지도. 아직 답하지 않은 문항은 키 자체가 없다. */
export type LikertResponses = Partial<Record<number, LikertValue>>;
