import { describe, expect, it } from "vitest";
import {
  computeFactorScores,
  computeTotalScore,
  EqInputError,
  scoreItem,
  type LikertResponse,
  type ResponseMap,
} from "../scoring";
import {
  FACTORS,
  ITEM_COUNT_BY_FACTOR,
  ITEMS,
  REVERSE_SCORED_ITEM_IDS,
  TOTAL_ITEM_COUNT,
  itemsOfFactor,
  type Item,
} from "../items";

function responsesFrom(pick: (item: Item) => LikertResponse): ResponseMap {
  return Object.fromEntries(ITEMS.map((item) => [item.id, pick(item)])) as ResponseMap;
}

const ALL_THREE = responsesFrom(() => 3);
const ALL_ONE = responsesFrom(() => 1);
const ALL_FIVE = responsesFrom(() => 5);
/** 채점 후 모든 문항이 1점이 되는 응답 — 역채점 때문에 "전부 1"과 다르다. */
const MIN_PATTERN = responsesFrom((item) => (item.key === "plus" ? 1 : 5));
const MAX_PATTERN = responsesFrom((item) => (item.key === "plus" ? 5 : 1));
/** 홀수 문항 5점 / 짝수 문항 2점 — 손으로 계산한 고정 픽스처. */
const ODD_EVEN = responsesFrom((item) => (item.id % 2 === 1 ? 5 : 2));

