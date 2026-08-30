import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { ASPECTS, PLANETS, SIGNS } from "@engine/astro/constants";
import {
  ASTRO_ASPECT_EXPLANATIONS,
  ASTRO_HOUSE_EXPLANATIONS,
  ASTRO_PLANET_EXPLANATIONS,
  ASTRO_SIGN_EXPLANATIONS,
  aspectExplanation,
  astroMethodExplanation,
  bigThreePlacementExplanation,
  houseExplanation,
  planetExplanation,
  placementExplanation,
  signExplanation,
} from "@engine/astro/explanations";

describe("점성술 구조화 해설", () => {
  it("12별자리·10행성·5각·12하우스 사전을 모두 채운다", () => {
    expect(ASTRO_SIGN_EXPLANATIONS).toHaveLength(12);
    expect(ASTRO_PLANET_EXPLANATIONS).toHaveLength(10);
    expect(ASTRO_ASPECT_EXPLANATIONS).toHaveLength(5);
    expect(ASTRO_HOUSE_EXPLANATIONS).toHaveLength(12);
    const blocks = [...ASTRO_SIGN_EXPLANATIONS, ...ASTRO_PLANET_EXPLANATIONS, ...ASTRO_ASPECT_EXPLANATIONS, ...ASTRO_HOUSE_EXPLANATIONS];
    blocks.forEach((block) => {
      assertExplanationBlock(block);
      block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
      expect(block.tier).toBe("cultural");
    });
    expect(blocks.filter((block) => block.detail.ko.length < 150).map((block) => `${block.id}:${block.detail.ko.length}`)).toEqual([]);
  });

  it("실제 10개 배치와 120개 조합이 결정론적으로 생성된다", () => {
    const first = placementExplanation("sun", 0);
    const second = placementExplanation("sun", 0);
    expect(first).toEqual(second);
    expect(new Set(PLANETS.flatMap((planet) => SIGNS.map((sign) => placementExplanation(planet.key, sign.index).id))).size).toBe(120);
    expect(first.evidenceRefs).toContain("astro-placement-sun-0");
  });

  it("각 정의와 계산 방법이 오라클·계산 anchor를 가진다", () => {
    ASPECTS.forEach((aspect) => expect(aspectExplanation(aspect.key).evidenceRefs).toContain("astro-aspects"));
    expect(houseExplanation(12).evidenceRefs).toContain("astro-house-system");
    expect(astroMethodExplanation("whole").evidenceRefs).toContain("astro-calculation-record");
  });

  it("하우스 체계 세 종류 모두 설명 문구에 반영된다", () => {
    expect(astroMethodExplanation("equal").detail.ko).toContain("이퀄");
    expect(astroMethodExplanation("placidus").detail.ko).toContain("플라시두스");
  });

  it("알 수 없는 표시 입력은 안전한 기본 설명으로 되돌린다", () => {
    expect(signExplanation(-1).id).toBe("astro-sign-0");
    expect(planetExplanation("moon").id).toBe("astro-planet-moon");
    expect(placementExplanation("moon", 99).id).toBe("astro-placement-moon-0");
    expect(bigThreePlacementExplanation("sun", 99).id).toBe("astro-big-three-sun-0");
    expect(aspectExplanation("not-an-aspect").id).toBe("astro-aspect-conjunction");
    expect(houseExplanation(0).id).toBe("astro-house-1");
    expect(houseExplanation(13).id).toBe("astro-house-12");
  });
});
