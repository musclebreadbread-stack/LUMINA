import { describe, expect, it } from "vitest";
import { jungianAxisConfig, JUNGIAN_AXES, type JungianLensResult } from "@engine/psychometrics/jungian";
import {
  DOMAINS as COGNITIVE_DOMAINS,
  ITEMS as COGNITIVE_ENGINE_ITEMS,
  ITEMS_PER_DOMAIN as COGNITIVE_ITEMS_PER_DOMAIN,
  ITEM_COUNT as COGNITIVE_ITEM_COUNT,
} from "@engine/cognitive/items";
import { scoreCognitive } from "@engine/cognitive/scoring";
import { FACTORS as EQ_FACTORS, TOTAL_ITEM_COUNT as EQ_TOTAL_ITEM_COUNT } from "@engine/eq/items";
import { computeTotalScore as computeEqTotalScore } from "@engine/eq/scoring";
import {
  attachmentSummaryFromView,
  bigFiveSummaryFromScores,
  cognitiveSummaryFromResult,
  correctCountFromAccuracy,
  darkTriadSummaryFromScores,
  decodeShareCode,
  encodeShareCode,
  eqSummaryFromScores,
  isShareKind,
  jungianSummaryFromResult,
  type AttachmentSummaryV1,
  type BigFiveSummaryV1,
  type CognitiveSummaryV1,
  type DarkTriadSummaryV1,
  type EqSummaryV1,
  type JungianSummaryV1,
  type ShareSummaryV1,
} from "../shareCode";
import {
  attachmentViewFixture,
  bigFiveScoresWithTScore,
  cognitiveResultWith,
  cognitiveResultWithCorrectCounts,
  darkTriadScoresWithTScore,
  eqResponsesFor,
  eqScoresFor,
  eqScoresFromUniformResponse,
  jungianResultFromZ,
} from "./shareCode.fixtures";

/** 현재(v2) 인코딩 — 6축. 인코드 리터럴은 최초 실행 결과를 그대로 고정한 값이다. */
const GOLDEN_JUNGIAN: JungianSummaryV1 = {
  kind: "jungian",
  version: 2,
  locale: "ko",
  axes: [
    { axis: "EI", continuous: 62.5, isBoundary: false },
    { axis: "SN", continuous: -30.2, isBoundary: false },
    { axis: "TF", continuous: 0, isBoundary: true },
    { axis: "JP", continuous: -100, isBoundary: false },
    { axis: "AT", continuous: 18.4, isBoundary: false },
    { axis: "VW", continuous: -7.5, isBoundary: false },
  ],
  typeCode: "ES?J-AW",
};

/**
 * 64유형 확장 전(v1) 형식의 실제 공유 링크 — EI/SN/TF/JP 4축뿐이고 14자다.
 * 재인코딩하지 않는다: encodeShareCode는 이제 항상 v2를 만들기 때문에, 이 리터럴이
 * "예전에 실제로 발급됐던 링크가 지금도 열리는가"를 검증하는 유일한 방법이다.
 */
const LEGACY_V1_JUNGIAN_CODE = "1jkPPAwFe0004D";

const GOLDEN_BIGFIVE: BigFiveSummaryV1 = {
  kind: "bigfive",
  version: 1,
  locale: "en",
  factors: [
    { factor: "extraversion", tScore: 72.3 },
    { factor: "agreeableness", tScore: 45 },
    { factor: "conscientiousness", tScore: 58.6 },
    { factor: "emotionalStability", tScore: 30.1 },
    { factor: "intellect", tScore: 65.9 },
  ],
};

const GOLDEN_DARKTRIAD: DarkTriadSummaryV1 = {
  kind: "darktriad",
  version: 1,
  locale: "en",
  subscales: [
    { subscale: "machiavellianism", tScore: 55.5 },
    { subscale: "narcissism", tScore: 40 },
    { subscale: "psychopathy", tScore: 20.2 },
  ],
};

const GOLDEN_ATTACHMENT: AttachmentSummaryV1 = {
  kind: "attachment",
  version: 1,
  locale: "ko",
  anxiety: 3.47,
  avoidance: 2.1,
  quadrant: "fearful",
};

/**
 * 필드 순서(하위요인 4개 → 총점 원점수)가 한 번 배포된 뒤로는 절대 바뀔 수 없으므로
 * 리터럴 코드로 못 박는다. 이 값이 바뀌면 이미 공유된 /s/eq/<code> 링크가 전부 깨진 것이다.
 */
