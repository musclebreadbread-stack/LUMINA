import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseLegalMarkdown } from "@/lib/legal/markdown";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "../documents";

const SOURCES: Record<LegalDocumentKey, string> = {
  terms: "terms.ko.md",
  privacy: "privacy.ko.md",
  refund: "refund.ko.md",
};

function readSource(key: LegalDocumentKey): string {
  return readFileSync(join(process.cwd(), "src/content/legal", SOURCES[key]), "utf8").replace(/\r\n?/gu, "\n");
}

describe("reviewed legal documents", () => {
  it.each(Object.keys(SOURCES) as LegalDocumentKey[])("%s module matches its reviewed .md source exactly (run pnpm legal:sync)", (key) => {
    expect(LEGAL_DOCUMENTS[key]).toBe(readSource(key));
  });

  it("parses every document with the supported syntax only", () => {
    expect(parseLegalMarkdown(LEGAL_DOCUMENTS.terms).title).toBe("이용약관");
    expect(parseLegalMarkdown(LEGAL_DOCUMENTS.privacy).title).toBe("개인정보처리방침");
    expect(parseLegalMarkdown(LEGAL_DOCUMENTS.refund).title).toBe("환불 및 청약철회 안내");
  });

  it("keeps every article and section heading of the reviewed text", () => {
    const headings = (key: LegalDocumentKey) => parseLegalMarkdown(LEGAL_DOCUMENTS[key]).blocks
      .filter((block) => block.kind === "heading")
      .map((block) => block.inlines.map((inline) => inline.text).join(""));

    expect(headings("terms")).toHaveLength(17);
    expect(headings("terms")[0]).toBe("제1조 (목적)");
    expect(headings("terms")).toContain("제15조 (준거법과 관할)");
    expect(headings("privacy")).toHaveLength(16);
    expect(headings("privacy").at(-1)).toBe("16. 방침의 변경과 문의");
    expect(headings("refund")).toHaveLength(9);
    expect(headings("refund").at(-1)).toBe("9. 판매자 정보와 문의");
  });
});
