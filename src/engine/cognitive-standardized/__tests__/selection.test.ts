import { describe, expect, it } from "vitest";

import { selectNextItem } from "../selection";
import type { Blueprint, InternalItem, SelectionState } from "../types";

const blueprint: Blueprint = {
  minimumByDomain: { gf: 1, gc: 0, gv: 0, gwm: 0, gs: 0 },
  maximumByDomain: { gf: 2, gc: 2, gv: 2, gwm: 2, gs: 2 },
  maxExposureRate: 0.8,
  targetStandardError: 0.3,
  maximumItems: 4,
};

function item(
  versionId: string,
  domain: InternalItem["domain"],
  difficulty: number,
  exposureRate = 0.1,
): InternalItem {
  return {
    versionId,
    domain,
    presentation: {
      domain,
      stimulus: { kind: "text", textKo: versionId, textEn: versionId },
      options: [
        { id: `${versionId}:a`, labelKo: "가", labelEn: "A", figure: null },
        { id: `${versionId}:b`, labelKo: "나", labelEn: "B", figure: null },
      ],
    },
    correctOptionId: `${versionId}:a`,
    parameters: { discrimination: 1.2, difficulty, guessing: 0.25 },
    exposureRate,
  };
}

function state(overrides: Partial<SelectionState> = {}): SelectionState {
  return {
    items: [item("gf-1", "gf", 0), item("gc-1", "gc", 0.1), item("gv-1", "gv", -0.2)],
    blueprint,
    theta: 0,
    answeredItemIds: [],
    recentItemIds: [],
    random: () => 0,
    ...overrides,
  };
}

describe("selectNextItem", () => {
  it("never returns an item that violates domain quota or exposure cap", () => {
    const filledGf = state({
      answeredItemIds: ["gf-answered"],
      answeredDomainCounts: { gf: 1 },
      items: [
        item("gf-1", "gf", 0),
        item("gc-1", "gc", 0.1, 0.9),
        item("gv-1", "gv", -0.2),
      ],
    });
    const result = selectNextItem(filledGf);
    expect(result?.domain).not.toBe("gf");
    expect(result?.exposureRate).toBeLessThanOrEqual(filledGf.blueprint.maxExposureRate);
  });

  it("selects only among tied maximum-information items using the supplied rng", () => {
    const noMinimumBlueprint: Blueprint = {
      ...blueprint,
      minimumByDomain: { gf: 0, gc: 0, gv: 0, gwm: 0, gs: 0 },
    };
    const first = selectNextItem(
      state({
        blueprint: noMinimumBlueprint,
        items: [item("a", "gc", 0), item("b", "gc", 0)],
        random: () => 0,
      }),
    );
    const second = selectNextItem(
      state({
        blueprint: noMinimumBlueprint,
        items: [item("a", "gc", 0), item("b", "gc", 0)],
        random: () => 0.99,
      }),
    );

    expect(first?.versionId).toBe("a");
    expect(second?.versionId).toBe("b");
  });

  it("returns null when every candidate is excluded", () => {
    const result = selectNextItem(
      state({
        answeredItemIds: ["gf-1", "gc-1", "gv-1"],
        answeredDomainCounts: { gf: 1, gc: 1, gv: 1 },
      }),
    );
    expect(result).toBeNull();
  });
});
