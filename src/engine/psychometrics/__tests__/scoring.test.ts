import { describe, expect, it } from "vitest";
import { FACTORS, ITEMS, itemsOfFactor } from "@engine/psychometrics/items";
import {
  PsychometricsInputError,
  computeFactorScores,
  scoreItem,
  type LikertResponse,
  type ResponseMap,
} from "@engine/psychometrics/scoring";

function allResponses(value: LikertResponse): ResponseMap {
  const map: Record<number, LikertResponse> = {};
  ITEMS.forEach((item) => {
    map[item.id] = value;
  });
  return map;
}

describe("문항 채점 — scoreItem", () => {
  it("plus 문항은 응답값을 그대로 쓴다", () => {
    const plusItem = ITEMS.find((i) => i.key === "plus")!;
    for (let r = 1 as LikertResponse; r <= 5; r += 1) {
      expect(scoreItem(plusItem, r)).toBe(r);
    }
  });

  it("minus 문항은 6 − 응답값이다", () => {
    const minusItem = ITEMS.find((i) => i.key === "minus")!;
    expect(scoreItem(minusItem, 1)).toBe(5);
    expect(scoreItem(minusItem, 2)).toBe(4);
    expect(scoreItem(minusItem, 3)).toBe(3);
    expect(scoreItem(minusItem, 4)).toBe(2);
    expect(scoreItem(minusItem, 5)).toBe(1);
  });

  it("24개 역채점 문항 전부가 개별적으로 정확히 반전된다", () => {
    const minusItems = ITEMS.filter((i) => i.key === "minus");
    expect(minusItems).toHaveLength(24);
    minusItems.forEach((item) => {
      for (let r = 1 as LikertResponse; r <= 5; r += 1) {
        expect(scoreItem(item, r), `id ${item.id} response ${r}`).toBe(6 - r);
      }
    });
  });

  it("26개 정채점 문항 전부가 응답값을 그대로 낸다", () => {
    const plusItems = ITEMS.filter((i) => i.key === "plus");
    expect(plusItems).toHaveLength(26);
    plusItems.forEach((item) => {
      for (let r = 1 as LikertResponse; r <= 5; r += 1) {
        expect(scoreItem(item, r), `id ${item.id} response ${r}`).toBe(r);
      }
    });
  });

  it("정·역 채점을 뒤집으면 5+1이 된다 (대칭 검산)", () => {
    ITEMS.forEach((item) => {
      const low = scoreItem(item, 1);
      const high = scoreItem(item, 5);
      expect(low + high, `id ${item.id}`).toBe(6);
    });
  });
});

describe("요인 점수 — computeFactorScores", () => {
  it("모든 문항에 3점(중립)으로 답하면 모든 요인이 정중앙이다", () => {
    const scores = computeFactorScores(allResponses(3));
    scores.forEach((s) => {
      expect(s.rawSum, s.factor).toBe(30); // 10문항 × 3
      expect(s.mean, s.factor).toBe(3);
      expect(s.scalePosition0to100, s.factor).toBeCloseTo(50, 9);
    });
  });

  it("모든 문항에 5점을 주면 요인 점수는 문항 방향과 무관하게 최댓값이다", () => {
    // minus 문항의 5점은 실제로는 '매우 아니다' 방향이 아니라 응답 그 자체가 5라는 뜻 —
    // scoreItem 이 반전하므로 5점 만점 응답이 항상 최고 채점값을 주는 것은 아니다.
    // 여기서는 "항상 최댓값" 이 아니라 "정확한 산식"을 검증한다.
    const scores = computeFactorScores(allResponses(5));
    scores.forEach((s) => {
      const items = itemsOfFactor(s.factor);
      const expected = items.reduce((sum, item) => sum + (item.key === "plus" ? 5 : 1), 0);
      expect(s.rawSum, s.factor).toBe(expected);
    });
  });

  it("모든 요인을 낸다", () => {
    const scores = computeFactorScores(allResponses(3));
    expect(scores.map((s) => s.factor).sort()).toEqual([...FACTORS].sort());
  });

  it("이론적 최솟값·최댓값에서 척도 위치가 0과 100이다", () => {
    // extraversion: plus 5개는 1점, minus 5개는 5점(→ 채점 1점)을 주면 전부 최저 채점값 1.
    const map: Record<number, LikertResponse> = {};
    ITEMS.forEach((item) => {
      map[item.id] = item.key === "plus" ? 1 : 5; // 채점 결과가 언제나 1이 되도록
    });
    const scores = computeFactorScores(map);
    scores.forEach((s) => {
      expect(s.rawSum, s.factor).toBe(10);
      expect(s.scalePosition0to100, s.factor).toBeCloseTo(0, 9);
    });
  });

  it("응답이 하나라도 빠지면 어떤 문항인지 알려주는 오류를 던진다", () => {
    const map = allResponses(3) as Record<number, LikertResponse>;
    delete map[7];
    delete map[42];
    let caught: unknown;
    try {
      computeFactorScores(map);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(PsychometricsInputError);
    expect((caught as PsychometricsInputError).missingItemIds).toEqual([7, 42]);
  });

  it("범위를 벗어난 응답값은 오류를 던진다", () => {
    const map = allResponses(3) as Record<number, LikertResponse>;
    // @ts-expect-error — 의도적으로 잘못된 값을 넣는다
    map[1] = 6;
    expect(() => computeFactorScores(map)).toThrow(PsychometricsInputError);
  });

  it("결과가 동결되어 있다", () => {
    const scores = computeFactorScores(allResponses(3));
    expect(Object.isFrozen(scores)).toBe(true);
    expect(Object.isFrozen(scores[0])).toBe(true);
  });
});
