import { describe, expect, it } from "vitest";
import { TIER_META, requiresDisclaimer, type EvidenceTier } from "@engine/shared/tier";

const ALL_TIERS: readonly EvidenceTier[] = ["scientific", "cultural", "entertainment"];

describe("3계층 신뢰도 프레임워크", () => {
  it("세 계층 모두 메타데이터를 가진다", () => {
    ALL_TIERS.forEach((tier) => {
      expect(TIER_META[tier]).toBeDefined();
      expect(TIER_META[tier].tier).toBe(tier);
      expect(TIER_META[tier].labelKey).toContain(tier);
    });
  });

  it("계층 2·3에는 고지문이 반드시 붙고, 계층 1에는 붙지 않는다", () => {
    expect(requiresDisclaimer("scientific")).toBe(false);
    expect(requiresDisclaimer("cultural")).toBe(true);
    expect(requiresDisclaimer("entertainment")).toBe(true);
  });

  it("고지문이 필요한 계층은 고지문 키를 가진다", () => {
    ALL_TIERS.forEach((tier) => {
      if (requiresDisclaimer(tier)) {
        expect(TIER_META[tier].disclaimerKey).toBeTruthy();
      }
    });
  });

  it("메타데이터는 동결되어 런타임에 바뀌지 않는다", () => {
    expect(Object.isFrozen(TIER_META)).toBe(true);
    ALL_TIERS.forEach((tier) => expect(Object.isFrozen(TIER_META[tier])).toBe(true));
  });

  it("i18n 키가 계층끼리 겹치지 않는다", () => {
    const keys = ALL_TIERS.flatMap((t) => [TIER_META[t].labelKey, TIER_META[t].disclaimerKey]);
    const nonNull = keys.filter((k): k is string => k !== null);
    expect(new Set(nonNull).size).toBe(nonNull.length);
  });
});
