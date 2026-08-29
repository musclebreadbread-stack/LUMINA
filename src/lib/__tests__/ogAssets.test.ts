import { describe, expect, it } from "vitest";
import { BASE_TYPE_CODES } from "@engine/psychometrics/jungianExplanations";
import { ogTypeImagePath } from "../assets";

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
