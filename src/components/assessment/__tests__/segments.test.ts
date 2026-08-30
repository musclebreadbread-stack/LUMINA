import { describe, expect, it } from "vitest";
import { buildSegments, type SegmentSource } from "../segments";
import type { LikertResponses, LikertValue } from "../likert";

interface TestItem {
  readonly id: number;
  readonly reverse: boolean;
}

const SOURCES: readonly SegmentSource<TestItem>[] = [
  {
    key: "alpha",
    label: "Alpha",
    items: [
      { id: 1, reverse: false },
      { id: 2, reverse: true },
    ],
  },
  { key: "beta", label: "Beta", items: [{ id: 3, reverse: false }] },
];

/** 엔진의 역채점 규칙을 그대로 흉내 낸 채점 함수. */
function scoreItem(item: TestItem, value: LikertValue): number {
  return item.reverse ? 6 - value : value;
}

describe("buildSegments", () => {
  it("아직 아무 문항도 답하지 않은 묶음의 평균은 null이다", () => {
    const segments = buildSegments(SOURCES, {}, scoreItem);

    expect(segments.map((segment) => segment.mean)).toEqual([null, null]);
    expect(segments.map((segment) => segment.answered)).toEqual([0, 0]);
    expect(segments.map((segment) => segment.total)).toEqual([2, 1]);
  });

  it("답한 문항만으로 평균을 내되 역채점 규칙은 채점 함수에 맡긴다", () => {
    const responses: LikertResponses = { 1: 5, 2: 5, 3: 2 };

    const segments = buildSegments(SOURCES, responses, scoreItem);

    // alpha: 5점 그대로 + 역채점 5→1 = 평균 3.0
    expect(segments[0]).toEqual({ key: "alpha", label: "Alpha", answered: 2, total: 2, mean: 3 });
    expect(segments[1]).toEqual({ key: "beta", label: "Beta", answered: 1, total: 1, mean: 2 });
  });

  it("일부만 답했으면 답한 문항 수로만 나눈다", () => {
    const segments = buildSegments(SOURCES, { 1: 4 }, scoreItem);

    expect(segments[0]?.answered).toBe(1);
    expect(segments[0]?.mean).toBe(4);
  });

  it("응답 지도에 있는 다른 문항 번호는 묶음 평균에 섞이지 않는다", () => {
    const segments = buildSegments(SOURCES, { 3: 1, 99: 5 }, scoreItem);

    expect(segments[0]?.mean).toBeNull();
    expect(segments[1]?.mean).toBe(1);
  });
});
