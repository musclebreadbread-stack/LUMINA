import { describe, expect, it } from "vitest";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { isValidCitation } from "@engine/shared/citation";
import { ITEMS, type BigFiveFactor } from "@engine/psychometrics/items";
import {
  AXIS_CORRELATION_BASIS,
  BOUNDARY_Z,
  CONTINUOUS_SCALE_PER_Z,
  JUNGIAN_AXES,
  JungianInputError,
  computeJungianLenses,
  previewJungianAxes,
} from "@engine/psychometrics/jungian";
import {
  JUNGIAN_AXIS_EXPLANATIONS,
  JUNGIAN_TYPE_CODES,
  JUNGIAN_TYPE_EXPLANATIONS,
  JUNGIAN_TYPE_PROFILE_CODES,
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

describe("융 유형 렌즈 엔진", () => {
  it("기존 Big Five 요인과 네 축의 방향을 고정한다", () => {
    const result = computeJungianLenses(scoresWithZ({
      extraversion: 1,
      intellect: 1,
      agreeableness: 1,
      conscientiousness: 1,
    }));

    expect(result.axes.map((axis) => axis.sourceFactor)).toEqual([
      "extraversion",
      "intellect",
      "agreeableness",
      "conscientiousness",
    ]);
    expect(result.axes.map((axis) => axis.pole)).toEqual(["E", "N", "F", "J"]);
    expect(result.typeCode).toBe("ENFJ");
    expect(result.axes[3]?.continuous).toBe(-CONTINUOUS_SCALE_PER_Z);
    expect(result.axes.every((axis) => axis.correlationBasis === AXIS_CORRELATION_BASIS[axis.axis])).toBe(true);
  });

  it("factor z가 증가할수록 축의 표시 방향도 단조롭게 움직인다", () => {
    const low = computeJungianLenses(scoresWithZ({ extraversion: -1, intellect: -1, agreeableness: -1, conscientiousness: -1 }));
    const high = computeJungianLenses(scoresWithZ({ extraversion: 1, intellect: 1, agreeableness: 1, conscientiousness: 1 }));
    expect(high.axes[0]!.continuous).toBeGreaterThan(low.axes[0]!.continuous);
    expect(high.axes[1]!.continuous).toBeGreaterThan(low.axes[1]!.continuous);
    expect(high.axes[2]!.continuous).toBeGreaterThan(low.axes[2]!.continuous);
    expect(high.axes[3]!.continuous).toBeLessThan(low.axes[3]!.continuous);
  });

  it("경계값 안쪽은 문자를 단정하지 않고 ?로 남긴다", () => {
    const result = computeJungianLenses(scoresWithZ({
      extraversion: BOUNDARY_Z - 0.001,
      intellect: 0,
      agreeableness: 0,
      conscientiousness: 0,
    }));
    expect(result.axes[0]?.isBoundary).toBe(true);
    expect(result.axes[0]?.pole).toBeNull();
    expect(result.typeCode).toBe("????");
    expect(result.typeCertainty).toBe(0);
  });

  it("SEM을 연속축의 95% 구간으로 선형 전파한다", () => {
    const result = computeJungianLenses(scoresWithZ({ extraversion: 1 }));
    const axis = result.axes[0]!;
    expect(axis.ci95[1] - axis.ci95[0]).toBeCloseTo((2 * 1.96 * 1 * CONTINUOUS_SCALE_PER_Z) / 5, 8);
  });

  it("네 축의 모든 16개 조합을 정확히 요약한다", () => {
    const negative = new Set(["I", "S", "T", "J"]);
    const positive = new Set(["E", "N", "F", "P"]);
    for (const code of [
      "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP",
      "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ",
    ]) {
      const signs = [...code].map((letter) => (negative.has(letter) ? -1 : positive.has(letter) ? 1 : 0));
      const result = computeJungianLenses(scoresWithZ({
        extraversion: signs[0],
        intellect: signs[1],
        agreeableness: signs[2],
        conscientiousness: -(signs[3] ?? 0),
      }));
      expect(result.typeCode).toBe(code);
    }
  });

  it("결과와 미리보기는 깊게 동결되고 결정론적이다", () => {
    const resultA = computeJungianLenses(scoresWithZ({ extraversion: 0.8, conscientiousness: -0.7 }));
    const resultB = computeJungianLenses(scoresWithZ({ extraversion: 0.8, conscientiousness: -0.7 }));
    expect(resultA).toEqual(resultB);
    expect(Object.isFrozen(resultA)).toBe(true);
    expect(Object.isFrozen(resultA.axes)).toBe(true);
    expect(Object.isFrozen(resultA.axes[0])).toBe(true);

    const preview = previewJungianAxes({ 1: 5, 2: 5, 3: 1 });
    expect(preview).toHaveLength(4);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(preview.every((axis) => axis.continuous >= -100 && axis.continuous <= 100)).toBe(true);
  });

  it("rejects duplicate and missing factor scores and handles scores without norms", () => {
    const scores = scoresWithZ({});
    expect(() => computeJungianLenses([...scores, scores[0]!])).toThrow(JungianInputError);
    expect(() => computeJungianLenses(scores.filter((score) => score.factor !== "intellect"))).toThrow(JungianInputError);

    const withoutNorm = scores.map((score) => ({ ...score, norm: null }));
    const result = computeJungianLenses(withoutNorm);
    expect(result.axes.every((axis) => axis.ci95[0] === axis.continuous && axis.ci95[1] === axis.continuous)).toBe(true);
  });
});

describe("MBTI 유형 해설 완결성", () => {
  it("16개 유형 모두 별명과 키워드 3개를 한글·영문으로 가진다", () => {
    expect(JUNGIAN_TYPE_PROFILE_CODES).toHaveLength(16);
    for (const code of JUNGIAN_TYPE_CODES) {
      const profile = mbtiTypeProfile(code);
      expect(profile, code).not.toBeNull();
      if (!profile) continue;
      expect(profile.nickname.ko.trim()).toBeTruthy();
      expect(profile.nickname.en.trim()).toBeTruthy();
      expect(profile.keywords).toHaveLength(3);
      for (const keyword of profile.keywords) {
        expect(keyword.ko.trim()).toBeTruthy();
        expect(keyword.en.trim()).toBeTruthy();
      }
    }
  });

  it("알 수 없는 코드에는 프로필 대신 null을 돌려준다", () => {
    expect(mbtiTypeProfile("XXXX")).toBeNull();
    expect(mbtiTypeProfile("INFP")).not.toBeNull();
  });
});

describe("융 유형 축 해설 완결성", () => {
  it("네 축의 양극 해설 8개가 모두 검증 가능한 근거를 가진다", () => {
    expect(JUNGIAN_AXES).toHaveLength(4);
    expect(JUNGIAN_AXIS_EXPLANATIONS).toHaveLength(8);
    for (const item of JUNGIAN_AXIS_EXPLANATIONS) {
      assertExplanationBlock(item.block);
      expect(item.block.evidenceRefs.length).toBeGreaterThan(0);
      expect(item.block.citations.every(isValidCitation)).toBe(true);
    }
  });

  it("16개 유형 해설이 모두 한글·영문·방법론을 가진다", () => {
    expect(JUNGIAN_TYPE_CODES).toHaveLength(16);
    expect(Object.keys(JUNGIAN_TYPE_EXPLANATIONS)).toHaveLength(16);
    for (const code of JUNGIAN_TYPE_CODES) {
      const block = JUNGIAN_TYPE_EXPLANATIONS[code];
      expect(block).toBeDefined();
      if (!block) continue;
      assertExplanationBlock(block);
      expect(block.detail.ko.length).toBeGreaterThanOrEqual(100);
      expect(block.detail.en.length).toBeGreaterThanOrEqual(100);
      expect(block.method?.ko).toBeTruthy();
      expect(block.citations.every(isValidCitation)).toBe(true);
    }
  });
});
