import { describe, expect, it } from "vitest";
import { ITEMS } from "@engine/eq/items";
import type { LikertResponse, ResponseMap } from "@engine/eq/scoring";
import { buildEqView } from "@/lib/eqModel";

function uniformResponses(value: LikertResponse): ResponseMap {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value])) as ResponseMap;
}

describe("eq view", () => {
  it("labels every subscale in both locales and reports the total as the headline score", () => {
    const view = buildEqView(uniformResponses(3));

    expect(view.itemCount).toBe(33);
    expect(view.factors).toHaveLength(4);
    for (const factor of view.factors) {
      expect(factor.ko.trim()).not.toBe("");
      expect(factor.en.trim()).not.toBe("");
      expect(factor.descriptionKo.trim()).not.toBe("");
      expect(factor.descriptionEn.trim()).not.toBe("");
    }
    // 역채점 3문항도 3점이면 3점 그대로라 총점은 33 × 3 이 된다.
    expect(view.total.rawSum).toBe(99);
    expect(view.total.norm).not.toBeNull();
  });

  it("leaves subscale norms empty because no published subscale statistics exist", () => {
    const view = buildEqView(uniformResponses(4));

    for (const factor of view.factors) {
      expect(factor.norm).toBeNull();
    }
  });

  it("picks the dominant subscale by scale position, not by raw sum", () => {
    // 요인별 문항 수가 10/9/8/6으로 달라 원점수 1위와 상대 위치 1위가 갈릴 수 있다.
    // 6문항짜리 정서 활용에 만점을 주면 상대 위치는 100%지만 원점수(30)는 10문항짜리
    // 정서 인식(38)보다 낮다 — 이 상황에서 어느 축으로 고르는지가 드러난다.
    const responses = Object.fromEntries(
      ITEMS.map((item) => {
        if (item.factor === "utilisationOfEmotion") return [item.id, 5];
        if (item.factor === "perceptionOfEmotion") return [item.id, item.key === "plus" ? 4 : 3];
        return [item.id, 2];
      }),
    ) as ResponseMap;

    const view = buildEqView(responses);
    const byRawSum = [...view.factors].sort((left, right) => right.rawSum - left.rawSum)[0];

    expect(view.dominantFactor).toBe("utilisationOfEmotion");
    expect(byRawSum?.key).toBe("perceptionOfEmotion");
  });
});
