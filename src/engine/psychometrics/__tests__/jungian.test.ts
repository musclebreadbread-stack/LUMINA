import { describe, expect, it } from "vitest";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { isValidCitation } from "@engine/shared/citation";
import { ITEMS, type BigFiveFactor } from "@engine/psychometrics/items";
import {
  AXIS_CORRELATION_BASIS,
  BOUNDARY_Z,
  CONTINUOUS_SCALE_PER_Z,
  JUNGIAN_AXES,
  JUNGIAN_BASE_AXES,
  JUNGIAN_MODIFIER_AXES,
  JungianInputError,
  computeJungianLenses,
  previewJungianAxes,
} from "@engine/psychometrics/jungian";
import {
  ASPECT_ITEM_COUNT,
  EMOTIONAL_ASPECTS,
  AspectInputError,
  computeAspectScores,
  itemIdsOfAspect,
  type AspectScore,
  type EmotionalAspect,
} from "@engine/psychometrics/aspects";
import {
  BASE_TYPE_CODES,
  JUNGIAN_AXIS_EXPLANATIONS,
  JUNGIAN_TYPE_CODES,
  JUNGIAN_TYPE_PROFILE_CODES,
  MODIFIER_CODES,
  mbtiTypeProfile,
} from "@engine/psychometrics/jungianExplanations";
import { computeFactorScores, type FactorScore, type LikertResponse, type ResponseMap } from "@engine/psychometrics/scoring";

function responses(value: LikertResponse): ResponseMap {
  return Object.fromEntries(ITEMS.map((item) => [item.id, value])) as ResponseMap;
}

function scoresWithZ(zByFactor: Partial<Record<BigFiveFactor, number>>): readonly FactorScore[] {
  return computeFactorScores(responses(3)).map((score) => {
    const zScore = zByFactor[score.factor] ?? 0;
    return {
      ...score,
      norm: {
        zScore,
        tScore: 50 + zScore * 10,
        percentile: 50,
        normGroup: "all" as const,
        sampleSize: 100,
        standardDeviation: 5,
      },
      reliability: {
        ...score.reliability,
        sem: 1,
        ci95: [29, 31] as const,
      },
    };
  });
}

function aspectsWithZ(zByAspect: Partial<Record<EmotionalAspect, number>>): readonly AspectScore[] {
  return computeAspectScores(responses(3)).map((score) => {
    const zScore = zByAspect[score.aspect] ?? 0;
    return {
      ...score,
      norm: {
        zScore,
        tScore: 50 + zScore * 10,
        percentile: 50,
        normGroup: "all" as const,
        sampleSize: 100,
        standardDeviation: 5,
      },
      reliability: {
        ...score.reliability,
        sem: 1,
        ci95: [10, 20] as const,
      },
    };
  });
}

const NEUTRAL_ASPECTS = aspectsWithZ({});

