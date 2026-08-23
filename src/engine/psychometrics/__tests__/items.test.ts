import { describe, expect, it } from "vitest";
import { FACTORS, ITEMS, ITEMS_PER_FACTOR, itemAt, itemsOfFactor } from "@engine/psychometrics/items";

describe("IPIP-50 문항 표", () => {
  it("정확히 50문항이다", () => {
    expect(ITEMS).toHaveLength(50);
  });

  it("id는 1부터 50까지 빈틈없이 이어진다", () => {
    ITEMS.forEach((item, i) => expect(item.id).toBe(i + 1));
  });

  it("5개 요인이 각각 10문항씩 갖는다", () => {
    expect(FACTORS).toHaveLength(5);
    FACTORS.forEach((factor) => {
      expect(itemsOfFactor(factor), factor).toHaveLength(ITEMS_PER_FACTOR);
    });
  });

  it("plus/minus 문항 수가 요인마다 정확하다 (원문 IPIP-50 키잉)", () => {
    const expected: Record<string, { plus: number; minus: number }> = {
      extraversion: { plus: 5, minus: 5 },
      agreeableness: { plus: 6, minus: 4 },
      conscientiousness: { plus: 6, minus: 4 },
      emotionalStability: { plus: 2, minus: 8 },
      intellect: { plus: 7, minus: 3 },
    };
    FACTORS.forEach((factor) => {
      const items = itemsOfFactor(factor);
      expect(items.filter((i) => i.key === "plus"), factor).toHaveLength(expected[factor]!.plus);
      expect(items.filter((i) => i.key === "minus"), factor).toHaveLength(expected[factor]!.minus);
    });
  });

  it("역채점 문항은 정확히 24개, 정채점은 26개다", () => {
    expect(ITEMS.filter((i) => i.key === "minus")).toHaveLength(24);
    expect(ITEMS.filter((i) => i.key === "plus")).toHaveLength(26);
  });

  it("모든 문항이 영문 원문과 한국어 번역을 둘 다 갖는다", () => {
    ITEMS.forEach((item) => {
      expect(item.textEn.length, `id ${item.id}`).toBeGreaterThan(3);
      expect(item.textKo.length, `id ${item.id}`).toBeGreaterThan(3);
    });
  });

  it("한국어 문항은 모두 '나는' 으로 시작한다 (어간 통일)", () => {
    ITEMS.forEach((item) => {
      expect(item.textKo.startsWith("나는"), `id ${item.id}: ${item.textKo}`).toBe(true);
    });
  });

  it("영문 원문에 중복이 없다 (같은 문항을 두 번 넣지 않았는지)", () => {
    expect(new Set(ITEMS.map((i) => i.textEn)).size).toBe(50);
  });

  it("itemAt 은 id로 정확한 문항을 돌려주고 범위를 벗어나면 오류를 던진다", () => {
    expect(itemAt(1).textEn).toBe("Am the life of the party.");
    expect(itemAt(50).factor).toBe("intellect");
    expect(() => itemAt(0)).toThrow(RangeError);
    expect(() => itemAt(51)).toThrow(RangeError);
  });
});