const GOLDEN_EQ: EqSummaryV1 = {
  kind: "eq",
  version: 1,
  locale: "ko",
  subscales: [
    { subscale: "perceptionOfEmotion", tScore: 62.5 },
    { subscale: "managingOwnEmotions", tScore: 44.4 },
    { subscale: "managingOthersEmotions", tScore: 50 },
    { subscale: "utilisationOfEmotion", tScore: 37.2 },
  ],
  totalRawSum: 128,
};

/**
 * 영역 정답률 네 개 뒤에 전체 정답률이 온다. 양자화 스텝이 정확히 한 문항 몫이라
 * (영역 25%p, 전체 6.25%p) 이 값들은 왕복해도 오차가 0이다.
 * 백분위·IQ 환산치에 해당하는 필드는 존재하지 않는다 — 필드 표에 자리 자체가 없다.
 */
const GOLDEN_COGNITIVE: CognitiveSummaryV1 = {
  kind: "cognitive",
  version: 1,
  locale: "ko",
  domains: [
    { domain: "letterNumberSeries", accuracy0to100: 75 },
    { domain: "matrixReasoning", accuracy0to100: 50 },
    { domain: "verbalReasoning", accuracy0to100: 100 },
    { domain: "threeDimensionalRotation", accuracy0to100: 25 },
  ],
  accuracy0to100: 62.5,
};


