import { describe, expect, it } from "vitest";
import { FACTOR_META } from "@engine/psychometrics/meta";
import { ITEMS } from "@engine/psychometrics/items";
import { computeBigFive } from "@engine/psychometrics";
import type { LikertResponse } from "@engine/psychometrics/scoring";

function neutralResponses(): Record<number, LikertResponse> {
  const map: Record<number, LikertResponse> = {};
  ITEMS.forEach((item) => {
    map[item.id] = 3;
  });
  return map;
}

describe("요인 표시 정보", () => {
  it("5개 요인 모두 저·고 양끝 설명을 갖는다", () => {
    Object.values(FACTOR_META).forEach((m) => {
      expect(m.lowGloss.length).toBeGreaterThan(4);
      expect(m.highGloss.length).toBeGreaterThan(4);
      expect(m.lowGloss).not.toBe(m.highGloss);
    });
  });

  it("양끝 설명에 우열 표현을 쓰지 않는다", () => {
    const banned = ["좋음", "나쁨", "우수", "열등", "부족"];
    Object.values(FACTOR_META).forEach((m) => {
      banned.forEach((word) => {
        expect(m.lowGloss.includes(word), `${m.key} low: ${word}`).toBe(false);
        expect(m.highGloss.includes(word), `${m.key} high: ${word}`).toBe(false);
      });
    });
  });
});

describe("Big Five 통합 산출", () => {
  it("과학적 검증 계층으로 태깅된다 (플랫폼에서 유일하다)", () => {
    const r = computeBigFive(neutralResponses());
    expect(r.tier).toBe("scientific");
    expect(r.engine).toBe("psychometrics");
    expect(r.itemCount).toBe(50);
  });

  it("5개 요인 각각에 표시 정보가 붙는다", () => {
    const r = computeBigFive(neutralResponses());
    expect(r.factors).toHaveLength(5);
    r.factors.forEach((f) => {
      expect(f.meta.key).toBe(f.factor);
      expect(f.meta.ko.length).toBeGreaterThan(0);
    });
  });

  it("같은 응답은 같은 결과를 낸다", () => {
    const responses = neutralResponses();
    expect(JSON.stringify(computeBigFive(responses))).toBe(
      JSON.stringify(computeBigFive(responses)),
    );
  });

  it("결과가 동결되어 있다", () => {
    const r = computeBigFive(neutralResponses());
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.factors)).toBe(true);
    expect(Object.isFrozen(r.factors[0])).toBe(true);
  });

  it("JSON 직렬화가 가능하다", () => {
    const r = computeBigFive(neutralResponses());
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});
