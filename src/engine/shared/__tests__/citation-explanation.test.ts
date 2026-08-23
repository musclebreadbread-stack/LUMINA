import { describe, expect, it } from "vitest";
import {
  citationKey,
  formatCitation,
  isValidCitation,
  type Citation,
} from "../citation";
import {
  assertExplanationBlock,
  freezeExplanationBlock,
  localizeText,
  type ExplanationBlock,
} from "../explanation";
import { pick } from "../random";

const baseCitation: Citation = {
  authors: ["Ada Lovelace"],
  year: 1843,
  title: "Notes.",
  venue: "Scientific Journal.",
  url: "https://example.com/source",
};

const baseBlock: ExplanationBlock = {
  id: "shared-test",
  summary: { ko: "요약", en: "Summary" },
  detail: { ko: "상세 설명", en: "Detailed explanation" },
  method: { ko: "방법", en: "Method" },
  evidenceRefs: ["calculation-test"],
  citations: [baseCitation],
  tier: "scientific",
};

describe("인용 유틸리티", () => {
  it("저자 수와 끝 문장부호에 따라 간결한 참고문헌을 만든다", () => {
    expect(formatCitation({ ...baseCitation, authors: [] })).toContain("Unknown author");
    expect(formatCitation(baseCitation)).toBe(
      "Ada Lovelace (1843). Notes. Scientific Journal.",
    );
    expect(
      formatCitation({
        ...baseCitation,
        authors: ["A", "B"],
        title: "Title",
        venue: "Venue",
      }),
    ).toContain("A & B");
    expect(
      formatCitation({
        ...baseCitation,
        authors: ["A", "B", "C"],
        title: "Title",
        venue: "Venue",
      }),
    ).toContain("A, et al.");
  });

  it("인용 키를 안정적으로 만들고 URL과 필수 메타데이터를 검증한다", () => {
    expect(citationKey(baseCitation)).toBe("adalovelace-1843-Notes");
    expect(isValidCitation({ ...baseCitation, url: undefined })).toBe(true);
    expect(isValidCitation(baseCitation)).toBe(true);
    expect(isValidCitation({ ...baseCitation, authors: [] })).toBe(false);
    expect(isValidCitation({ ...baseCitation, year: 1843.5 })).toBe(false);
    expect(isValidCitation({ ...baseCitation, title: " " })).toBe(false);
    expect(isValidCitation({ ...baseCitation, venue: " " })).toBe(false);
    expect(isValidCitation({ ...baseCitation, url: "ftp://example.com" })).toBe(false);
    expect(isValidCitation({ ...baseCitation, url: "not-a-url" })).toBe(false);
  });
});

describe("설명 블록 공통 계약", () => {
  it("한국어·영어 텍스트를 선택하고 유효한 블록을 불변 구조로 만든다", () => {
    expect(localizeText(baseBlock.summary, "ko")).toBe("요약");
    expect(localizeText(baseBlock.summary, "en")).toBe("Summary");

    const frozen = freezeExplanationBlock(baseBlock);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.summary)).toBe(true);
    expect(Object.isFrozen(frozen.evidenceRefs)).toBe(true);
    expect(Object.isFrozen(frozen.citations)).toBe(true);
  });

  it("식별자·요약·상세·근거가 비어 있으면 명확한 오류를 낸다", () => {
    expect(() => assertExplanationBlock({ ...baseBlock, id: " " })).toThrow("id");
    expect(() =>
      assertExplanationBlock({ ...baseBlock, summary: { ko: "", en: "Summary" } }),
    ).toThrow("summary");
    expect(() =>
      assertExplanationBlock({ ...baseBlock, detail: { ko: "Detail", en: "" } }),
    ).toThrow("detail");
    expect(() => assertExplanationBlock({ ...baseBlock, evidenceRefs: [] })).toThrow(
      "calculation evidence",
    );
    expect(() => freezeExplanationBlock({ ...baseBlock, method: null })).not.toThrow();
  });

  it("빈 선택지에서 결정론적 선택 오류를 낸다", () => {
    expect(() => pick([], () => 0.5)).toThrow("empty array");
  });
});