describe("shareCode 그리드/골든/거부 매트릭스", () => {
  describe("골든 고정값 — 형식이 조용히 바뀌지 않도록 리터럴로 고정한다", () => {
    it("jungian (v2, 6축)", () => {
      expect(encodeShareCode(GOLDEN_JUNGIAN)).toBe("2jkPPAwFe00IWET04h");
    });

    it("jungian: 64유형 확장 전(v1) 링크를 지금도 그대로 디코드한다", () => {
      const decoded = decodeShareCode(LEGACY_V1_JUNGIAN_CODE);
      expect(decoded).not.toBeNull();
      if (decoded?.kind !== "jungian") throw new Error("expected jungian");
      expect(decoded.version).toBe(1);
      expect(decoded.axes).toHaveLength(4);
      expect(decoded.axes.map((axis) => axis.axis)).toEqual(["EI", "SN", "TF", "JP"]);
      expect(decoded.typeCode).not.toContain("-");
      expect(decoded.typeCode).toBe("ES?J");
    });

    it("bigfive", () => {
      expect(encodeShareCode(GOLDEN_BIGFIVE)).toBe("1beBJ729A4jAJM");
    });

    it("darktriad", () => {
      expect(encodeShareCode(GOLDEN_DARKTRIAD)).toBe("1de8h6G3Ac");
    });

    it("attachment", () => {
      expect(encodeShareCode(GOLDEN_ATTACHMENT)).toBe("1ak3t1k03_");
    });

    it("eq", () => {
      expect(encodeShareCode(GOLDEN_EQ)).toBe("1ek9n6y7q5q1Vd");
    });

    it("cognitive", () => {
      expect(encodeShareCode(GOLDEN_COGNITIVE)).toBe("1ck030204010Af");
    });

    it("cognitive: 골든 코드를 디코드하면 영역이 선언된 순서 그대로, 오차 없이 되돌아온다", () => {
      const decoded = decodeShareCode("1ck030204010Af");
      if (decoded?.kind !== "cognitive") throw new Error("expected cognitive");
      expect(decoded.domains.map((entry) => entry.domain)).toEqual([...COGNITIVE_DOMAINS]);
      // 0.1 스텝을 쓰는 다른 kind와 달리 여기서는 근사가 아니라 정확히 같은 값이어야 한다.
      expect(decoded.domains.map((entry) => entry.accuracy0to100)).toEqual([75, 50, 100, 25]);
      expect(decoded.accuracy0to100).toBe(62.5);
    });

    it("cognitive: 코드에는 백분위·IQ 환산치로 읽힐 수 있는 필드가 아예 없다", () => {
      const decoded = decodeShareCode(encodeShareCode(GOLDEN_COGNITIVE));
      if (decoded?.kind !== "cognitive") throw new Error("expected cognitive");
      expect(Object.keys(decoded).sort()).toEqual(["accuracy0to100", "domains", "kind", "locale", "version"]);
    });

    it("eq: 골든 코드를 디코드하면 필드가 선언된 순서 그대로 되돌아온다", () => {
      const decoded = decodeShareCode("1ek9n6y7q5q1Vd");
      if (decoded?.kind !== "eq") throw new Error("expected eq");
      expect(decoded.subscales.map((entry) => entry.subscale)).toEqual([...EQ_FACTORS]);
      // 0.1 스텝을 부동소수로 되돌리면 44.400000000000006 같은 값이 나온다 — 자릿수가 아니라
      // 양자화 스텝(0.1)의 절반 안에 들어오는지로 고정한다.
      const expected = [62.5, 44.4, 50, 37.2];
      decoded.subscales.forEach((entry, index) => {
        expect(entry.tScore).toBeCloseTo(expected[index]!, 6);
      });
      expect(decoded.totalRawSum).toBe(128);
    });
  });

  describe("왕복 — 양자화 경계·플래그 조합 전수", () => {
    const sixAxisSamples = [-100, -0.05, 0, 0.05, 6.25, 37.4, 100];

    it("jungian: continuous가 반 스텝(0.05) 이내로 복원되고 flag 64가지 조합이 모두 보존된다 — 6축", () => {
      for (let flags = 0; flags < 64; flags += 1) {
        const axes = JUNGIAN_AXES.map((axis, index) => ({
          axis,
          continuous: sixAxisSamples[(index + flags) % sixAxisSamples.length]!,
          isBoundary: ((flags >> index) & 1) === 1,
        }));
        const summary: JungianSummaryV1 = { kind: "jungian", version: 2, locale: "ko", axes, typeCode: "????-??" };
        const decoded = decodeShareCode(encodeShareCode(summary));

        expect(decoded).not.toBeNull();
        if (decoded?.kind !== "jungian") throw new Error("expected jungian");
        for (let i = 0; i < axes.length; i += 1) {
          expect(decoded.axes[i]!.axis).toBe(axes[i]!.axis);
          expect(decoded.axes[i]!.isBoundary).toBe(axes[i]!.isBoundary);
          expect(Math.abs(decoded.axes[i]!.continuous - axes[i]!.continuous)).toBeLessThanOrEqual(0.05 + 1e-9);
        }
      }
    });

    it("bigfive: tScore가 0/50/100 경계와 중간값에서 반 스텝 이내로 복원된다", () => {
      for (const tScore of [0, 0.05, 24.95, 50, 75.05, 99.95, 100]) {
        const summary = bigFiveSummaryFromScores(
          bigFiveScoresWithTScore({
            extraversion: tScore,
            agreeableness: tScore,
            conscientiousness: tScore,
            emotionalStability: tScore,
            intellect: tScore,
          }),
          "ko",
        );
        const decoded = decodeShareCode(encodeShareCode(summary));
        expect(decoded).not.toBeNull();
        if (decoded?.kind !== "bigfive") throw new Error("expected bigfive");
        for (const factor of decoded.factors) {
          expect(Math.abs(factor.tScore - tScore)).toBeLessThanOrEqual(0.05 + 1e-9);
        }
      }
    });

    it("darktriad: tScore가 경계값에서 반 스텝 이내로 복원된다", () => {
      for (const tScore of [0, 0.05, 50, 99.95, 100]) {
        const summary = darkTriadSummaryFromScores(
          darkTriadScoresWithTScore({ machiavellianism: tScore, narcissism: tScore, psychopathy: tScore }),
          "en",
        );
        const decoded = decodeShareCode(encodeShareCode(summary));
        expect(decoded).not.toBeNull();
        if (decoded?.kind !== "darktriad") throw new Error("expected darktriad");
        for (const subscale of decoded.subscales) {
          expect(Math.abs(subscale.tScore - tScore)).toBeLessThanOrEqual(0.05 + 1e-9);
        }
      }
    });

    it("attachment: anxiety/avoidance가 경계값에서 반 스텝 이내로 복원되고 4개 사분면이 모두 보존된다", () => {
      const quadrants = ["secure", "anxious", "avoidant", "fearful"] as const;
      for (const quadrant of quadrants) {
        for (const mean of [1, 1.005, 3, 4.995, 5]) {
          const summary = attachmentSummaryFromView(attachmentViewFixture(mean, mean, quadrant), "en");
          const decoded = decodeShareCode(encodeShareCode(summary));
          expect(decoded).not.toBeNull();
          if (decoded?.kind !== "attachment") throw new Error("expected attachment");
          expect(decoded.quadrant).toBe(quadrant);
          expect(Math.abs(decoded.anxiety - mean)).toBeLessThanOrEqual(0.005 + 1e-9);
          expect(Math.abs(decoded.avoidance - mean)).toBeLessThanOrEqual(0.005 + 1e-9);
        }
      }
    });

    it("eq: 하위요인 tScore가 경계값에서 반 스텝 이내로 복원되고 총점 원점수는 무손실이다", () => {
      for (const response of [1, 2, 3, 4, 5] as const) {
        const scores = eqScoresFromUniformResponse(response);
        const summary = eqSummaryFromScores(scores, "ko");
        const decoded = decodeShareCode(encodeShareCode(summary));

        expect(decoded).not.toBeNull();
        if (decoded?.kind !== "eq") throw new Error("expected eq");
        expect(decoded.totalRawSum).toBe(summary.totalRawSum);
        for (let i = 0; i < summary.subscales.length; i += 1) {
          expect(decoded.subscales[i]!.subscale).toBe(summary.subscales[i]!.subscale);
          expect(Math.abs(decoded.subscales[i]!.tScore - summary.subscales[i]!.tScore)).toBeLessThanOrEqual(0.05 + 1e-9);
        }
      }
    });

    it("eq: 총점 원점수가 이론 최소·최대(33·165)와 그 사이 값에서 정확히 복원된다", () => {
      const totals = [
        EQ_TOTAL_ITEM_COUNT,
        EQ_TOTAL_ITEM_COUNT + 1,
        99,
        EQ_TOTAL_ITEM_COUNT * 5 - 1,
        EQ_TOTAL_ITEM_COUNT * 5,
      ];
      for (const totalRawSum of totals) {
        const summary: EqSummaryV1 = { ...GOLDEN_EQ, totalRawSum };
        const decoded = decodeShareCode(encodeShareCode(summary));
        if (decoded?.kind !== "eq") throw new Error("expected eq");
        expect(decoded.totalRawSum).toBe(totalRawSum);
      }
    });

    it("eq: 하위요인마다 다른 값이 나오는 응답도 요인별로 뒤섞이지 않는다", () => {
      // 문항 번호를 5로 나눈 나머지로 응답을 흩뿌리면 네 요인의 문항 수(10/9/8/6)가
      // 달라 하위요인 점수가 서로 다른 값이 된다 — 필드 자리 바뀜을 잡아내는 조건이다.
      const summary = eqSummaryFromScores(eqScoresFor((itemId) => ((itemId % 5) + 1) as 1 | 2 | 3 | 4 | 5), "en");
      const decoded = decodeShareCode(encodeShareCode(summary));
      if (decoded?.kind !== "eq") throw new Error("expected eq");
      expect(new Set(summary.subscales.map((entry) => entry.tScore)).size).toBeGreaterThan(1);
      for (let i = 0; i < summary.subscales.length; i += 1) {
        expect(decoded.subscales[i]!.subscale).toBe(summary.subscales[i]!.subscale);
        expect(Math.abs(decoded.subscales[i]!.tScore - summary.subscales[i]!.tScore)).toBeLessThanOrEqual(0.05 + 1e-9);
      }
    });

    it("cognitive: 영역별 정답 수 0~4의 모든 조합(625가지)이 오차 없이 복원된다", () => {
      const counts = [0, 1, 2, 3, 4] as const;
      for (const series of counts) {
        for (const matrix of counts) {
          for (const verbal of counts) {
            for (const rotation of counts) {
              const result = cognitiveResultWithCorrectCounts({
                letterNumberSeries: series,
                matrixReasoning: matrix,
                verbalReasoning: verbal,
                threeDimensionalRotation: rotation,
              });
              const summary = cognitiveSummaryFromResult(result, "en");
              const decoded = decodeShareCode(encodeShareCode(summary));

              if (decoded?.kind !== "cognitive") throw new Error("expected cognitive");
              // 양자화 스텝이 한 문항 몫이라 근사가 아니라 정확한 동일값이어야 한다.
              expect(decoded.accuracy0to100).toBe(summary.accuracy0to100);
              expect(decoded.domains.map((entry) => entry.domain)).toEqual([...COGNITIVE_DOMAINS]);
              expect(decoded.domains.map((entry) => entry.accuracy0to100)).toEqual(
                summary.domains.map((entry) => entry.accuracy0to100),
              );
              // 정답률 → 정답 수 복원도 무손실이어야 카드가 "3 / 4"를 그릴 수 있다.
              expect(
                decoded.domains.map((entry) =>
                  correctCountFromAccuracy(entry.accuracy0to100, COGNITIVE_ITEMS_PER_DOMAIN),
                ),
              ).toEqual([series, matrix, verbal, rotation]);
              expect(correctCountFromAccuracy(decoded.accuracy0to100, COGNITIVE_ITEM_COUNT)).toBe(
                series + matrix + verbal + rotation,
              );
            }
          }
        }
      }
    });

    it("cognitive: 두 로케일 모두 왕복한다", () => {
      for (const locale of ["ko", "en"] as const) {
        const summary = cognitiveSummaryFromResult(cognitiveResultWith((item) => item.id % 2 === 0), locale);
        const decoded = decodeShareCode(encodeShareCode(summary));
        if (decoded?.kind !== "cognitive") throw new Error("expected cognitive");
        expect(decoded.locale).toBe(locale);
      }
    });
  });

  describe("거부 매트릭스 — 잘못된 입력은 항상 null, 절대 throw하지 않는다", () => {
    const validJungian = encodeShareCode(GOLDEN_JUNGIAN);

    it("빈 문자열/너무 짧은 문자열", () => {
      expect(decodeShareCode("")).toBeNull();
      expect(decodeShareCode("1jk")).toBeNull();
    });

    it("길이가 틀린 코드", () => {
      expect(decodeShareCode(validJungian.slice(0, -1))).toBeNull();
      expect(decodeShareCode(`${validJungian}0`)).toBeNull();
    });

    it("알 수 없는 버전 문자", () => {
      // "2"는 jungian의 실제 현재 버전이라 무효 예시로 쓸 수 없다 — "9"는 어떤 kind도 쓰지 않는다.
      expect(decodeShareCode(`9${validJungian.slice(1)}`)).toBeNull();
    });

    it("jungian v2 문자는 다른 kind에는 존재하지 않는다", () => {
      const validBigfive = encodeShareCode(GOLDEN_BIGFIVE);
      expect(decodeShareCode(`2${validBigfive.slice(1)}`)).toBeNull();
    });

    it("알 수 없는 kind 문자", () => {
      expect(decodeShareCode(`1x${validJungian.slice(2)}`)).toBeNull();
    });

    it("expectedKind와 실제 kind가 다르면 거부한다", () => {
      expect(decodeShareCode(validJungian, "bigfive")).toBeNull();
      expect(decodeShareCode(validJungian, "eq")).toBeNull();
      expect(decodeShareCode(validJungian, "jungian")).not.toBeNull();
    });

    it("eq 코드를 다른 kind로 요구하면 거부한다", () => {
      const validEq = encodeShareCode(GOLDEN_EQ);
      expect(decodeShareCode(validEq, "darktriad")).toBeNull();
      expect(decodeShareCode(validEq, "eq")).not.toBeNull();
    });

    it("eq: 총점 필드가 선언 범위(0..132스텝)를 벗어나면 거부한다", () => {
      // 마지막 필드(총점 원점수)는 132스텝뿐이라 4095("--")를 넣으면 반드시 범위 초과다.
      const validEq = encodeShareCode(GOLDEN_EQ);
      const outOfRange = `${validEq.slice(0, 11)}--${validEq.slice(13)}`;
      expect(decodeShareCode(outOfRange)).toBeNull();
    });

    it("eq: 길이가 다른 kind의 코드 길이와 섞이면 거부한다", () => {
      const validEq = encodeShareCode(GOLDEN_EQ);
      expect(decodeShareCode(validEq.slice(0, -1))).toBeNull();
      expect(decodeShareCode(`${validEq}0`)).toBeNull();
    });

    it("cognitive 코드를 다른 kind로 요구하면 거부한다 — eq와 길이가 14로 같아 kind 문자만이 구분이다", () => {
      const validCognitive = encodeShareCode(GOLDEN_COGNITIVE);
      const validEq = encodeShareCode(GOLDEN_EQ);
      expect(validCognitive).toHaveLength(validEq.length);
      expect(decodeShareCode(validCognitive, "eq")).toBeNull();
      expect(decodeShareCode(validEq, "cognitive")).toBeNull();
      expect(decodeShareCode(validCognitive, "cognitive")).not.toBeNull();
    });

    it("cognitive: 영역 필드가 선언 범위(0..4스텝)를 벗어나면 거부한다", () => {
      const validCognitive = encodeShareCode(GOLDEN_COGNITIVE);
      const outOfRange = `${validCognitive.slice(0, 3)}--${validCognitive.slice(5)}`;
      expect(decodeShareCode(outOfRange)).toBeNull();
    });

    it("cognitive: 전체 정답률 필드가 선언 범위(0..16스텝)를 벗어나면 거부한다", () => {
      const validCognitive = encodeShareCode(GOLDEN_COGNITIVE);
      const outOfRange = `${validCognitive.slice(0, 11)}--${validCognitive.slice(13)}`;
      expect(decodeShareCode(outOfRange)).toBeNull();
    });

    it("cognitive: 길이가 어긋나거나 체크섬이 훼손되면 거부한다", () => {
      const validCognitive = encodeShareCode(GOLDEN_COGNITIVE);
      expect(decodeShareCode(validCognitive.slice(0, -1))).toBeNull();
      expect(decodeShareCode(`${validCognitive}0`)).toBeNull();
      const lastChar = validCognitive.slice(-1);
      const replacement = lastChar === "0" ? "1" : "0";
      expect(decodeShareCode(`${validCognitive.slice(0, -1)}${replacement}`)).toBeNull();
    });

    it("알 수 없는 locale 문자", () => {
      expect(decodeShareCode(`${validJungian.slice(0, 2)}x${validJungian.slice(3)}`)).toBeNull();
    });

    it.each(["+", "/", "=", " "])("알파벳에 없는 문자(%s)가 섞이면 거부한다", (badChar) => {
      const mutated = `${validJungian.slice(0, 5)}${badChar}${validJungian.slice(6)}`;
      expect(decodeShareCode(mutated)).toBeNull();
    });

    it("체크섬이 훼손되면 거부한다", () => {
      const lastChar = validJungian.slice(-1);
      const replacement = lastChar === "0" ? "1" : "0";
      const mutated = `${validJungian.slice(0, -1)}${replacement}`;
      expect(decodeShareCode(mutated)).toBeNull();
    });

    it("필드 값이 선언된 범위를 벗어나면 거부한다", () => {
      // flags 필드는 0..4095 전체를 쓰지만, 그 앞의 continuous 필드(0..2000)는 그렇지 않다 —
      // 그 자리에 4095에 해당하는 문자쌍("--")을 넣으면 반드시 범위 초과로 걸린다.
      const outOfRange = `${validJungian.slice(0, 3)}--${validJungian.slice(5)}`;
      expect(decodeShareCode(outOfRange)).toBeNull();
    });

    it("decode는 어떤 쓰레기 입력에도 절대 throw하지 않는다", () => {
      const garbage = ["\0", "🙂🙂🙂🙂", "1".repeat(1000), "null", "undefined"];
      for (const input of garbage) {
        expect(() => decodeShareCode(input)).not.toThrow();
      }
    });
  });

  describe("isShareKind", () => {
    it("정의된 여섯 종류만 참이다", () => {
      expect(isShareKind("jungian")).toBe(true);
      expect(isShareKind("bigfive")).toBe(true);
      expect(isShareKind("darktriad")).toBe(true);
      expect(isShareKind("attachment")).toBe(true);
      expect(isShareKind("eq")).toBe(true);
      expect(isShareKind("cognitive")).toBe(true);
      expect(isShareKind("astro")).toBe(false);
      expect(isShareKind("psychometrics")).toBe(false);
      expect(isShareKind("")).toBe(false);
    });

    it("공유 가능한 kind는 정확히 여섯 개다 — 새 kind를 추가하면 이 수부터 갱신하게 만든다", () => {
      const universe = [
        "jungian",
        "bigfive",
        "darktriad",
        "attachment",
        "eq",
        "cognitive",
        "saju",
        "astro",
        "tarot",
        "numerology",
        "psychometrics",
        "horoscope",
        "compatibility",
      ];
      expect(universe.filter((kind) => isShareKind(kind))).toHaveLength(6);
    });
  });

  describe("본문 결과와의 일치성", () => {
    it("실제 JungianLensResult를 어댑터→인코드→디코드해도 typeCode가 원본과 정확히 같다", () => {
      const cases: readonly Partial<Record<"extraversion" | "intellect" | "agreeableness" | "conscientiousness", number>>[] = [
        { extraversion: 1.2, intellect: -0.8, agreeableness: 0.4, conscientiousness: -1.5 },
        { extraversion: -2, intellect: 2, agreeableness: -0.6, conscientiousness: 0.9 },
        { extraversion: 0.1, intellect: 0.1, agreeableness: 0.1, conscientiousness: 0.1 },
      ];

      for (const zByFactor of cases) {
        const result: JungianLensResult = jungianResultFromZ(zByFactor);
        const summary = jungianSummaryFromResult(result, "ko");
        const roundTripped = decodeShareCode(encodeShareCode(summary));

        expect(roundTripped).not.toBeNull();
        if (roundTripped?.kind !== "jungian") throw new Error("expected jungian");
        expect(roundTripped.typeCode).toBe(result.typeCode);
        expect(summary.typeCode).toBe(result.typeCode);
      }
    });

    it("경계축(?)이 있어도 어댑터의 typeCode가 엔진 결과와 일치한다", () => {
      const result = jungianResultFromZ({ extraversion: 0, intellect: 1, agreeableness: -1, conscientiousness: 0 });
      const summary = jungianSummaryFromResult(result, "en");
      expect(summary.typeCode).toBe(result.typeCode);

      const roundTripped = decodeShareCode(encodeShareCode(summary));
      if (roundTripped?.kind !== "jungian") throw new Error("expected jungian");
      expect(roundTripped.typeCode).toBe(result.typeCode);
    });
  });

  describe("어댑터 — norm이 없을 때도 결정론적 값을 만든다", () => {
    it("bigFiveSummaryFromScores: norm 없는 요인은 scalePosition0to100 폴백을 쓴다", () => {
      const scores = bigFiveScoresWithTScore({});
      const summary = bigFiveSummaryFromScores(scores, "ko");
      expect(summary.factors).toHaveLength(5);
      expect(summary.factors.every((f) => Number.isFinite(f.tScore))).toBe(true);
    });

    it("darkTriadSummaryFromScores: norm 없는 요인은 scalePosition0to100 폴백을 쓴다", () => {
      const scores = darkTriadScoresWithTScore({});
      const summary = darkTriadSummaryFromScores(scores, "en");
      expect(summary.subscales).toHaveLength(3);
      expect(summary.subscales.every((s) => Number.isFinite(s.tScore))).toBe(true);
    });

    it("eqSummaryFromScores: 하위요인 규준이 없어 항상 scalePosition 폴백을 쓰지만 값은 유한하다", () => {
      const summary = eqSummaryFromScores(eqScoresFromUniformResponse(3), "ko");
      expect(summary.subscales).toHaveLength(EQ_FACTORS.length);
      expect(summary.subscales.map((entry) => entry.subscale)).toEqual([...EQ_FACTORS]);
      expect(summary.subscales.every((entry) => Number.isFinite(entry.tScore))).toBe(true);
    });

    it("eqSummaryFromScores: 하위요인 원점수 합이 엔진 총점과 정확히 같다", () => {
      // 결과 페이지가 하위요인 점수만 넘겨 주므로, 총점은 여기서 되살릴 수밖에 없다 —
      // 네 요인이 33문항을 겹침 없이 분할한다는 전제가 깨지면 이 테스트가 먼저 깨진다.
      const cases: readonly ((itemId: number) => 1 | 2 | 3 | 4 | 5)[] = [
        () => 1,
        () => 5,
        (itemId) => ((itemId % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        (itemId) => ((itemId % 3) + 2) as 1 | 2 | 3 | 4 | 5,
      ];
      for (const responseFor of cases) {
        const summary = eqSummaryFromScores(eqScoresFor(responseFor), "en");
        expect(summary.totalRawSum).toBe(computeEqTotalScore(eqResponsesFor(responseFor)).rawSum);
        expect(summary.totalRawSum).toBeGreaterThanOrEqual(EQ_TOTAL_ITEM_COUNT);
        expect(summary.totalRawSum).toBeLessThanOrEqual(EQ_TOTAL_ITEM_COUNT * 5);
      }
    });

    it("cognitiveSummaryFromResult: 엔진의 영역 순서·정답률을 그대로 옮기고 그 이상은 만들지 않는다", () => {
      const result = cognitiveResultWithCorrectCounts({
        letterNumberSeries: 3,
        matrixReasoning: 2,
        verbalReasoning: 4,
        threeDimensionalRotation: 1,
      });
      const summary = cognitiveSummaryFromResult(result, "ko");

      expect(summary.domains.map((entry) => entry.domain)).toEqual([...COGNITIVE_DOMAINS]);
      expect(summary.domains.map((entry) => entry.accuracy0to100)).toEqual(
        result.domains.map((score) => score.accuracy0to100),
      );
      expect(summary.accuracy0to100).toBe(result.accuracy0to100);
      // 요약이 가진 필드는 이것이 전부다 — 백분위·T점수·소요 시간 같은 필드가 조용히 생기면 실패한다.
      expect(Object.keys(summary).sort()).toEqual(["accuracy0to100", "domains", "kind", "locale", "version"]);
    });

    it("cognitiveSummaryFromResult: 소요 시간이 주입돼도 요약과 코드는 달라지지 않는다", () => {
      const responses = Object.fromEntries(
        COGNITIVE_ENGINE_ITEMS.map((item) => [item.id, item.correctOptionIndex]),
      );
      const untimed = scoreCognitive({ responses });
      const timed = scoreCognitive({
        responses,
        elapsedMsByItem: Object.fromEntries(COGNITIVE_ENGINE_ITEMS.map((item) => [item.id, item.id * 1_000])),
      });

      expect(timed.totalElapsedMs).not.toBeNull();
      expect(encodeShareCode(cognitiveSummaryFromResult(timed, "ko"))).toBe(
        encodeShareCode(cognitiveSummaryFromResult(untimed, "ko")),
      );
    });

    it("cognitiveSummaryFromResult: 같은 정답 수라도 답안 패턴이 다르면 코드가 같다 — 코드에서 응답을 역산할 수 없다", () => {
      // 영역별 정답 수만 같고 어느 문항을 맞혔는지는 전혀 다른 두 응답.
      const front = cognitiveResultWithCorrectCounts({
        letterNumberSeries: 2,
        matrixReasoning: 2,
        verbalReasoning: 2,
        threeDimensionalRotation: 2,
      });
      const back = cognitiveResultWith((item) => item.id % 4 >= 2);

      expect(front.itemResults.map((entry) => entry.isCorrect)).not.toEqual(
        back.itemResults.map((entry) => entry.isCorrect),
      );
      expect(encodeShareCode(cognitiveSummaryFromResult(front, "ko"))).toBe(
        encodeShareCode(cognitiveSummaryFromResult(back, "ko")),
      );
    });

    it("attachmentSummaryFromView: view의 mean/quadrant를 그대로 옮긴다", () => {
      const view = attachmentViewFixture(4.2, 1.8, "anxious");
      const summary = attachmentSummaryFromView(view, "ko");
      expect(summary).toEqual({
        kind: "attachment",
        version: 1,
        locale: "ko",
        anxiety: 4.2,
        avoidance: 1.8,
        quadrant: "anxious",
      });
    });
  });

  describe("pole 매핑이 jungianAxisConfig와 일치한다", () => {
    it("네 축 모두 continuous 부호로 결정된 pole이 config의 극과 맞는다", () => {
      for (const axis of JUNGIAN_AXES) {
        const config = jungianAxisConfig(axis);
        const summary: JungianSummaryV1 = {
          kind: "jungian",
          version: 2,
          locale: "ko",
          axes: JUNGIAN_AXES.map((a) => ({
            axis: a,
            continuous: a === axis ? 40 : 0,
            isBoundary: a !== axis,
          })),
          typeCode: "",
        };
        const decoded = decodeShareCode(encodeShareCode(summary));
        if (decoded?.kind !== "jungian") throw new Error("expected jungian");
        const decodedAxis = decoded.axes.find((a) => a.axis === axis)!;
        expect(decodedAxis.isBoundary).toBe(false);
        const letterIndex = decoded.typeCode.indexOf(config.positivePole);
        expect(letterIndex).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("정적 exhaustiveness", () => {
    it("ShareSummaryV1의 여섯 종류를 모두 인코드/디코드할 수 있다", () => {
      const summaries: readonly ShareSummaryV1[] = [
        GOLDEN_JUNGIAN,
        GOLDEN_BIGFIVE,
        GOLDEN_DARKTRIAD,
        GOLDEN_ATTACHMENT,
        GOLDEN_EQ,
        GOLDEN_COGNITIVE,
      ];
      for (const summary of summaries) {
        const decoded = decodeShareCode(encodeShareCode(summary));
        expect(decoded?.kind).toBe(summary.kind);
      }
    });
  });
});
