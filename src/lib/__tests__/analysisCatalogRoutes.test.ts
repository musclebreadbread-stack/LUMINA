import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";

/**
 * 카탈로그의 href 는 "실제로 존재하는 라우트" 라는 주장이다 — 링크가 죽어 있으면
 * 카탈로그 전체의 신뢰도가 깨진다. 모든 항목이 정적 랜딩(page.tsx)을 가리키므로
 * 동적 세그먼트 예외는 아직 없다; 생기면 이 매핑에 별도 분기를 추가한다.
 */

const APP_DIR = fileURLToPath(new URL("../../app", import.meta.url));

function pageFilePathFor(href: string): string {
  const trimmed = href.replace(/^\/+/, "");
  return `${APP_DIR}/${trimmed}/page.tsx`;
}

describe("analysis catalog route existence", () => {
  it.each(ANALYSIS_CATALOG.map((definition) => [definition.key, definition.href] as const))(
    "%s href %s resolves to a real page.tsx",
    (_key, href) => {
      expect(existsSync(pageFilePathFor(href))).toBe(true);
    },
  );
});
