import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import { assertExplanationBlock, type ExplanationBlock } from "@engine/shared/explanation";
import { ASPECTS, PLANETS, SIGNS } from "@engine/astro/constants";
import {
  ASTRO_ASPECT_EXPLANATIONS,
  ASTRO_BIG_THREE_EXPLANATIONS,
  ASTRO_HOUSE_EXPLANATIONS,
  ASTRO_PLANET_EXPLANATIONS,
  ASTRO_SIGN_EXPLANATIONS,
  aspectExplanation,
  astroMethodExplanation,
  houseExplanation,
  placementExplanation,
} from "@engine/astro/explanations";
import { computeSaju } from "@engine/saju";
import { TEN_GODS, TWELVE_STAGES } from "@engine/saju/constants";
import {
  luckExplanation,
  pillarExplanation,
  sajuMethodExplanation,
  stageExplanation,
  strengthExplanation,
  tenGodExplanation,
  voidExplanation,
} from "@engine/saju/explanations";
import { computeSajuRarity, rarityExplanation } from "@engine/saju/rarity";
import { DECK } from "@engine/tarot/constants";
import { tarotCardExplanation, tarotSeedExplanation } from "@engine/tarot/explanations";
import { NUMBER_MEANINGS } from "@engine/numerology/constants";
import { numberExplanation, numerologyMethodExplanation } from "@engine/numerology/explanations";
import { ITEMS } from "@engine/psychometrics/items";
import { computeBigFive } from "@engine/psychometrics";
import {
  factorExplanation,
  profileCombinationExplanation,
} from "@engine/psychometrics/explanations";
import type { LikertResponse } from "@engine/psychometrics/scoring";
import { REFERENCE_GROUPS } from "@/lib/referenceCatalog";

function allMiddleResponses(): Record<number, LikertResponse> {
  return Object.fromEntries(ITEMS.map((item) => [item.id, 3])) as Record<number, LikertResponse>;
}

function assertBlock(block: ExplanationBlock): void {
  assertExplanationBlock(block);
  expect(block.citations.length).toBeGreaterThan(0);
  block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
  expect(block.evidenceRefs.every((ref) => /^(saju|astro|tarot|numerology|psychometric)-/.test(ref))).toBe(true);
}

describe("전역 설명·근거 무결성", () => {
  it("모든 엔진 설명 블록이 양언어·근거·참고문헌을 갖는다", () => {
    const saju = computeSaju(
      {
        date: { year: 1990, month: 5, day: 15 },
        time: { hour: 14, minute: 30 },
        place: { lat: 37.5665, lng: 126.978, timeZone: "Asia/Seoul" },
        gender: "female",
      },
      { referenceDate: new Date("2026-08-18T00:00:00Z") },
    );
    const bigFive = computeBigFive(allMiddleResponses());

    const blocks: ExplanationBlock[] = [
      astroMethodExplanation("placidus"),
      ...ASTRO_SIGN_EXPLANATIONS,
      ...ASTRO_PLANET_EXPLANATIONS,
      ...ASTRO_BIG_THREE_EXPLANATIONS,
      ...ASTRO_ASPECT_EXPLANATIONS,
      ...ASTRO_HOUSE_EXPLANATIONS,
      ...SIGNS.flatMap((sign) => PLANETS.map((planet) => placementExplanation(planet.key, sign.index))),
      ...ASPECTS.map((aspect) => aspectExplanation(aspect.key)).filter(
        (block) => !ASTRO_ASPECT_EXPLANATIONS.some((existing) => existing.id === block.id),
      ),
      ...Array.from({ length: 12 }, (_, index) => houseExplanation(index + 1)).filter(
        (block) => !ASTRO_HOUSE_EXPLANATIONS.some((existing) => existing.id === block.id),
      ),
      sajuMethodExplanation(),
      ...(["hour", "day", "month", "year"] as const).map((key) => pillarExplanation(key)),
      ...TEN_GODS.map((god) => tenGodExplanation(god, 1)),
      ...TWELVE_STAGES.map((stage) => stageExplanation(stage)),
      strengthExplanation({ ratio: 0.5, verdict: "balanced", seasonal: true, root: true, peer: false }),
      voidExplanation("子丑"),
      rarityExplanation(computeSajuRarity(saju.pillars)),
      ...saju.luck.periods.map((period) => luckExplanation(period, saju.luck.direction)),
      ...DECK.flatMap((card) => [
        tarotCardExplanation(card, "upright", "integrity"),
        tarotCardExplanation(card, "reversed", "integrity"),
      ]),
      tarotSeedExplanation("integrity"),
      numerologyMethodExplanation(),
      ...NUMBER_MEANINGS.flatMap((meaning) => [
        numberExplanation(meaning.value, "lifePath"),
        numberExplanation(meaning.value, "destiny"),
      ]),
      ...bigFive.factors.map((factor) => factorExplanation(factor)),
      profileCombinationExplanation(bigFive.factors)!,
    ];

    blocks.forEach(assertBlock);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
  });

  it("공개 참고문헌 카탈로그가 중복·잘못된 URL 없이 구성된다", () => {
    const keys = new Set<string>();
    for (const group of REFERENCE_GROUPS) {
      expect(group.citations.length).toBeGreaterThan(0);
      for (const citation of group.citations) {
        expect(isValidCitation(citation)).toBe(true);
        const key = `${citation.authors.join("|")}:${citation.year}:${citation.title}`;
        expect(keys.has(`${group.key}:${key}`)).toBe(false);
        keys.add(`${group.key}:${key}`);
      }
    }
    expect(REFERENCE_GROUPS.map((group) => group.key)).toContain("horoscope");
  });
});
