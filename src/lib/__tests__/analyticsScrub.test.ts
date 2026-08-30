import { describe, expect, it } from "vitest";
import { scrubAnalyticsUrl } from "../analyticsScrub";

/**
 * 실제로 존재하는 모든 민감한 URL 모양을 표로 나열해 회귀를 잠근다 — 짐작이 아니라
 * 이 표에 없는 새 라우트가 생기면 이 테스트도 반드시 갱신해야 한다는 신호가 된다.
 */
const CASES: readonly { readonly name: string; readonly input: string; readonly expected: string | null }[] = [
  // "/r/<lz-string>"와 그 자식 — 생년월일시·장소
  { name: "r profile root", input: "/r/N4IgzgpgTgxg9g", expected: "/r/[data]" },
  { name: "r profile astro child", input: "/r/N4IgzgpgTgxg9g/astro", expected: "/r/[data]/astro" },
  { name: "r profile today child", input: "/r/N4IgzgpgTgxg9g/today", expected: "/r/[data]/today" },
  { name: "r profile all child", input: "/r/N4IgzgpgTgxg9g/all", expected: "/r/[data]/all" },
  { name: "r profile with query stripped", input: "/r/N4IgzgpgTgxg9g/today?ref=kakao", expected: "/r/[data]/today" },
  { name: "r profile en-prefixed", input: "/en/r/N4IgzgpgTgxg9g/astro", expected: "/en/r/[data]/astro" },
  { name: "r alone (no data segment)", input: "/r", expected: "/r" },

  // "/s/<kind>/<code>" — kind는 고정 열거값이라 남기고 code만 지운다
  { name: "share jungian code", input: "/s/jungian/1jkPPAwFe0004D", expected: "/s/jungian/[code]" },
  { name: "share bigfive code with query", input: "/s/bigfive/1beBJ729A4jAJM?utm_source=x", expected: "/s/bigfive/[code]" },
  { name: "share darktriad code", input: "/s/darktriad/1de8h6G3Ac", expected: "/s/darktriad/[code]" },
  { name: "share attachment code en-prefixed", input: "/en/s/attachment/1ak3t1k03_", expected: "/en/s/attachment/[code]" },
  { name: "share unknown kind falls back to placeholder", input: "/s/bogus/abc123", expected: "/s/[kind]/[code]" },

  // "/tarot/<spread>/<seed>" — spread는 3종 고정 열거값
  { name: "tarot single seed", input: "/tarot/single/8271", expected: "/tarot/single/[seed]" },
  { name: "tarot three seed", input: "/tarot/three/N4IgzgpgTg", expected: "/tarot/three/[seed]" },
  { name: "tarot celtic-cross seed en-prefixed", input: "/en/tarot/celtic-cross/xyz789", expected: "/en/tarot/celtic-cross/[seed]" },
  { name: "tarot unknown spread falls back to placeholder", input: "/tarot/bogus/xyz", expected: "/tarot/[spread]/[seed]" },

  // "/compatibility/<left>/<right>" — 둘 다 인코딩된 생년월일 데이터
  { name: "compatibility both sides", input: "/compatibility/N4IgzgpgTg/M5JgBgpgRg", expected: "/compatibility/[left]/[right]" },
  { name: "compatibility en-prefixed", input: "/en/compatibility/abc123/def456", expected: "/en/compatibility/[left]/[right]" },

  // 동적 세그먼트가 없는 결과 페이지 — 민감한 값은 이미 버려진 쿼리에만 있었다
  { name: "psychometrics result strips r query", input: "/psychometrics/result?r=34521982234", expected: "/psychometrics/result" },
  { name: "psychometrics types result strips r query", input: "/psychometrics/types/result?r=abc123", expected: "/psychometrics/types/result" },
  { name: "darktriad result strips r query", input: "/darktriad/result?r=998877", expected: "/darktriad/result" },
  { name: "attachment result strips run query", input: "/attachment/result?run=550e8400-e29b-41d4-a716", expected: "/attachment/result" },
  { name: "numerology result strips r query", input: "/numerology/result?r=112233", expected: "/numerology/result" },
  { name: "en-prefixed result page strips query", input: "/en/psychometrics/result?r=xyz", expected: "/en/psychometrics/result" },

  // 정적/무해 경로 — 쿼리만 있었다면 버려지고 경로는 그대로
  { name: "root path", input: "/", expected: "/" },
  { name: "root path with query", input: "/?utm_source=newsletter", expected: "/" },
  { name: "static hub page", input: "/methodology", expected: "/methodology" },
  { name: "en root", input: "/en", expected: "/en" },
  { name: "absolute url with origin", input: "https://lumina.app/psychometrics/result?r=xyz", expected: "/psychometrics/result" },
  { name: "trailing slash normalized", input: "/psychometrics/result/", expected: "/psychometrics/result" },

  // 잘못된/예상 밖 입력
  { name: "empty string", input: "", expected: null },
  { name: "whitespace only", input: "   ", expected: "/" },
];

describe("scrubAnalyticsUrl", () => {
  it.each(CASES)("$name", ({ input, expected }) => {
    expect(scrubAnalyticsUrl(input)).toBe(expected);
  });

  it("never returns a string containing a question mark", () => {
    for (const { input } of CASES) {
      const result = scrubAnalyticsUrl(input);
      if (result !== null) expect(result).not.toContain("?");
    }
  });

  it("never leaks the raw code/seed/data value into the scrubbed path", () => {
    const sensitiveTokens = [
      "N4IgzgpgTgxg9g",
      "1jkPPAwFe0004D",
      "1beBJ729A4jAJM",
      "1de8h6G3Ac",
      "1ak3t1k03_",
      "8271",
      "xyz789",
      "M5JgBgpgRg",
    ];
    for (const { input } of CASES) {
      const result = scrubAnalyticsUrl(input);
      if (result === null) continue;
      for (const token of sensitiveTokens) {
        expect(result).not.toContain(token);
      }
    }
  });

  it("rejects non-string input at runtime even though the type is string", () => {
    expect(scrubAnalyticsUrl(null as unknown as string)).toBeNull();
    expect(scrubAnalyticsUrl(undefined as unknown as string)).toBeNull();
  });
});
