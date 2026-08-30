import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";

/**
 * 품질 게이트: "i18n: ko/en 전 화면 누락 키 0건".
 *
 * 두 메시지 카탈로그의 키 집합이 정확히 같은지 기계적으로 검사한다 — 이후 누군가
 * 한쪽에만 키를 추가하면 이 테스트가 즉시 잡아낸다.
 */

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue };

function collectKeyPaths(obj: JsonValue, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("메시지 카탈로그 — ko/en 키 완전 일치", () => {
  const koKeys = new Set(collectKeyPaths(ko));
  const enKeys = new Set(collectKeyPaths(en));

  it("두 카탈로그 모두 비어 있지 않다", () => {
    expect(koKeys.size).toBeGreaterThan(50);
    expect(enKeys.size).toBeGreaterThan(50);
  });

  it("en.json 에 없는 ko.json 키가 없다 (번역 누락 0건)", () => {
    const missing = [...koKeys].filter((k) => !enKeys.has(k));
    expect(missing).toEqual([]);
  });

  it("ko.json 에 없는 en.json 키가 없다 (유령 키 0건)", () => {
    const extra = [...enKeys].filter((k) => !koKeys.has(k));
    expect(extra).toEqual([]);
  });

  it("모든 리프 값이 빈 문자열이 아니다", () => {
    for (const [locale, keys, source] of [
      ["ko", koKeys, ko] as const,
      ["en", enKeys, en] as const,
    ]) {
      for (const path of keys) {
        const value = path.split(".").reduce<unknown>((acc, seg) => {
          if (acc && typeof acc === "object" && seg in acc) {
            return (acc as Record<string, unknown>)[seg];
          }
          return undefined;
        }, source);
        expect(typeof value === "string" && value.trim().length > 0, `${locale}:${path}`).toBe(
          true,
        );
      }
    }
  });

  it("ko 값의 {placeholder} 자리표시자가 en 에도 같은 이름으로 존재한다", () => {
    const placeholderRe = /\{(\w+)\}/g;
    const mismatches: string[] = [];

    function walk(koNode: JsonValue | undefined, enNode: JsonValue | undefined, path: string): void {
      if (koNode === undefined || enNode === undefined) return;
      if (typeof koNode === "string" && typeof enNode === "string") {
        const koPh = [...koNode.matchAll(placeholderRe)].map((m) => m[1]).sort();
        const enPh = [...enNode.matchAll(placeholderRe)].map((m) => m[1]).sort();
        if (JSON.stringify(koPh) !== JSON.stringify(enPh)) {
          mismatches.push(`${path}: ko=[${koPh}] en=[${enPh}]`);
        }
        return;
      }
      if (koNode && typeof koNode === "object" && enNode && typeof enNode === "object") {
        for (const key of Object.keys(koNode)) {
          walk(
            (koNode as Record<string, JsonValue>)[key],
            (enNode as Record<string, JsonValue>)[key],
            path ? `${path}.${key}` : key,
          );
        }
      }
    }

    walk(ko, en, "");
    expect(mismatches).toEqual([]);
  });

  it("모든 ValidationStatus에 한글·영문 라벨이 있다", () => {
    const statuses = [
      "validatedTargetPopulation",
      "validatedOtherPopulation",
      "translationNotValidated",
      "derived",
      "experimental",
    ] as const;

    for (const catalog of [ko, en]) {
      for (const status of statuses) {
        expect(catalog.common.evidenceStatus[status].trim()).not.toBe("");
      }
    }
  });

  it("공개 유형 분석 문구는 MBTI 명칭을 사용한다", () => {
    expect(JSON.stringify(ko)).not.toContain("융 유형 렌즈");
    expect(JSON.stringify(en)).not.toContain("Jungian Type Lens");
    expect(JSON.stringify(ko)).toContain("MBTI 유형 분석");
    expect(JSON.stringify(en)).toContain("MBTI Type Analysis");
  });

  it("다크 트라이어드 문구는 한국판 연구의 2요인 한계를 숨기지 않는다", () => {
    expect(ko.darktriad.heroBody).toContain("2요인");
    expect(en.darktriad.heroBody).toContain("two-factor");
    expect(ko.darktriad.heroBody).not.toContain("한국어 문항과 3요인 구조는 표적 집단에서 추가 검증이 필요");
  });
});
