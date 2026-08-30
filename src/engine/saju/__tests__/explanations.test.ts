import { describe, expect, it } from "vitest";
import { isValidCitation } from "@engine/shared/citation";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { TEN_GODS, TWELVE_STAGES } from "@engine/saju/constants";
import { pillarFromSexagenary } from "@engine/saju/pillars";
import {
  luckExplanation,
  pillarExplanation,
  sajuMethodExplanation,
  stageEvidenceRef,
  stageExplanation,
  strengthExplanation,
  tenGodExplanation,
  voidExplanation,
} from "@engine/saju/explanations";

function assertValid(block: ReturnType<typeof sajuMethodExplanation>): void {
  assertExplanationBlock(block);
  expect(block.method?.ko.length ?? 0).toBeGreaterThan(0);
  expect(block.method?.en.length ?? 0).toBeGreaterThan(0);
  block.citations.forEach((citation) => expect(isValidCitation(citation)).toBe(true));
}

describe("사주 구조화 해설", () => {
  it("십신 10종과 십이운성 12종을 모두 채운다", () => {
    TEN_GODS.map((god) => tenGodExplanation(god, 1)).forEach(assertValid);
    TWELVE_STAGES.map((stage) => stageExplanation(stage)).forEach(assertValid);
  });

  it("기둥·공망·신강약 블록이 계산 anchor를 가진다", () => {
    (["hour", "day", "month", "year"] as const)
      .map((key) => pillarExplanation(key))
      .forEach((block) => expect(block.evidenceRefs).toContain("saju-pillars"));
    expect(voidExplanation("子丑").evidenceRefs).toContain("saju-void");
    const strength = strengthExplanation({
      ratio: 0.44,
      verdict: "weak",
      seasonal: false,
      root: true,
      peer: false,
    });
    expect(strength.method?.ko).toContain("0.45");
    expect(strength.method?.ko).toContain("0.55");
    expect(sajuMethodExplanation().evidenceRefs).toContain("saju-calculation-record");
  });

  it("자정 경계론과 신강·중화 판정 문구가 각각 반영된다", () => {
    expect(sajuMethodExplanation("midnight").detail.ko).toContain("자정 경계론");
    expect(strengthExplanation({ ratio: 0.6, verdict: "strong", seasonal: true, root: true, peer: true }).summary.ko).toContain("신강");
    expect(strengthExplanation({ ratio: 0.5, verdict: "balanced", seasonal: false, root: false, peer: false }).summary.ko).toContain("중화");
  });

  it("알 수 없는 단계 이름은 안전한 기본값과 원문 라벨로 되돌린다", () => {
    expect(stageEvidenceRef("존재하지-않는-단계")).toBe("saju-stage-unknown");
    const fallback = stageExplanation("존재하지-않는-단계");
    expect(fallback.id).toBe("saju-stage-존재하지-않는-단계");
    expect(fallback.detail).toEqual(stageExplanation(TWELVE_STAGES[0]!).detail);
  });

  it("공포·결정론 대신 문화적 자기성찰의 한계를 명시한다", () => {
    const blocks = [
      ...TEN_GODS.map((god) => tenGodExplanation(god)),
      ...TWELVE_STAGES.map((stage) => stageExplanation(stage)),
      voidExplanation("子丑"),
    ];
    blocks.forEach((block) => {
      expect(block.tier).toBe("cultural");
      expect(`${block.detail.ko}${block.method?.ko ?? ""}`).not.toContain("할 것이다");
    });
  });

  it("대운 10개를 개별 기간과 계산 근거에 연결한다", () => {
    const period = {
      ordinal: 0,
      pillar: pillarFromSexagenary(12),
      fromAge: 4,
      toAge: 14,
      fromYear: 1994,
      toYear: 2004,
      stemTenGod: "비견",
      branchTenGod: "정인",
      stage: "장생",
    } as const;
    const block = luckExplanation(period, "forward");
    assertValid(block);
    expect(block.id).toBe("saju-luck-0");
    expect(block.evidenceRefs).toContain("saju-luck-periods");
    expect(block.detail.ko).toContain("4세");
    expect(block.detail.en).toContain("ages 4 through 13");
  });

  it("역행 대운과 알 수 없는 십이운성 라벨도 안전하게 처리한다", () => {
    const period = {
      ordinal: 1,
      pillar: pillarFromSexagenary(13),
      fromAge: 14,
      toAge: 24,
      fromYear: 2004,
      toYear: 2014,
      stemTenGod: "비견",
      branchTenGod: "정인",
      stage: "존재하지-않는-단계",
    } as const;
    const block = luckExplanation(period, "backward");
    expect(block.detail.ko).toContain("역행");
    expect(block.detail.ko).toContain("존재하지-않는-단계");
  });
});
