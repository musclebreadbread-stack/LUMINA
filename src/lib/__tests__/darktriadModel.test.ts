import { describe, expect, it } from "vitest";
import { FACTORS, ITEMS, ITEMS_PER_FACTOR } from "@engine/darktriad/items";
import { DarkTriadInputError, type LikertResponse, type ResponseMap } from "@engine/darktriad/scoring";
import { buildDarkTriadView } from "../darktriadModel";

function uniform(value: LikertResponse): ResponseMap {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value])) as ResponseMap;
}

describe("buildDarkTriadView", () => {
  it("labels every factor in both languages, in engine order", () => {
    const view = buildDarkTriadView(uniform(3));
    expect(view.itemCount).toBe(FACTORS.length * ITEMS_PER_FACTOR);
    expect(view.factors.map((f) => f.key)).toEqual([...FACTORS]);
    for (const factor of view.factors) {
      expect(factor.ko.trim()).not.toBe("");
      expect(factor.en.trim()).not.toBe("");
      expect(factor.descriptionKo.trim()).not.toBe("");
      expect(factor.descriptionEn.trim()).not.toBe("");
    }
    expect(Object.isFrozen(view.factors)).toBe(true);
  });

  it("sums raw scores across factors, honouring reverse-scored items", () => {
    // 전부 3점이면 역채점도 3점이라 총점은 27 x 3.
    expect(buildDarkTriadView(uniform(3)).totalScore).toBe(81);
    // 전부 5점이면 plus 문항은 5, minus 문항은 1.
    const minus = ITEMS.filter((item) => item.key === "minus").length;
    const plus = ITEMS.length - minus;
    expect(buildDarkTriadView(uniform(5)).totalScore).toBe(plus * 5 + minus * 1);
  });

  it("selects two strongest and two weakest items per factor without overlap", () => {
    const responses: Record<number, LikertResponse> = { ...uniform(3) };
    const machItems = ITEMS.filter((item) => item.factor === "machiavellianism" && item.key === "plus");
    responses[machItems[0]!.id] = 5;
    responses[machItems[1]!.id] = 4;
    responses[machItems[2]!.id] = 1;
    responses[machItems[3]!.id] = 2;

    const mach = buildDarkTriadView(responses as ResponseMap).factors.find(
      (f) => f.key === "machiavellianism",
    )!;
    expect(mach.strongestItems.map((i) => i.itemId)).toEqual([machItems[0]!.id, machItems[1]!.id]);
    expect(mach.weakestItems.map((i) => i.itemId)).toEqual([machItems[2]!.id, machItems[3]!.id]);
    const ids = [...mach.strongestItems, ...mach.weakestItems].map((i) => i.itemId);
    expect(new Set(ids).size).toBe(4);
    expect(Object.isFrozen(mach.strongestItems)).toBe(true);
  });

  it("breaks score ties by item id", () => {
    const view = buildDarkTriadView(uniform(3));
    for (const factor of view.factors) {
      const own = ITEMS.filter((item) => item.factor === factor.key).map((item) => item.id);
      expect(factor.strongestItems.map((i) => i.itemId)).toEqual(own.slice(0, 2));
      expect(factor.weakestItems.map((i) => i.itemId)).toEqual(own.slice(2, 4));
    }
  });

  it("chooses the dominant factor by z-score when norms exist, otherwise by scale position", () => {
    const view = buildDarkTriadView(uniform(3));
    const expected = view.factors.reduce((best, f) =>
      (f.norm?.zScore ?? f.scalePosition) > (best.norm?.zScore ?? best.scalePosition) ? f : best,
    );
    expect(view.dominantFactor).toBe(expected.key);
  });

  it("names the factor with the highest expressed score as dominant", () => {
    const responses: Record<number, LikertResponse> = { ...uniform(1) };
    for (const item of ITEMS.filter((i) => i.factor === "narcissism")) {
      responses[item.id] = item.key === "plus" ? 5 : 1;
    }
    const view = buildDarkTriadView(responses as ResponseMap);
    expect(view.dominantFactor).toBe("narcissism");
    const narc = view.factors.find((f) => f.key === "narcissism")!;
    expect(narc.scalePosition).toBe(100);
  });

  it("passes through reliability and consistency from the engine", () => {
    const view = buildDarkTriadView(uniform(3));
    for (const factor of view.factors) {
      expect(factor.reliability.ci95).toHaveLength(2);
      expect(factor.consistency.midpointRate).toBe(1);
      expect(factor.consistency.withinFactorSD).toBe(0);
    }
  });

  it("propagates incomplete-input errors from the engine", () => {
    const responses = { ...uniform(3) } as Record<number, LikertResponse>;
    delete responses[1];
    expect(() => buildDarkTriadView(responses as ResponseMap)).toThrow(DarkTriadInputError);
  });
});