describe("MBTI 유형 분석 엔진 — 6축", () => {
  it("기존 Big Five 요인과 네 기본 축의 방향을 고정한다", () => {
    const result = computeJungianLenses(
      scoresWithZ({
        extraversion: 1,
        intellect: 1,
        agreeableness: 1,
        conscientiousness: 1,
      }),
      NEUTRAL_ASPECTS,
    );

    expect(result.axes.slice(0, 4).map((axis) => axis.sourceFactor)).toEqual([
      "extraversion",
      "intellect",
      "agreeableness",
      "conscientiousness",
    ]);
    expect(result.axes.slice(0, 4).map((axis) => axis.pole)).toEqual(["E", "N", "F", "J"]);
    expect(result.typeCode?.startsWith("ENFJ-")).toBe(true);
    expect(result.axes[3]?.continuous).toBe(-CONTINUOUS_SCALE_PER_Z);
    expect(
      result.axes.slice(0, 4).every((axis) => axis.correlationBasis === AXIS_CORRELATION_BASIS[axis.axis]),
    ).toBe(true);
  });

  it("AT 축은 emotionalStability 요인을 새 문항 없이 그대로 재해석한다", () => {
    const high = computeJungianLenses(scoresWithZ({ emotionalStability: 1 }), NEUTRAL_ASPECTS);
    const low = computeJungianLenses(scoresWithZ({ emotionalStability: -1 }), NEUTRAL_ASPECTS);
    const atHigh = high.axes.find((axis) => axis.axis === "AT")!;
    const atLow = low.axes.find((axis) => axis.axis === "AT")!;
    expect(atHigh.sourceFactor).toBe("emotionalStability");
    expect(atHigh.pole).toBe("A");
    expect(atLow.pole).toBe("T");
    expect(atHigh.continuous).toBeGreaterThan(atLow.continuous);
    expect(atHigh.correlationBasis).toBeNull();
  });

  it("VW 축은 국면 대비이며 sourceFactor가 null이다", () => {
    const volatile = computeJungianLenses(
      scoresWithZ({}),
      aspectsWithZ({ withdrawal: 0, volatility: -1.5 }),
    );
    const withdrawn = computeJungianLenses(
      scoresWithZ({}),
      aspectsWithZ({ withdrawal: -1.5, volatility: 0 }),
    );
    const vw1 = volatile.axes.find((axis) => axis.axis === "VW")!;
    const vw2 = withdrawn.axes.find((axis) => axis.axis === "VW")!;
    expect(vw1.sourceFactor).toBeNull();
    expect(vw1.correlationBasis).toBeNull();
    // volatility가 낮을수록(불안정할수록) V(표출) 쪽으로, withdrawal이 낮을수록 W(침잠) 쪽으로 움직인다.
    expect(vw1.continuous).toBeGreaterThan(0);
    expect(vw2.continuous).toBeLessThan(0);
  });

  it("factor z가 증가할수록 기본 네 축의 표시 방향도 단조롭게 움직인다", () => {
    const low = computeJungianLenses(
      scoresWithZ({ extraversion: -1, intellect: -1, agreeableness: -1, conscientiousness: -1 }),
      NEUTRAL_ASPECTS,
    );
    const high = computeJungianLenses(
      scoresWithZ({ extraversion: 1, intellect: 1, agreeableness: 1, conscientiousness: 1 }),
      NEUTRAL_ASPECTS,
    );
    expect(high.axes[0]!.continuous).toBeGreaterThan(low.axes[0]!.continuous);
    expect(high.axes[1]!.continuous).toBeGreaterThan(low.axes[1]!.continuous);
    expect(high.axes[2]!.continuous).toBeGreaterThan(low.axes[2]!.continuous);
    expect(high.axes[3]!.continuous).toBeLessThan(low.axes[3]!.continuous);
  });

  it("경계값 안쪽은 문자를 단정하지 않고 ?로 남긴다", () => {
    const result = computeJungianLenses(
      scoresWithZ({
        extraversion: BOUNDARY_Z - 0.001,
        intellect: 0,
        agreeableness: 0,
        conscientiousness: 0,
        emotionalStability: 0,
      }),
      NEUTRAL_ASPECTS,
    );
    expect(result.axes[0]?.isBoundary).toBe(true);
    expect(result.axes[0]?.pole).toBeNull();
    expect(result.typeCode).toBe("????-??");
    expect(result.typeCertainty).toBe(0);
  });

  it("타입 코드는 'XXXX-YZ' 형식이다 — 대시 앞은 기본 네 축, 뒤는 AT/VW", () => {
    const result = computeJungianLenses(
      scoresWithZ({ extraversion: 1, intellect: 1, agreeableness: 1, conscientiousness: -1, emotionalStability: 1 }),
      aspectsWithZ({ withdrawal: -1.5, volatility: 0 }),
    );
    expect(result.typeCode).toMatch(/^[A-Z?]{4}-[A-Z?]{2}$/);
    const [base, modifier] = result.typeCode!.split("-");
    expect(base).toBe("ENFP");
    expect(modifier).toBe("AW");
  });

  it("SEM을 연속축의 95% 구간으로 선형 전파한다 — 기본 축", () => {
    const result = computeJungianLenses(scoresWithZ({ extraversion: 1 }), NEUTRAL_ASPECTS);
    const axis = result.axes[0]!;
    expect(axis.ci95[1] - axis.ci95[0]).toBeCloseTo((2 * 1.96 * 1 * CONTINUOUS_SCALE_PER_Z) / 5, 8);
  });

  it("VW 축도 두 국면의 SEM을 결합해 95% 구간을 만든다 — 두 SEM이 클수록 구간이 넓어진다", () => {
    const narrow = computeJungianLenses(scoresWithZ({}), aspectsWithZ({ withdrawal: 0.5, volatility: -0.5 }));
    const vwNarrow = narrow.axes.find((axis) => axis.axis === "VW")!;
    expect(vwNarrow.ci95[1]).toBeGreaterThan(vwNarrow.ci95[0]);
    expect(Number.isFinite(vwNarrow.ci95[0])).toBe(true);
    expect(Number.isFinite(vwNarrow.ci95[1])).toBe(true);
  });

  it("64개 조합을 부호만으로 정확히 요약한다 — 기본 16 × 수정 4", () => {
    const basePoles = new Set(["I", "S", "T", "J"]);
    for (const baseCode of BASE_TYPE_CODES) {
      const baseSigns = [...baseCode].map((letter) => (basePoles.has(letter) ? -1 : 1));
      for (const modifierCode of MODIFIER_CODES) {
        const [atLetter, vwLetter] = [...modifierCode];
        const atSign = atLetter === "A" ? 1 : -1;
        // VW 재표준화는 대비를 나누므로 부호만 필요하다 — withdrawal/volatility 중 하나만 크게 흔든다.
        const vwZByAspect: Partial<Record<EmotionalAspect, number>> =
          vwLetter === "V" ? { withdrawal: 0, volatility: -2 } : { withdrawal: -2, volatility: 0 };

        const result = computeJungianLenses(
          scoresWithZ({
            extraversion: baseSigns[0],
            intellect: baseSigns[1],
            agreeableness: baseSigns[2],
            conscientiousness: -(baseSigns[3] ?? 0),
            emotionalStability: atSign,
          }),
          aspectsWithZ(vwZByAspect),
        );
        expect(result.typeCode, `${baseCode}-${modifierCode}`).toBe(`${baseCode}-${modifierCode}`);
      }
    }
  });

  it("결과와 미리보기는 깊게 동결되고 결정론적이다", () => {
    const resultA = computeJungianLenses(scoresWithZ({ extraversion: 0.8, conscientiousness: -0.7 }), NEUTRAL_ASPECTS);
    const resultB = computeJungianLenses(scoresWithZ({ extraversion: 0.8, conscientiousness: -0.7 }), NEUTRAL_ASPECTS);
    expect(resultA).toEqual(resultB);
    expect(Object.isFrozen(resultA)).toBe(true);
    expect(Object.isFrozen(resultA.axes)).toBe(true);
    expect(Object.isFrozen(resultA.axes[0])).toBe(true);

    const preview = previewJungianAxes({ 1: 5, 2: 5, 3: 1 });
    expect(preview).toHaveLength(6);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(preview.every((axis) => axis.continuous >= -100 && axis.continuous <= 100)).toBe(true);
    expect(preview.every((axis) => axis.answeredFactorRatio >= 0 && axis.answeredFactorRatio <= 1)).toBe(true);
  });

  it("rejects duplicate and missing factor/aspect scores and handles scores without norms", () => {
    const scores = scoresWithZ({});
    expect(() => computeJungianLenses([...scores, scores[0]!], NEUTRAL_ASPECTS)).toThrow(JungianInputError);
    expect(() =>
      computeJungianLenses(scores.filter((score) => score.factor !== "intellect"), NEUTRAL_ASPECTS),
    ).toThrow(JungianInputError);
    expect(() => computeJungianLenses(scores, [...NEUTRAL_ASPECTS, NEUTRAL_ASPECTS[0]!])).toThrow(JungianInputError);
    expect(() =>
      computeJungianLenses(scores, NEUTRAL_ASPECTS.filter((score) => score.aspect !== "volatility")),
    ).toThrow(JungianInputError);

    const withoutNorm = scores.map((score) => ({ ...score, norm: null }));
    const aspectsWithoutNorm = NEUTRAL_ASPECTS.map((score) => ({ ...score, norm: null }));
    const result = computeJungianLenses(withoutNorm, aspectsWithoutNorm);
    expect(result.axes.every((axis) => axis.ci95[0] === axis.continuous && axis.ci95[1] === axis.continuous)).toBe(true);
  });

  it("JUNGIAN_AXES는 기본 네 축 다음에 AT/VW를 둔다", () => {
    expect(JUNGIAN_AXES).toEqual(["EI", "SN", "TF", "JP", "AT", "VW"]);
    expect(JUNGIAN_BASE_AXES).toEqual(["EI", "SN", "TF", "JP"]);
    expect(JUNGIAN_MODIFIER_AXES).toEqual(["AT", "VW"]);
  });
});

