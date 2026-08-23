import { describe, expect, it } from "vitest";
import { ELEMENT_ORDER } from "@engine/saju/constants";
import { computeSaju } from "@engine/saju";
import {
  CHARACTERS,
  CharacterResolutionError,
  allCharacters,
  characterFor,
  resolveSajuCharacter,
  type CharacterStrength,
} from "@engine/characters";
import { ORACLE_PLACE, buildSajuCases } from "@engine/saju/__tests__/fixtures/cases";

const STRENGTHS: readonly CharacterStrength[] = ["strong", "balanced", "weak"];

describe("캐릭터 표 — 누락 조합 0건", () => {
  it("오행 5 × 세력 3 = 15개가 정확히 정의되어 있다", () => {
    expect(CHARACTERS).toHaveLength(15);
    expect(allCharacters()).toBe(CHARACTERS);
  });

  it("모든 (오행, 세력) 조합이 캐릭터로 사상된다", () => {
    for (const element of ELEMENT_ORDER) {
      for (const strength of STRENGTHS) {
        const c = characterFor(element, strength);
        expect(c.element, `${element}/${strength}`).toBe(element);
        expect(c.strength, `${element}/${strength}`).toBe(strength);
      }
    }
  });

  it("id·이름·한자가 모두 서로 다르다", () => {
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(15);
    expect(new Set(CHARACTERS.map((c) => c.name)).size).toBe(15);
    expect(new Set(CHARACTERS.map((c) => c.hanja)).size).toBe(15);
  });

  it("모든 캐릭터가 이름·한자·소개문·근거를 갖춘다", () => {
    for (const c of CHARACTERS) {
      expect(c.name.length, c.id).toBeGreaterThan(0);
      expect(c.hanja.length, c.id).toBeGreaterThan(0);
      expect(c.tagline.length, c.id).toBeGreaterThan(4);
      expect(c.because.length, c.id).toBeGreaterThan(0);
    }
  });

  it("소개문에 단정적·공포 유발 표현을 쓰지 않는다", () => {
    // 플랫폼 정책: 예언 금지, 경향으로만 서술한다.
    const banned = ["할 것이다", "됩니다만", "반드시", "죽", "불행", "실패", "위험", "나쁜"];
    for (const c of CHARACTERS) {
      for (const word of banned) {
        expect(c.tagline.includes(word), `${c.id}: "${word}"`).toBe(false);
      }
      expect(c.tagline.endsWith("편입니다"), c.id).toBe(true);
    }
  });

  it("정의되지 않은 조합을 요청하면 오류를 던진다", () => {
    // @ts-expect-error — 런타임 방어를 확인한다
    expect(() => characterFor("plasma", "strong")).toThrow(CharacterResolutionError);
  });
});

describe("사주 결과 → 캐릭터", () => {
  const CASES = buildSajuCases().filter((c) => c.kind === "random").slice(0, 120);

  it(`무작위 ${CASES.length}건 전부가 캐릭터로 해석된다`, () => {
    const seen = new Set<string>();

    for (const c of CASES) {
      const result = computeSaju(
        {
          date: { year: c.year, month: c.month, day: c.day },
          time: { hour: c.hour, minute: c.minute },
          place: ORACLE_PLACE,
        },
        { applyTrueSolarTime: false },
      );
      const resolved = resolveSajuCharacter(result);

      expect(resolved.def.element, c.id).toBe(result.elements.dominant);
      expect(resolved.def.strength, c.id).toBe(result.strength.verdict);
      expect(resolved.tier).toBe("cultural");
      seen.add(resolved.def.id);
    }

    // 실제 사주에서 여러 종류가 골고루 나와야 표가 죽은 값이 아니다.
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it("같은 입력은 언제나 같은 캐릭터를 낸다", () => {
    const input = {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30 },
      place: ORACLE_PLACE,
    } as const;
    const a = resolveSajuCharacter(computeSaju(input, { applyTrueSolarTime: false }));
    const b = resolveSajuCharacter(computeSaju(input, { applyTrueSolarTime: false }));
    expect(a.def.id).toBe(b.def.id);
  });

  it("근거로 쓴 지배 오행 비율이 0~100 범위다", () => {
    const result = computeSaju(
      {
        date: { year: 1990, month: 5, day: 15 },
        time: { hour: 14, minute: 30 },
        place: ORACLE_PLACE,
      },
      { applyTrueSolarTime: false },
    );
    const resolved = resolveSajuCharacter(result);
    expect(resolved.source.dominantShare).toBeGreaterThan(0);
    expect(resolved.source.dominantShare).toBeLessThanOrEqual(100);
  });
});
