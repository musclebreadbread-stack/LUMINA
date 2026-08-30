/**
 * OG 카드 폰트 매니페스트 타입과 서브셋 선택 로직.
 *
 * 순수 함수만 둔다 — 파일을 실제로 읽는 I/O 는 fonts.ts 가 맡는다.
 */

export type FontFamilyKey = "serif" | "sans";

export interface FontSubset {
  readonly file: string;
  readonly range: string;
}

export type FontManifest = Record<FontFamilyKey, Record<string, FontSubset>>;

export function isFontManifest(value: unknown): value is FontManifest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Record<FontFamilyKey, unknown>>;
  return (["serif", "sans"] as const).every((key) => {
    const family = candidate[key];
    if (!family || typeof family !== "object") return false;

    return Object.values(family).every((subset) => {
      if (!subset || typeof subset !== "object") return false;
      const entry = subset as Partial<FontSubset>;
      return typeof entry.file === "string" && typeof entry.range === "string";
    });
  });
}

export function rangeContainsCodePoint(range: string, codePoint: number): boolean {
  return range.split(",").some((token) => {
    const values = token.trim().toUpperCase().replace(/^U\+/, "").split("-");
    const start = Number.parseInt(values[0] ?? "", 16);
    const end = Number.parseInt(values[1] ?? values[0] ?? "", 16);

    return Number.isFinite(start) && Number.isFinite(end) && codePoint >= start && codePoint <= end;
  });
}

export function subsetSupportsText(subset: FontSubset, text: string): boolean {
  return [...text].some((character) =>
    rangeContainsCodePoint(subset.range, character.codePointAt(0) ?? -1),
  );
}

export function selectSubsets(
  manifest: FontManifest,
  family: FontFamilyKey,
  text: string,
): readonly FontSubset[] {
  return Object.values(manifest[family]).filter((subset) => subsetSupportsText(subset, text));
}