describe("정서 국면(aspects) 엔진", () => {
  it("emotionalStability 10문항을 5문항씩 두 국면으로 겹침 없이 분할한다", () => {
    expect(EMOTIONAL_ASPECTS).toEqual(["withdrawal", "volatility"]);
    const withdrawalIds = itemIdsOfAspect("withdrawal");
    const volatilityIds = itemIdsOfAspect("volatility");
    expect(withdrawalIds).toHaveLength(ASPECT_ITEM_COUNT);
    expect(volatilityIds).toHaveLength(ASPECT_ITEM_COUNT);
    const union = new Set([...withdrawalIds, ...volatilityIds]);
    expect(union.size).toBe(10);
    for (const id of union) {
      expect(id).toBeGreaterThanOrEqual(31);
      expect(id).toBeLessThanOrEqual(40);
    }
  });

  it("computeAspectScores는 rawSum 5..25, mean 1..5 범위를 만족한다", () => {
    const scores = computeAspectScores(responses(4));
    expect(scores).toHaveLength(2);
    for (const score of scores) {
      expect(score.rawSum).toBeGreaterThanOrEqual(5);
      expect(score.rawSum).toBeLessThanOrEqual(25);
      expect(score.mean).toBeGreaterThanOrEqual(1);
      expect(score.mean).toBeLessThanOrEqual(5);
      expect(score.itemCount).toBe(ASPECT_ITEM_COUNT);
    }
  });

  it("응답이 빠지면 어떤 문항인지와 함께 던진다", () => {
    const incomplete = responses(3);
    const partial = { ...incomplete };
    delete (partial as Record<number, LikertResponse>)[31];
    expect(() => computeAspectScores(partial)).toThrow(AspectInputError);
  });
});

