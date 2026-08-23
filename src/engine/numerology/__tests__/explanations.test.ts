import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import { NUMBER_MEANINGS } from "@engine/numerology/constants";
import { computeDestinyNumber } from "@engine/numerology/destiny";
import { numberExplanation, numerologyMethodExplanation } from "@engine/numerology/explanations";
import { computeLifePathNumber } from "@engine/numerology/lifePath";

describe("수비학 계산 궤적과 해설", () => {
  it("생애수와 운명수의 자릿수·문자값 단계를 보존한다", () => {
    const life = computeLifePathNumber({ year: 1993, month: 8, day: 7 });
    expect(life.trace.year[0]?.digits).toEqual([1, 9, 9, 3]);
    expect(life.trace.year[0]?.output).toBe(22);
    const destiny = computeDestinyNumber("HONG GILDONG");
    expect(destiny.letterValues.length).toBeGreaterThan(0);
    expect(destiny.trace.every((step) => step.digits.length > 0)).toBe(true);
  });

  it("12개 숫자 해설과 참고문헌이 모두 존재한다", () => {
    for (const meaning of NUMBER_MEANINGS) {
      for (const kind of ["lifePath", "destiny"] as const) {
        const block = numberExplanation(meaning.value, kind);
        expect(block.detail.ko.length).toBeGreaterThanOrEqual(150);
        block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
      }
    }
    expect(numerologyMethodExplanation().evidenceRefs).toContain("numerology-calculation-record");
  });
});
