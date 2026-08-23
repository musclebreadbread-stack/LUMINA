import { describe, expect, it } from "vitest";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { isValidCitation } from "@engine/shared/citation";
import { ITEMS } from "@engine/psychometrics/items";
import { computeBigFive } from "@engine/psychometrics";
import {
  factorExplanation,
  profileCombinationExplanation,
  reflectionQuestion,
} from "@engine/psychometrics/explanations";
import type { LikertResponse } from "@engine/psychometrics/scoring";

function responses(value: LikertResponse): Record<number, LikertResponse> {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value])) as Record<number, LikertResponse>;
}

describe("성향검사 구조화 해설", () => {
  it("5요인 해설과 고·중·저 성찰 질문을 모두 만든다", () => {
    const low = computeBigFive(responses(1));
    const middle = computeBigFive(responses(3));
    const high = computeBigFive(responses(5));

    for (const score of low.factors) {
      const block = factorExplanation(score);
      assertExplanationBlock(block);
      expect(block.tier).toBe("scientific");
      expect(block.detail.ko.length).toBeGreaterThanOrEqual(150);
      block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
      expect(reflectionQuestion(score).ko.length).toBeGreaterThan(10);
    }

    expect(reflectionQuestion(middle.factors[0]!).en.length).toBeGreaterThan(10);
    expect(reflectionQuestion(high.factors[0]!).en.length).toBeGreaterThan(10);
  });

  it("규준이 없는 입력도 정직하게 설명하고 조합 블록을 분리한다", () => {
    const score = computeBigFive(responses(3)).factors[0]!;
    const withoutNorm = factorExplanation({ ...score, norm: null });
    expect(withoutNorm.summary.ko).toContain("인구 규준 없이");

    const full = computeBigFive(responses(3));
    const combination = profileCombinationExplanation(full.factors);
    expect(combination).not.toBeNull();
    expect(combination?.evidenceRefs.length).toBe(2);
    expect(profileCombinationExplanation([])).toBeNull();
    expect(profileCombinationExplanation([full.factors[0]!])).toBeNull();
  });
});
