import { describe, expect, it } from "vitest";
import { computeSajuRarity, rarityExplanation } from "@engine/saju/rarity";
import { pillarFromSexagenary } from "@engine/saju/pillars";
import { assertExplanationBlock } from "@engine/shared/explanation";

describe("사주 오행 서명 희소성", () => {
  it("세 기둥과 네 기둥의 이론 공간을 구분한다", () => {
    const three = computeSajuRarity({
      year: pillarFromSexagenary(0),
      month: pillarFromSexagenary(12),
      day: pillarFromSexagenary(24),
      hour: null,
    });
    const four = computeSajuRarity({
      year: pillarFromSexagenary(0),
      month: pillarFromSexagenary(12),
      day: pillarFromSexagenary(24),
      hour: pillarFromSexagenary(36),
    });

    expect(three.pillarCount).toBe(3);
    expect(three.sampleSpace).toBe(60 ** 3);
    expect(four.pillarCount).toBe(4);
    expect(four.sampleSpace).toBe(60 ** 4);
    expect(three.matchingCombinations).toBeGreaterThan(0);
    expect(four.matchingCombinations).toBeGreaterThan(0);
  });

  it("확률은 0과 1 사이이고 설명은 문화 계층으로 고정된다", () => {
    const rarity = computeSajuRarity({
      year: pillarFromSexagenary(7),
      month: pillarFromSexagenary(19),
      day: pillarFromSexagenary(31),
      hour: null,
    });
    expect(rarity.probability).toBeGreaterThan(0);
    expect(rarity.probability).toBeLessThanOrEqual(1);
    const block = rarityExplanation(rarity);
    assertExplanationBlock(block);
    expect(block.tier).toBe("cultural");
    expect(block.detail.ko).toContain("인구 조사");
  });

  it("드러난 서명 분포에 따라 서로 다른 희소성 등급이 나타난다", () => {
    // 60갑자 서명 공간에서 가능한 최대 확률은 약 2.9%로 "common"(5% 이상) 등급은
    // 구조적으로 나타날 수 없다 — 실제로 분리되는 distinctive·uncommon 등급만 검증한다.
    const seen = new Set<string>();
    for (let year = 0; year < 60; year += 1) {
      for (let month = 0; month < 60; month += 1) {
        const rarity = computeSajuRarity({
          year: pillarFromSexagenary(year),
          month: pillarFromSexagenary(month),
          day: pillarFromSexagenary((year + month) % 60),
          hour: null,
        });
        seen.add(rarity.distinctiveness);
        if (seen.size === 2) return;
      }
    }
    expect(seen).toEqual(new Set(["uncommon", "distinctive"]));
  });
});
