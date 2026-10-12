import { describe, expect, it } from "vitest";

import { parseLegalMarkdown, parseInline } from "../markdown";

describe("parseInline", () => {
  it("unescapes backslash-escaped punctuation and numeric entities", () => {
    expect(parseInline("시행일 \\[게시일\\] · 초안")).toEqual([{ kind: "text", text: "시행일 [게시일] · 초안" }]);
    expect(parseInline("&#91;결제 기능 도입 시 적용\\]")).toEqual([{ kind: "text", text: "[결제 기능 도입 시 적용]" }]);
  });

  it("splits bold runs from surrounding text", () => {
    expect(parseInline("**국외 이전** — 아래 사업자")).toEqual([
      { kind: "strong", text: "국외 이전" },
      { kind: "text", text: " — 아래 사업자" },
    ]);
  });

  it("keeps an unmatched asterisk pair marker as literal text", () => {
    expect(parseInline("a ** b")).toEqual([{ kind: "text", text: "a ** b" }]);
  });
});

describe("parseLegalMarkdown", () => {
  const source = [
    "# 이용약관",
    "",
    "시행일 \\[게시일\\] · 초안",
    "",
    "## 제1조 (목적)",
    "",
    "이 약관은 목적을 정합니다.",
    "",
    "1. 첫째 항목",
    "2. 둘째 항목",
    "",
    "- 글머리 하나",
    "- 글머리 둘",
    "",
    "| 항목 | 내용 |",
    "| --- | --- |",
    "| 상호 | 【상호】 |",
    "| 대표자 | 【성명】 |",
    "",
  ].join("\n");

  it("returns the title separately from the body blocks", () => {
    const doc = parseLegalMarkdown(source);
    expect(doc.title).toBe("이용약관");
    expect(doc.blocks.map((block) => block.kind)).toEqual(["paragraph", "heading", "paragraph", "orderedList", "bulletList", "table"]);
  });

  it("preserves ordered list numbering and item text", () => {
    const doc = parseLegalMarkdown("# T\n\n3. 셋\n4. 넷\n");
    expect(doc.blocks).toEqual([
      { kind: "orderedList", start: 3, items: [[{ kind: "text", text: "셋" }], [{ kind: "text", text: "넷" }]] },
    ]);
  });

  it("parses a table header and rows without the separator line", () => {
    const table = parseLegalMarkdown(source).blocks.find((block) => block.kind === "table");
    expect(table).toEqual({
      kind: "table",
      header: [[{ kind: "text", text: "항목" }], [{ kind: "text", text: "내용" }]],
      rows: [
        [[{ kind: "text", text: "상호" }], [{ kind: "text", text: "【상호】" }]],
        [[{ kind: "text", text: "대표자" }], [{ kind: "text", text: "【성명】" }]],
      ],
    });
  });

  it("rejects a document without a level-one title", () => {
    expect(() => parseLegalMarkdown("## 제1조\n\n본문")).toThrow(/title/u);
  });

  it("rejects syntax the renderer does not support instead of showing it raw", () => {
    expect(() => parseLegalMarkdown("# T\n\n### 소제목")).toThrow(/Unsupported/u);
    expect(() => parseLegalMarkdown("# T\n\n> 인용")).toThrow(/Unsupported/u);
  });
});
