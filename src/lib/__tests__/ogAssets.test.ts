import { describe, expect, it } from "vitest";
import { BASE_TYPE_CODES } from "@engine/psychometrics/jungianExplanations";
import { ogTypeImagePath } from "../assets";
import {
  ATTACHMENT_OVERVIEW_IMAGE,
  COGNITIVE_OVERVIEW_IMAGE,
  DARK_TRIAD_OVERVIEW_IMAGE,
  EQ_OVERVIEW_IMAGE,
  attachmentImagePath,
  cognitiveImagePath,
  darkTriadImagePath,
  eqImagePath,
} from "../psychometricsAssets";

/**
 * 유형 삽화는 기본 16유형만 있다 — 64유형(v2) 코드는 대시가 있어("INFP-AV") 여기 그대로
 * 넣지 않는다. 실제 호출부(og/cards/jungian.tsx, StoryCardButton.tsx)는 항상 대시 앞
 * 4글자만 이 함수에 넘기므로, 이 테스트도 그 계약과 같은 입력(BASE_TYPE_CODES)만 쓴다.
 */
describe("ogTypeImagePath", () => {
  it.each(BASE_TYPE_CODES)("resolves %s to a PNG path, never WebP/AVIF", (code) => {
    const resolved = ogTypeImagePath(code);

    expect(resolved).toBe(`og/types/${code.toLowerCase()}.png`);
    expect(resolved.endsWith(".png")).toBe(true);
    expect(resolved.endsWith(".webp")).toBe(false);
    expect(resolved.endsWith(".avif")).toBe(false);
  });
});

describe("dedicated psychometric artwork paths", () => {
  it("keeps each assessment on its own overview and detail asset family", () => {
    expect(DARK_TRIAD_OVERVIEW_IMAGE).toBe("/psychometrics/darktriad/overview.webp");
    expect(darkTriadImagePath("narcissism")).toBe("/psychometrics/darktriad/narcissism.webp");
    expect(ATTACHMENT_OVERVIEW_IMAGE).toBe("/psychometrics/attachment/overview.webp");
    expect(attachmentImagePath("secure")).toBe("/psychometrics/attachment/secure.webp");
    expect(EQ_OVERVIEW_IMAGE).toBe("/psychometrics/eq/overview.webp");
    expect(eqImagePath("perceptionOfEmotion")).toBe("/psychometrics/eq/perceptionOfEmotion.webp");
    expect(COGNITIVE_OVERVIEW_IMAGE).toBe("/psychometrics/cognitive/overview.webp");
    expect(cognitiveImagePath("matrixReasoning")).toBe("/psychometrics/cognitive/matrixReasoning.webp");
  });
});
