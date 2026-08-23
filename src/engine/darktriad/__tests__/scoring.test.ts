import { describe, expect, it } from "vitest";
import { computeFactorScores, scoreItem, type ResponseMap } from "../scoring";
import { ITEMS, FACTORS, PUBLISHED_ALPHAS, itemsOfFactor } from "../items";
import { normScoreFor, PUBLISHED_ALPHAS as NORMS_PUBLISHED_ALPHAS } from "../norms";

describe("SD3 engine", () => {
  describe("items", () => {
    it("has 27 items across 3 factors", () => {
      expect(ITEMS).toHaveLength(27);
      expect(FACTORS).toHaveLength(3);
    });

    it("each factor has exactly 9 items", () => {
      for (const factor of FACTORS) {
        expect(itemsOfFactor(factor)).toHaveLength(9);
      }
    });

    it("item ids are 1-27", () => {
      const ids = ITEMS.map((i) => i.id).sort((a, b) => a - b);
      expect(ids).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    });

    it("has reverse-scored items for narcissism and psychopathy", () => {
      const narcissismItems = itemsOfFactor("narcissism");
      const reversedN = narcissismItems.filter((i) => i.key === "minus");
      expect(reversedN).toHaveLength(3); // N2, N6, N8

      const psychopathyItems = itemsOfFactor("psychopathy");
      const reversedP = psychopathyItems.filter((i) => i.key === "minus");
      expect(reversedP).toHaveLength(2); // P2, P7

      const machiavellianismItems = itemsOfFactor("machiavellianism");
      const reversedM = machiavellianismItems.filter((i) => i.key === "minus");
      expect(reversedM).toHaveLength(0); // no reverse items
    });

    it("published alphas are defined", () => {
      expect(PUBLISHED_ALPHAS.machiavellianism).toBe(0.77);
      expect(PUBLISHED_ALPHAS.narcissism).toBe(0.74);
      expect(PUBLISHED_ALPHAS.psychopathy).toBe(0.77);
    });
  });

  describe("scoring", () => {
    it("scoreItem returns value for plus items", () => {
      const plusItem = ITEMS[0]!; // M1 is plus
      expect(plusItem.key).toBe("plus");
      expect(scoreItem(plusItem, 3)).toBe(3);
      expect(scoreItem(plusItem, 5)).toBe(5);
    });

    it("scoreItem reverses value for minus items", () => {
      const minusItem = ITEMS[10]!; // N2 is minus (index 1 in narcissism, which starts at index 9)
      expect(minusItem.key).toBe("minus");
      expect(scoreItem(minusItem, 3)).toBe(3); // 6 - 3 = 3
      expect(scoreItem(minusItem, 5)).toBe(1); // 6 - 5 = 1
      expect(scoreItem(minusItem, 1)).toBe(5); // 6 - 1 = 5
    });

    it("computeFactorScores returns 3 factor scores", () => {
      const responses: ResponseMap = Object.fromEntries(
        ITEMS.map((item) => [item.id, 3 as const]),
      ) as ResponseMap;

      const scores = computeFactorScores(responses);
      expect(scores).toHaveLength(3);
      expect(scores.map((s) => s.factor)).toEqual([
        "machiavellianism",
        "narcissism",
        "psychopathy",
      ]);
    });

    it("all-neutral responses give rawSum=27 for each factor", () => {
      const responses: ResponseMap = Object.fromEntries(
        ITEMS.map((item) => [item.id, 3 as const]),
      ) as ResponseMap;

      const scores = computeFactorScores(responses);
      for (const score of scores) {
        expect(score.rawSum).toBe(27); // 9 items × 3 points
        expect(score.mean).toBe(3);
        expect(score.itemCount).toBe(9);
      }
    });

    it("all-max responses give expected rawSum (accounting for reverse scoring)", () => {
      const responses: ResponseMap = Object.fromEntries(
        ITEMS.map((item) => [item.id, 5 as const]),
      ) as ResponseMap;

      const scores = computeFactorScores(responses);
      // Machiavellianism: 9 plus items, all scored 5 → 45
      expect(scores[0]!.rawSum).toBe(45);
      // Narcissism: 6 plus (5 each) + 3 minus (1 each) → 30 + 3 = 33
      expect(scores[1]!.rawSum).toBe(33);
      // Psychopathy: 7 plus (5 each) + 2 minus (1 each) → 35 + 2 = 37
      expect(scores[2]!.rawSum).toBe(37);
    });

    it("throws on missing item", () => {
      const responses: ResponseMap = Object.fromEntries(
        ITEMS.slice(1).map((item) => [item.id, 3 as const]),
      ) as ResponseMap;

      expect(() => computeFactorScores(responses)).toThrow(/missing responses/);
    });

    it("throws on invalid response value", () => {
      const responses: ResponseMap = Object.fromEntries(
        ITEMS.map((item, i) => [item.id, (i === 0 ? 0 : 3) as 1 | 2 | 3 | 4 | 5]),
      ) as ResponseMap;

      expect(() => computeFactorScores(responses)).toThrow(/must be an integer 1..5/);
    });
  });

  describe("norms", () => {
    it("published alphas match items", () => {
      expect(NORMS_PUBLISHED_ALPHAS).toEqual(PUBLISHED_ALPHAS);
    });

    it("normScoreFor returns z/t/percentile for valid rawSum", () => {
      const norm = normScoreFor("machiavellianism", 27);
      expect(norm).not.toBeNull();
      if (norm) {
        expect(typeof norm.zScore).toBe("number");
        expect(typeof norm.tScore).toBe("number");
        expect(norm.percentile).toBeGreaterThanOrEqual(1);
        expect(norm.percentile).toBeLessThanOrEqual(99);
        expect(norm.sampleSize).toBeGreaterThan(1000);
      }
    });

    it("all-neutral (27) is near the mean", () => {
      const norm = normScoreFor("machiavellianism", 27);
      expect(norm).not.toBeNull();
      if (norm) {
        // z-score should be close to 0 for the mean
        expect(Math.abs(norm.zScore)).toBeLessThan(1);
      }
    });

    it("high rawSum gives positive z-score", () => {
      const norm = normScoreFor("machiavellianism", 45);
      expect(norm).not.toBeNull();
      if (norm) {
        expect(norm.zScore).toBeGreaterThan(0);
        expect(norm.percentile).toBeGreaterThan(50);
      }
    });

    it("low rawSum gives negative z-score", () => {
      const norm = normScoreFor("machiavellianism", 9);
      expect(norm).not.toBeNull();
      if (norm) {
        expect(norm.zScore).toBeLessThan(0);
        expect(norm.percentile).toBeLessThan(50);
      }
    });
  });
});