describe("MBTI 유형 해설 완결성 — 64유형", () => {
  it("64개 코드 모두 별명·키워드 3개·요약·강점·관계·진로·성장 3개를 한글·영문으로 가진다", () => {
    expect(JUNGIAN_TYPE_PROFILE_CODES).toHaveLength(64);
    expect(BASE_TYPE_CODES).toHaveLength(16);
    expect(MODIFIER_CODES).toHaveLength(4);
    for (const code of JUNGIAN_TYPE_CODES) {
      const profile = mbtiTypeProfile(code);
      expect(profile, code).not.toBeNull();
      if (!profile) continue;
      expect(profile.nickname.ko.trim(), code).toBeTruthy();
      expect(profile.nickname.en.trim(), code).toBeTruthy();
      expect(profile.keywords, code).toHaveLength(3);
      for (const keyword of profile.keywords) {
        expect(keyword.ko.trim(), code).toBeTruthy();
        expect(keyword.en.trim(), code).toBeTruthy();
      }
      for (const field of ["summary", "strengths", "relationships", "work"] as const) {
        expect(profile[field].ko.length, `${code}.${field}.ko`).toBeGreaterThanOrEqual(100);
        expect(profile[field].en.length, `${code}.${field}.en`).toBeGreaterThanOrEqual(100);
      }
      expect(profile.growth, code).toHaveLength(3);
      for (const prompt of profile.growth) {
        expect(prompt.ko.trim(), code).toBeTruthy();
        expect(prompt.en.trim(), code).toBeTruthy();
      }
    }
  });

  it("알 수 없는 코드에는 프로필 대신 null을 돌려준다", () => {
    expect(mbtiTypeProfile("XXXX-XX")).toBeNull();
    expect(mbtiTypeProfile("INFP-AV")).not.toBeNull();
  });
});

describe("MBTI 선호 축 해설 완결성 — 6축 12극", () => {
  it("여섯 축의 양극 해설 12개가 모두 검증 가능한 근거를 가진다", () => {
    expect(JUNGIAN_AXES).toHaveLength(6);
    expect(JUNGIAN_AXIS_EXPLANATIONS).toHaveLength(12);
    for (const item of JUNGIAN_AXIS_EXPLANATIONS) {
      assertExplanationBlock(item.block);
      expect(item.block.evidenceRefs.length).toBeGreaterThan(0);
      expect(item.block.citations.every(isValidCitation)).toBe(true);
    }
  });
});
