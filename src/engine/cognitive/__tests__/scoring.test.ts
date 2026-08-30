import { describe, expect, it } from "vitest";
import { DOMAINS, ITEMS, ITEM_COUNT, itemsOfDomain, type CognitiveDomain } from "../items";
import {
  CognitiveInputError,
  scoreCognitive,
  type ElapsedMsMap,
  type ResponseMap,
} from "../scoring";

/** 지정한 문항만 맞히고 나머지는 다음 보기를 고른 응답표. */
function responsesCorrectOn(correctItemIds: readonly number[]): ResponseMap {
  return Object.fromEntries(
    ITEMS.map((item): readonly [number, number] => [
      item.id,
      correctItemIds.includes(item.id)
        ? item.correctOptionIndex
        : (item.correctOptionIndex + 1) % item.options.length,
    ]),
  );
}

const ALL_CORRECT = responsesCorrectOn(ITEMS.map((item) => item.id));
const NONE_CORRECT = responsesCorrectOn([]);

function domainScore(result: ReturnType<typeof scoreCognitive>, domain: CognitiveDomain) {
  const found = result.domains.find((score) => score.domain === domain);
  if (!found) throw new Error(`missing domain score: ${domain}`);
  return found;
}

function uniformTiming(milliseconds: number): ElapsedMsMap {
  return Object.fromEntries(
    ITEMS.map((item): readonly [number, number] => [item.id, milliseconds]),
  );
}

