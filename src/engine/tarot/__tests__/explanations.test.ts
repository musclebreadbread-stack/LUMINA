import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { DECK } from "@engine/tarot/constants";
import { tarotCardExplanation, tarotSeedExplanation } from "@engine/tarot/explanations";

describe("타로 구조화 해설", () => {
  it("78장에 카드 고유 정·역방향 의미가 있다", () => {
    expect(DECK).toHaveLength(78);
    const ids = new Set<string>();
    for (const card of DECK) {
      expect(card.meaning.upright.ko.length).toBeGreaterThanOrEqual(150);
      expect(card.meaning.reversed.ko.length).toBeGreaterThanOrEqual(150);
      ids.add(tarotCardExplanation(card, "upright", "now").id);
      ids.add(tarotCardExplanation(card, "reversed", "now").id);
    }
    expect(ids.size).toBe(156);
  });

  it("카드·시드 근거와 참고문헌이 유효하다", () => {
    const block = tarotCardExplanation(DECK[0]!, "upright", "present");
    assertExplanationBlock(block);
    block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
    expect(block.evidenceRefs).toContain("tarot-card-0");
    expect(tarotSeedExplanation("abc").evidenceRefs).toContain("tarot-seed");
  });
});
