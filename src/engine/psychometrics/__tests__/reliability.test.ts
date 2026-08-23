import { describe, expect, it } from "vitest";
import { ITEMS, itemsOfFactor } from "@engine/psychometrics/items";
import {
  ReliabilityInputError,
  computeFactorAlphas,
  cronbachAlpha,
} from "@engine/psychometrics/reliability";
import type { LikertResponse, ResponseMap } from "@engine/psychometrics/scoring";

describe("cronbachAlpha — 손으로 검산 가능한 경계 사례", () => {
  it("모든 문항이 완전히 같은 값이면(=완전 상관) α = 1이다", () => {
    // 4명의 응답자, 3문항 모두 응답자별로 완전히 동일한 값을 준다.
    const respondents = [2, 4, 1, 5];
    const items = [respondents, respondents, respondents];
    expect(cronbachAlpha(items)).toBeCloseTo(1, 9);
  });

  it("문항끼리 완전히 무상관이면(직교) α = 0이다", () => {
    // 손으로 구성한 직교 사례: 평균에서 편차가 서로 수직인 두 문항.
    // A = [2,2,4,4] (평균 3, 편차 [-1,-1,1,1])
    // B = [2,4,2,4] (평균 3, 편차 [-1,1,-1,1])
    // 편차의 내적 = 1-1-1+1 = 0 → 무상관
    const A = [2, 2, 4, 4];
    const B = [2, 4, 2, 4];
    expect(cronbachAlpha([A, B])).toBeCloseTo(0, 9);
  });

  it("문항이 2개 미만이거나 응답자가 2명 미만이면 오류를 던진다", () => {
    expect(() => cronbachAlpha([[1, 2, 3]])).toThrow(ReliabilityInputError);
    expect(() => cronbachAlpha([[1], [2]])).toThrow(ReliabilityInputError);
  });

  it("문항마다 응답자 수가 다르면 오류를 던진다", () => {
    expect(() => cronbachAlpha([[1, 2, 3], [1, 2]])).toThrow(ReliabilityInputError);
  });

  it("총점 분산이 0이면(전원 동일 총점) 0을 낸다 (0으로 나누지 않는다)", () => {
    // A+B 가 항상 같은 값이 되도록 서로 반대로 움직이게 구성.
    const A = [1, 2, 3, 4];
    const B = [4, 3, 2, 1]; // A+B = 5,5,5,5 → 총점 분산 0
    expect(cronbachAlpha([A, B])).toBe(0);
  });
});

describe("computeFactorAlphas — 역채점이 실제로 반영되는지 검증", () => {
  /**
   * 노이즈 없는 가상 외향성 응답자 5명을 만든다. 각자 '진짜 외향성 수준' t(1~5)를
   * 갖고, plus 문항엔 t로, minus 문항엔 그 반대인 (6−t)로 답하게 한다 — 실제로
   * 외향적인 사람은 "나는 파티의 중심"에는 그렇다고, "나는 말수가 적다"에는
   * 아니라고 답하는 것과 같은 모양이다.
   *
   * 역채점이 코드에서 제대로 적용되면 열 문항 모두 t로 수렴해 상관이 완전해지고
   * α 는 1에 가까워야 한다. 역채점을 빠뜨리면(원 응답을 그대로 썼다면) minus
   * 문항이 plus 문항과 반대로 움직여 α 가 크게 낮아지므로, 이 테스트는 역채점
   * 로직이 실제로 신뢰도 계산 경로에 물려 있는지를 잡아낸다.
   */
  it("역채점이 적용되면 노이즈 없는 데이터에서 α 가 1에 가깝다", () => {
    const extraversionItems = itemsOfFactor("extraversion");
    const extraversionIds = new Set(extraversionItems.map((i) => i.id));
    const traitLevels: LikertResponse[] = [1, 2, 3, 4, 5];

    // computeFactorAlphas 는 50문항 전체 응답을 요구한다. 다른 요인 40문항은
    // 이 테스트와 무관하므로 중립값(3)으로 채우고, 외향성 10문항만 의도한
    // 패턴(진짜 성향 t + 역채점 대칭)을 따르게 한다.
    const dataset: ResponseMap[] = traitLevels.map((t) => {
      const responses: Record<number, LikertResponse> = {};
      ITEMS.forEach((item) => {
        if (!extraversionIds.has(item.id)) {
          responses[item.id] = 3;
          return;
        }
        responses[item.id] = item.key === "plus" ? t : ((6 - t) as LikertResponse);
      });
      return responses;
    });

    const [extraversionAlpha] = computeFactorAlphas(dataset).filter(
      (r) => r.factor === "extraversion",
    );
    expect(extraversionAlpha!.alpha).toBeGreaterThan(0.99);
    expect(extraversionAlpha!.itemCount).toBe(10);
    expect(extraversionAlpha!.respondentCount).toBe(5);
  });

  it("응답자가 2명 미만이면 오류를 던진다", () => {
    expect(() => computeFactorAlphas([{}])).toThrow(ReliabilityInputError);
  });

  it("5개 요인 전부에 대해 α 를 낸다", () => {
    const extraversionItems = itemsOfFactor("extraversion");
    void extraversionItems;
    const dataset: ResponseMap[] = [1, 3, 5, 2, 4].map((t) => {
      const responses: Record<number, LikertResponse> = {};
      for (let id = 1; id <= 50; id += 1) {
        responses[id] = t as LikertResponse;
      }
      return responses;
    });
    const results = computeFactorAlphas(dataset);
    expect(results).toHaveLength(5);
  });
});
