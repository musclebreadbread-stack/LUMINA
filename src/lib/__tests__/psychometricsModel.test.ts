import { describe, expect, it } from "vitest";
import { ITEMS } from "@engine/psychometrics/items";
import type { LikertResponse, ResponseMap } from "@engine/psychometrics/scoring";
import { buildBigFiveView } from "@/lib/psychometricsModel";

function uniformResponses(value: LikertResponse): ResponseMap {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value])) as ResponseMap;
}

describe("big five view", () => {
  it("reports one image per factor and a profile explanation", () => {
    const view = buildBigFiveView(uniformResponses(3));

    expect(view.itemCount).toBe(50);
    expect(view.factors).toHaveLength(5);
    for (const factor of view.factors) {
      expect(factor.imageSrc).toContain("psychometrics/factors");
    }
  });

  it("picks the dominant factor by norm z-score, not by array order", () => {
    // 다섯 요인 전부 문항이 10개씩이라 원점수·척도위치는 응답이 같으면 항상 같다.
    // 그래도 규준 평균·표준편차가 요인마다 달라 같은 원점수(30)에서도 z점수는 갈린다 —
    // 이 상황에서 항상 첫 요인(외향성)만 고르던 예전 버그였다면 여기서도 우연히
    // 맞았을 것이므로, 아래 두 번째 사례로 배열 순서에 기대지 않는지 별도 확인한다.
    const view = uniformResponsesView(3);
    expect(view.dominantFactor).toBe("extraversion");
  });

  it("does not default to the first factor when a later factor is actually dominant", () => {
    // 지적 개방성(intellect)은 배열의 마지막 요인이다. 요인마다 절반은 역채점(minus)
    // 문항이라(scoreItem: "6 − 응답") 요인 점수를 최대·최소로 밀려면 응답 방향을
    // 문항 키에 맞춰 뒤집어야 한다. 이렇게 지적 개방성만 만점, 나머지는 전부
    // 최저점을 주면 z점수 기준 지적 개방성이 확실히 앞선다 — "항상 factors[0]
    // (외향성)을 표지로 쓰던" 예전 버그를 회귀 테스트로 잡아낸다.
    const responses = Object.fromEntries(
      ITEMS.map((item) => {
        const maximize = item.factor === "intellect";
        const scoreHigh = item.key === "plus" ? 5 : 1;
        const scoreLow = item.key === "plus" ? 1 : 5;
        return [item.id, maximize ? scoreHigh : scoreLow];
      }),
    ) as ResponseMap;

    const view = buildBigFiveView(responses);

    expect(view.dominantFactor).toBe("intellect");
    const dominant = view.factors.find((f) => f.key === view.dominantFactor);
    expect(dominant?.norm?.zScore).toBeGreaterThan(
      view.factors.find((f) => f.key === "extraversion")?.norm?.zScore ?? Infinity,
    );
  });
});

function uniformResponsesView(value: LikertResponse) {
  return buildBigFiveView(uniformResponses(value));
}