describe("scoreCognitive", () => {
  describe("정답률 집계", () => {
    it("모두 맞히면 전체와 네 영역 모두 100%다", () => {
      const result = scoreCognitive({ responses: ALL_CORRECT });

      expect(result.correctCount).toBe(ITEM_COUNT);
      expect(result.itemCount).toBe(ITEM_COUNT);
      expect(result.accuracy0to100).toBe(100);
      expect(result.domains).toHaveLength(4);
      for (const domain of DOMAINS) {
        const score = domainScore(result, domain);
        expect(score.correctCount).toBe(4);
        expect(score.itemCount).toBe(4);
        expect(score.accuracy0to100).toBe(100);
      }
      expect(result.itemResults.every((item) => item.isCorrect)).toBe(true);
    });

    it("모두 틀리면 전체와 네 영역 모두 0%다", () => {
      const result = scoreCognitive({ responses: NONE_CORRECT });

      expect(result.correctCount).toBe(0);
      expect(result.accuracy0to100).toBe(0);
      for (const domain of DOMAINS) {
        const score = domainScore(result, domain);
        expect(score.correctCount).toBe(0);
        expect(score.accuracy0to100).toBe(0);
      }
      expect(result.itemResults.some((item) => item.isCorrect)).toBe(false);
    });

    it("손으로 센 혼합 응답과 결과가 일치한다", () => {
      // 수열 1·2, 행렬 5, 언어 9·10·11, 회전 13 → 7/16 = 43.75%
      const result = scoreCognitive({ responses: responsesCorrectOn([1, 2, 5, 9, 10, 11, 13]) });

      expect(result.correctCount).toBe(7);
      expect(result.accuracy0to100).toBeCloseTo(43.75, 10);
      expect(domainScore(result, "letterNumberSeries").correctCount).toBe(2);
      expect(domainScore(result, "letterNumberSeries").accuracy0to100).toBe(50);
      expect(domainScore(result, "matrixReasoning").correctCount).toBe(1);
      expect(domainScore(result, "matrixReasoning").accuracy0to100).toBe(25);
      expect(domainScore(result, "verbalReasoning").correctCount).toBe(3);
      expect(domainScore(result, "verbalReasoning").accuracy0to100).toBe(75);
      expect(domainScore(result, "threeDimensionalRotation").correctCount).toBe(1);
      expect(domainScore(result, "threeDimensionalRotation").accuracy0to100).toBe(25);
    });

    it("영역 점수는 그 영역 문항만 담는다", () => {
      const result = scoreCognitive({ responses: ALL_CORRECT });

      for (const domain of DOMAINS) {
        const score = domainScore(result, domain);
        const expectedIds = itemsOfDomain(domain).map((item) => item.id);
        expect(score.itemResults.map((item) => item.itemId)).toEqual(expectedIds);
        expect(score.itemResults.every((item) => item.domain === domain)).toBe(true);
      }
      expect(result.itemResults.map((item) => item.itemId)).toEqual(ITEMS.map((item) => item.id));
    });

    it("문항 결과가 고른 보기와 정답 보기를 함께 남긴다", () => {
      const result = scoreCognitive({ responses: responsesCorrectOn([1]) });
      const first = result.itemResults[0]!;
      const second = result.itemResults[1]!;

      expect(first.itemId).toBe(1);
      expect(first.chosenOptionIndex).toBe(first.correctOptionIndex);
      expect(first.isCorrect).toBe(true);
      expect(second.chosenOptionIndex).not.toBe(second.correctOptionIndex);
      expect(second.isCorrect).toBe(false);
      expect(second.recommendedSeconds).toBeGreaterThan(0);
    });

    it("규준 기반 지표는 결과 어디에도 없다", () => {
      const result = scoreCognitive({ responses: ALL_CORRECT });
      const keys = Object.keys(result).join(" ").toLowerCase();

      expect(keys).not.toMatch(/percentile|zscore|tscore|iq|norm/);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.domains)).toBe(true);
      expect(Object.isFrozen(result.itemResults)).toBe(true);
    });
  });

  describe("시간 주입", () => {
    it("주입하지 않으면 모든 시간이 null이다", () => {
      const result = scoreCognitive({ responses: ALL_CORRECT });

      expect(result.totalElapsedMs).toBeNull();
      expect(result.itemResults.every((item) => item.elapsedMs === null)).toBe(true);
      expect(result.domains.every((domain) => domain.elapsedMs === null)).toBe(true);
    });

    it("주입하면 문항별로 그대로 되돌려 주고 합계를 낸다", () => {
      const result = scoreCognitive({
        responses: ALL_CORRECT,
        elapsedMsByItem: uniformTiming(5_000),
      });

      expect(result.totalElapsedMs).toBe(5_000 * ITEM_COUNT);
      expect(result.itemResults.every((item) => item.elapsedMs === 5_000)).toBe(true);
      expect(result.domains.every((domain) => domain.elapsedMs === 20_000)).toBe(true);
    });

    it("일부만 주입되면 잰 문항만 더한다", () => {
      const result = scoreCognitive({
        responses: ALL_CORRECT,
        elapsedMsByItem: { 1: 1_200, 5: 800 },
      });

      expect(result.totalElapsedMs).toBe(2_000);
      expect(domainScore(result, "letterNumberSeries").elapsedMs).toBe(1_200);
      expect(domainScore(result, "matrixReasoning").elapsedMs).toBe(800);
      expect(domainScore(result, "verbalReasoning").elapsedMs).toBeNull();
      expect(result.itemResults[0]!.elapsedMs).toBe(1_200);
      expect(result.itemResults[1]!.elapsedMs).toBeNull();
    });

    it("0밀리초는 '재지 않았다'와 다르게 다룬다", () => {
      const result = scoreCognitive({ responses: ALL_CORRECT, elapsedMsByItem: { 1: 0 } });

      expect(result.itemResults[0]!.elapsedMs).toBe(0);
      expect(result.totalElapsedMs).toBe(0);
      expect(domainScore(result, "letterNumberSeries").elapsedMs).toBe(0);
    });

    it("시간을 넣든 말든 정답률은 같다", () => {
      const withoutTiming = scoreCognitive({ responses: responsesCorrectOn([3, 7, 11]) });
      const withTiming = scoreCognitive({
        responses: responsesCorrectOn([3, 7, 11]),
        elapsedMsByItem: uniformTiming(99_000),
      });

      expect(withTiming.accuracy0to100).toBe(withoutTiming.accuracy0to100);
      expect(withTiming.domains.map((domain) => domain.correctCount)).toEqual(
        withoutTiming.domains.map((domain) => domain.correctCount),
      );
    });
  });

  describe("입력 오류", () => {
    it("응답이 빠진 문항을 짚어 준다", () => {
      const responses: Record<number, number> = { ...ALL_CORRECT };
      delete responses[4];
      delete responses[12];

      try {
        scoreCognitive({ responses });
        expect.unreachable("missing responses must throw");
      } catch (error) {
        expect(error).toBeInstanceOf(CognitiveInputError);
        const inputError = error as CognitiveInputError;
        expect(inputError.name).toBe("CognitiveInputError");
        expect(inputError.missingItemIds).toEqual([4, 12]);
        expect(inputError.invalidItemIds).toEqual([]);
        expect(inputError.message).toMatch(/missing responses for 2 item/);
      }
    });

    it("보기 범위를 넘어선 색인을 거른다", () => {
      const responses: Record<number, number> = { ...ALL_CORRECT, 6: 99 };

      try {
        scoreCognitive({ responses });
        expect.unreachable("out-of-range option index must throw");
      } catch (error) {
        expect(error).toBeInstanceOf(CognitiveInputError);
        const inputError = error as CognitiveInputError;
        expect(inputError.invalidItemIds).toEqual([6]);
        expect(inputError.missingItemIds).toEqual([]);
        expect(inputError.message).toMatch(/option index 0\.\.4/);
      }
    });

    it("음수 색인도 거른다", () => {
      expect(() => scoreCognitive({ responses: { ...ALL_CORRECT, 2: -1 } })).toThrow(
        CognitiveInputError,
      );
    });

    it("정수가 아닌 색인도 거른다", () => {
      expect(() => scoreCognitive({ responses: { ...ALL_CORRECT, 9: 1.5 } })).toThrow(
        CognitiveInputError,
      );
    });

    it("빈 응답표는 16문항 모두를 빠진 것으로 본다", () => {
      try {
        scoreCognitive({ responses: {} });
        expect.unreachable("empty responses must throw");
      } catch (error) {
        expect((error as CognitiveInputError).missingItemIds).toHaveLength(ITEM_COUNT);
      }
    });

    it("음수나 NaN 경과 시간은 화면까지 흘려보내지 않는다", () => {
      expect(() =>
        scoreCognitive({ responses: ALL_CORRECT, elapsedMsByItem: { 1: -5 } }),
      ).toThrow(CognitiveInputError);
      expect(() =>
        scoreCognitive({ responses: ALL_CORRECT, elapsedMsByItem: { 3: Number.NaN } }),
      ).toThrow(CognitiveInputError);

      try {
        scoreCognitive({ responses: ALL_CORRECT, elapsedMsByItem: { 2: Number.POSITIVE_INFINITY } });
        expect.unreachable("infinite elapsed time must throw");
      } catch (error) {
        expect((error as CognitiveInputError).invalidItemIds).toEqual([2]);
      }
    });

    it("모르는 문항 id의 시간 항목은 무시한다", () => {
      const result = scoreCognitive({
        responses: ALL_CORRECT,
        elapsedMsByItem: { 1: 1_000, 999: -50 },
      });

      expect(result.totalElapsedMs).toBe(1_000);
    });
  });
});
