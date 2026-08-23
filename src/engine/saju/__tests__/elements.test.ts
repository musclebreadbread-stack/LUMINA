import { describe, expect, it } from "vitest";
import { ELEMENT_ORDER } from "@engine/saju/constants";
import {
  computeDayMasterStrength,
  computeElementDistribution,
  elementRole,
} from "@engine/saju/elements";
import { makePillar, type FourPillars } from "@engine/saju/pillars";
import { computeSaju } from "@engine/saju";
import { ORACLE_PLACE, buildSajuCases } from "./fixtures/cases";

function pillarsOf(spec: readonly (readonly [number, number])[]): FourPillars {
  const [y, m, d, h] = spec;
  return Object.freeze({
    year: makePillar(y![0], y![1]),
    month: makePillar(m![0], m![1]),
    day: makePillar(d![0], d![1]),
    hour: h ? makePillar(h[0], h[1]) : null,
  });
}

const SAMPLE_CASES = buildSajuCases().filter((c) => c.kind === "random").slice(0, 40);

describe("오행 분포", () => {
  it("단순 분포의 합은 글자 수와 같다", () => {
    for (const c of SAMPLE_CASES) {
      const r = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const total = ELEMENT_ORDER.reduce((s, el) => s + r.elements.simple[el], 0);
      expect(total, c.id).toBe(8);
      expect(r.elements.characterCount).toBe(8);
    }
  });

  it("가중 분포의 합도 글자 수와 같다 (지장간을 일수 비율로 나눠 담기 때문)", () => {
    for (const c of SAMPLE_CASES) {
      const r = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const total = ELEMENT_ORDER.reduce((s, el) => s + r.elements.weighted[el], 0);
      expect(total, c.id).toBeCloseTo(8, 9);
    }
  });

  it("백분율 합은 100이다", () => {
    for (const c of SAMPLE_CASES.slice(0, 10)) {
      const r = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const total = ELEMENT_ORDER.reduce((s, el) => s + r.elements.percentage[el], 0);
      expect(total, c.id).toBeCloseTo(100, 8);
    }
  });

  it("시각 미상이면 6글자로 채점한다", () => {
    const r = computeSaju(
      { date: { year: 1990, month: 5, day: 15 }, place: ORACLE_PLACE },
      { applyTrueSolarTime: false },
    );
    expect(r.elements.characterCount).toBe(6);
    const total = ELEMENT_ORDER.reduce((s, el) => s + r.elements.simple[el], 0);
    expect(total).toBe(6);
  });

  it("갑자·갑자·갑자·갑자 사주는 목과 수만 가진다", () => {
    const dist = computeElementDistribution(
      pillarsOf([[0, 0], [0, 0], [0, 0], [0, 0]]),
    );
    expect(dist.simple.wood).toBe(4); // 천간 甲 ×4
    expect(dist.simple.water).toBe(4); // 지지 子 ×4
    expect([...dist.missing].sort()).toEqual(["earth", "fire", "metal"]);
    expect(dist.dominant === "wood" || dist.dominant === "water").toBe(true);
  });

  it("없는 오행을 missing 으로 정확히 집어낸다", () => {
    for (const c of SAMPLE_CASES) {
      const r = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const missing = ELEMENT_ORDER.filter((el) => r.elements.simple[el] === 0);
      expect([...r.elements.missing].sort(), c.id).toEqual(missing.sort());
    }
  });
});

describe("오행 역할 (일간 기준)", () => {
  it("목 일간에서 다섯 오행의 역할이 비겁·식상·재성·관성·인성으로 갈린다", () => {
    expect(elementRole("wood", "wood")).toBe("self");
    expect(elementRole("wood", "fire")).toBe("output");
    expect(elementRole("wood", "earth")).toBe("wealth");
    expect(elementRole("wood", "metal")).toBe("officer");
    expect(elementRole("wood", "water")).toBe("resource");
  });

  it("모든 일간 오행에서 다섯 역할이 정확히 한 번씩 나온다", () => {
    for (const day of ELEMENT_ORDER) {
      const roles = ELEMENT_ORDER.map((el) => elementRole(day, el));
      expect(new Set(roles).size, day).toBe(5);
    }
  });
});

describe("신강·신약 판정", () => {
  it("비겁·인성만으로 채운 사주는 신강이다", () => {
    // 갑목 일간 + 인월(목) + 자수(인성) 구성
    const pillars = pillarsOf([[8, 0], [0, 2], [0, 2], [8, 0]]);
    const strength = computeDayMasterStrength(pillars, computeElementDistribution(pillars));
    expect(strength.verdict).toBe("strong");
    expect(strength.hasSeasonalSupport).toBe(true);
    expect(strength.hasRootSupport).toBe(true);
    expect(strength.ratio).toBeGreaterThan(0.55);
  });

  it("재성·관성으로 둘러싸인 사주는 신약이다", () => {
    // 갑목 일간 + 신월(금, 관성) + 술토(재성)
    const pillars = pillarsOf([[6, 8], [6, 8], [0, 10], [4, 4]]);
    const strength = computeDayMasterStrength(pillars, computeElementDistribution(pillars));
    expect(strength.verdict).toBe("weak");
    expect(strength.hasSeasonalSupport).toBe(false);
    expect(strength.ratio).toBeLessThan(0.45);
  });

  it("비율은 항상 0~1 이며 supporting + draining 과 정합한다", () => {
    for (const c of SAMPLE_CASES) {
      const r = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const { supporting, draining, ratio } = r.strength;
      expect(ratio, c.id).toBeGreaterThanOrEqual(0);
      expect(ratio, c.id).toBeLessThanOrEqual(1);
      expect(ratio, c.id).toBeCloseTo(supporting / (supporting + draining), 9);
    }
  });

  it("판정 라벨은 비율 구간과 일치한다", () => {
    for (const c of SAMPLE_CASES) {
      const r = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const expected =
        r.strength.ratio > 0.55 ? "strong" : r.strength.ratio < 0.45 ? "weak" : "balanced";
      expect(r.strength.verdict, c.id).toBe(expected);
    }
  });
});