describe("SSEIT engine", () => {
  describe("items", () => {
    it("has 33 items across 4 factors", () => {
      expect(ITEMS).toHaveLength(TOTAL_ITEM_COUNT);
      expect(FACTORS).toHaveLength(4);
    });

    it("item ids are 1-33 in published order", () => {
      expect(ITEMS.map((item) => item.id)).toEqual(
        Array.from({ length: TOTAL_ITEM_COUNT }, (_, i) => i + 1),
      );
    });

    it("uses the unequal Ciarrochi et al. (2001) factor counts", () => {
      expect(ITEM_COUNT_BY_FACTOR).toEqual({
        perceptionOfEmotion: 10,
        managingOwnEmotions: 9,
        managingOthersEmotions: 8,
        utilisationOfEmotion: 6,
      });
      const sum = FACTORS.reduce((total, factor) => total + ITEM_COUNT_BY_FACTOR[factor], 0);
      expect(sum).toBe(TOTAL_ITEM_COUNT);
    });

    it("derives item counts from the item table itself", () => {
      for (const factor of FACTORS) {
        expect(itemsOfFactor(factor)).toHaveLength(ITEM_COUNT_BY_FACTOR[factor]);
      }
    });

    it("marks exactly items 5, 28 and 33 as reverse scored", () => {
      const reversed = ITEMS.filter((item) => item.key === "minus").map((item) => item.id);
      expect(reversed).toEqual([5, 28, 33]);
      expect(reversed).toEqual([...REVERSE_SCORED_ITEM_IDS]);
    });

    it("gives every item non-empty English and Korean text", () => {
      for (const item of ITEMS) {
        expect(item.textEn.trim().length).toBeGreaterThan(0);
        expect(item.textKo.trim().length).toBeGreaterThan(0);
      }
      expect(new Set(ITEMS.map((item) => item.textEn)).size).toBe(TOTAL_ITEM_COUNT);
      expect(new Set(ITEMS.map((item) => item.textKo)).size).toBe(TOTAL_ITEM_COUNT);
    });
  });

  describe("scoreItem", () => {
    it("returns the response unchanged for plus items", () => {
      const plusItem = ITEMS[0]!;
      expect(plusItem.key).toBe("plus");
      expect(scoreItem(plusItem, 1)).toBe(1);
      expect(scoreItem(plusItem, 3)).toBe(3);
      expect(scoreItem(plusItem, 5)).toBe(5);
    });

    it("reverses the response for minus items", () => {
      const minusItem = ITEMS[4]!; // 5번 문항
      expect(minusItem.id).toBe(5);
      expect(minusItem.key).toBe("minus");
      expect(scoreItem(minusItem, 1)).toBe(5);
      expect(scoreItem(minusItem, 3)).toBe(3);
      expect(scoreItem(minusItem, 5)).toBe(1);
    });

    it("flips exactly items 5, 28 and 33 and nothing else", () => {
      const total = computeTotalScore(responsesFrom(() => 2));
      const flipped = total.itemResponses
        .filter((entry) => entry.scoredResponse !== entry.response)
        .map((entry) => entry.itemId);

      expect(flipped).toEqual([5, 28, 33]);
      expect(total.itemResponses.filter((entry) => entry.reverseScored).map((e) => e.itemId)).toEqual([
        5, 28, 33,
      ]);
    });
  });

  describe("input validation", () => {
    it("throws EqInputError listing every missing item", () => {
      const partial = Object.fromEntries(
        ITEMS.slice(2).map((item) => [item.id, 3 as const]),
      ) as ResponseMap;

      expect(() => computeFactorScores(partial)).toThrow(EqInputError);
      expect(() => computeFactorScores(partial)).toThrow(/missing responses for 2 item\(s\): 1, 2/);
      try {
        computeTotalScore(partial);
        expect.unreachable("computeTotalScore should reject incomplete responses");
      } catch (error) {
        expect(error).toBeInstanceOf(EqInputError);
        expect((error as EqInputError).missingItemIds).toEqual([1, 2]);
      }
    });

    it("throws on an out-of-range response value", () => {
      const outOfRange = responsesFrom((item) => (item.id === 7 ? (9 as LikertResponse) : 3));
      expect(() => computeFactorScores(outOfRange)).toThrow(/must be an integer 1\.\.5/);
    });

    it("throws on a non-integer response value", () => {
      const fractional = responsesFrom((item) => (item.id === 1 ? (2.5 as LikertResponse) : 3));
      expect(() => computeTotalScore(fractional)).toThrow(EqInputError);
    });
  });

  describe("computeFactorScores", () => {
    it("returns the four factors in the published order", () => {
      const scores = computeFactorScores(ALL_THREE);
      expect(scores.map((score) => score.factor)).toEqual([
        "perceptionOfEmotion",
        "managingOwnEmotions",
        "managingOthersEmotions",
        "utilisationOfEmotion",
      ]);
    });

    it("matches hand-computed factor sums for the odd/even fixture", () => {
      const scores = computeFactorScores(ODD_EVEN);
      const byFactor = Object.fromEntries(scores.map((score) => [score.factor, score.rawSum]));

      expect(byFactor).toEqual({
        perceptionOfEmotion: 33,
        managingOwnEmotions: 32,
        managingOthersEmotions: 25,
        utilisationOfEmotion: 21,
      });
    });

    it("keeps mean, itemCount and scale position consistent with unequal item counts", () => {
      const [perception] = computeFactorScores(ODD_EVEN);
      expect(perception?.itemCount).toBe(10);
      expect(perception?.mean).toBeCloseTo(3.3, 10);
      // 10문항 → 이론 범위 10~50. (33 - 10) / 40 × 100
      expect(perception?.scalePosition0to100).toBeCloseTo(57.5, 10);

      const utilisation = computeFactorScores(ODD_EVEN)[3];
      expect(utilisation?.itemCount).toBe(6);
      // 6문항 → 이론 범위 6~30. (21 - 6) / 24 × 100
      expect(utilisation?.scalePosition0to100).toBeCloseTo(62.5, 10);
    });

    it("computes within-factor SD and midpoint rate", () => {
      const neutral = computeFactorScores(ALL_THREE);
      for (const score of neutral) {
        expect(score.consistency.withinFactorSD).toBe(0);
        expect(score.consistency.midpointRate).toBe(1);
      }

      const [perception] = computeFactorScores(ODD_EVEN);
      expect(perception?.consistency.midpointRate).toBe(0);
      expect(perception?.consistency.withinFactorSD).toBeCloseTo(Math.sqrt(3.01), 10);
    });

    it("exposes per-item responses with the original wording", () => {
      const [perception] = computeFactorScores(ODD_EVEN);
      expect(perception?.itemResponses).toHaveLength(10);
      const first = perception?.itemResponses[0];
      expect(first?.itemId).toBe(5);
      expect(first?.response).toBe(5);
      expect(first?.scoredResponse).toBe(1);
      expect(first?.reverseScored).toBe(true);
      expect(first?.textKo).toContain("비언어적");
      expect(first?.textEn).toContain("non-verbal");
    });

    it("reports no norm for any subscale because none is published", () => {
      for (const score of computeFactorScores(ALL_THREE, { age: 30, gender: "female" })) {
        expect(score.norm).toBeNull();
        expect(score.reliability.alpha).toBe(0);
        expect(score.reliability.sem).toBe(0);
        expect(score.reliability.ci95).toEqual([score.rawSum, score.rawSum]);
      }
    });

    it("reaches the achievable minimum and maximum for every factor", () => {
      for (const score of computeFactorScores(MIN_PATTERN)) {
        expect(score.rawSum).toBe(score.itemCount);
        expect(score.mean).toBe(1);
        expect(score.scalePosition0to100).toBe(0);
      }
      for (const score of computeFactorScores(MAX_PATTERN)) {
        expect(score.rawSum).toBe(score.itemCount * 5);
        expect(score.mean).toBe(5);
        expect(score.scalePosition0to100).toBe(100);
      }
    });
  });

  describe("computeTotalScore", () => {
    it("sums all 33 scored items and matches the factor sums", () => {
      const total = computeTotalScore(ODD_EVEN);
      const factorSum = computeFactorScores(ODD_EVEN).reduce((sum, score) => sum + score.rawSum, 0);

      expect(total.factor).toBe("total");
      expect(total.itemCount).toBe(TOTAL_ITEM_COUNT);
      expect(total.rawSum).toBe(111);
      expect(total.rawSum).toBe(factorSum);
      expect(total.itemResponses).toHaveLength(TOTAL_ITEM_COUNT);
    });

    it("returns 33 and 165 for the achievable minimum and maximum patterns", () => {
      expect(computeTotalScore(MIN_PATTERN).rawSum).toBe(33);
      expect(computeTotalScore(MIN_PATTERN).scalePosition0to100).toBe(0);
      expect(computeTotalScore(MAX_PATTERN).rawSum).toBe(165);
      expect(computeTotalScore(MAX_PATTERN).scalePosition0to100).toBe(100);
    });

    it("returns 45 and 153 for all-1 and all-5 answering because of the three reverse items", () => {
      expect(computeTotalScore(ALL_ONE).rawSum).toBe(30 * 1 + 3 * 5);
      expect(computeTotalScore(ALL_FIVE).rawSum).toBe(30 * 5 + 3 * 1);
    });

    it("puts an all-neutral answer at the scale midpoint", () => {
      const total = computeTotalScore(ALL_THREE);
      expect(total.rawSum).toBe(99);
      expect(total.mean).toBe(3);
      expect(total.scalePosition0to100).toBe(50);
      expect(total.consistency.midpointRate).toBe(1);
      expect(total.consistency.withinFactorSD).toBe(0);
    });

    it("carries the published total-score norm and its 95% interval", () => {
      const total = computeTotalScore(ALL_THREE);
      expect(total.norm).not.toBeNull();
      expect(total.norm?.sampleSize).toBe(346);
      expect(total.norm?.standardDeviation).toBe(13);
      expect(total.reliability.alpha).toBe(0.9);
      expect(total.reliability.sem).toBeCloseTo(13 * Math.sqrt(0.1), 10);
      expect(total.reliability.ci95[0]).toBeLessThan(total.reliability.ci95[1]);
    });

    it("drops the adult norm when the respondent is younger than the norm sample", () => {
      const total = computeTotalScore(ALL_THREE, { age: 14 });
      expect(total.norm).toBeNull();
      expect(total.reliability.sem).toBe(0);
      expect(total.reliability.ci95).toEqual([total.rawSum, total.rawSum]);
    });

    it("freezes the returned score so a shared result cannot be mutated later", () => {
      const total = computeTotalScore(ALL_THREE);
      expect(Object.isFrozen(total)).toBe(true);
      expect(Object.isFrozen(computeFactorScores(ALL_THREE))).toBe(true);
    });
  });
});
