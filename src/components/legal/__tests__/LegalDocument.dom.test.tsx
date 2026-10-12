import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/content/legal/documents";
import { LegalDocument } from "../LegalDocument";

function renderedText(source: string, notice?: string): { html: string; text: string } {
  const html = renderToStaticMarkup(<LegalDocument source={source} notice={notice} />);
  const container = document.createElement("div");
  container.innerHTML = html;
  return { html, text: (container.textContent ?? "").replace(/\s+/gu, " ") };
}

/** 원문 한 줄에서 마크다운 기호만 걷어 내, 화면에 그대로 보여야 할 문장만 남긴다. */
function expectedFragments(source: string): string[] {
  const unescape = (value: string) => value
    .replace(/&#(\d+);/gu, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\\(.)/gu, "$1")
    .replace(/\*\*/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return source.split("\n").flatMap((line) => {
    if (!line.trim() || /^\|(\s*-{3,}\s*\|)+$/u.test(line)) return [];
    if (line.startsWith("|")) return line.slice(1, -1).split("|").map(unescape).filter(Boolean);
    return [unescape(line.replace(/^#{1,2} /u, "").replace(/^\d+\. /u, "").replace(/^- /u, ""))];
  });
}

describe("LegalDocument renders the reviewed source without changing its wording", () => {
  it.each(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentKey[])("%s: every sentence, list item and table cell appears on screen", (key) => {
    const source = LEGAL_DOCUMENTS[key];
    const { text } = renderedText(source);
    const missing = expectedFragments(source).filter((fragment) => !text.includes(fragment));
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentKey[])("%s: no markdown syntax leaks onto the page", (key) => {
    const { text } = renderedText(LEGAL_DOCUMENTS[key]);
    expect(text).not.toMatch(/\*\*|\\\[|\\\]|&#91;|^#|\| --- \|/u);
  });

  it("keeps the placeholders that the owner must fill before publishing", () => {
    const { text } = renderedText(LEGAL_DOCUMENTS.terms);
    expect(text).toContain("【상호】");
    expect(text).toContain("시행일 [게시일]");
    expect(text).toContain("[결제 기능 도입 시 적용]");
  });

  it("renders tables, numbered lists and bold labels as real elements", () => {
    const { html } = renderedText(LEGAL_DOCUMENTS.privacy);
    expect(html).toContain("<table");
    expect(html).toContain("<th scope=\"col\"");
    expect(html).toContain("<ol start=\"1\"");
    expect(html).toContain("<strong class=\"font-medium text-hobun\">국외 이전</strong>");
  });

  it("shows the governing-language notice only when given", () => {
    expect(renderedText(LEGAL_DOCUMENTS.refund).html).not.toContain("governing");
    expect(renderedText(LEGAL_DOCUMENTS.refund, "The Korean original is the governing text.").text)
      .toContain("The Korean original is the governing text.");
  });
});
