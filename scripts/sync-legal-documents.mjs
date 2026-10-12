/*
 * 검토된 법무 원문(src/content/legal/*.ko.md)을 서버 번들에 포함되는 TS 모듈로 옮긴다.
 * 원문은 .md에서만 고치고 이 스크립트(pnpm legal:sync)로 documents.ts를 다시 만든다.
 * documents.ts와 .md가 다르면 src/content/legal/__tests__/documents.test.ts가 실패한다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../src/content/legal/", import.meta.url));
const documents = { terms: "terms.ko.md", privacy: "privacy.ko.md", refund: "refund.ko.md" };

const entries = Object.entries(documents).map(([key, file]) => {
  const source = readFileSync(`${directory}${file}`, "utf8").replace(/\r\n?/gu, "\n");
  return `  ${key}: ${JSON.stringify(source)},`;
});

const output = [
  "// 자동 생성 파일입니다. 직접 고치지 마세요.",
  "// 원문: 같은 폴더의 *.ko.md · 다시 만들기: pnpm legal:sync",
  "export const LEGAL_DOCUMENTS = {",
  ...entries,
  "} as const;",
  "",
  "export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;",
  "",
].join("\n");

writeFileSync(`${directory}documents.ts`, output, "utf8");
console.log(`legal documents synced: ${Object.keys(documents).join(", ")}`);
