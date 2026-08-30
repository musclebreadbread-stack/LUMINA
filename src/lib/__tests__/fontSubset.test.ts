import { describe, expect, it } from "vitest";
import {
  isFontManifest,
  rangeContainsCodePoint,
  selectSubsets,
  subsetSupportsText,
  type FontManifest,
} from "../og/fontSubset";

describe("rangeContainsCodePoint", () => {
  it("matches a code point inside any token of a multi-token range", () => {
    const range = "U+0041-005A, U+0061-007A";

    expect(rangeContainsCodePoint(range, 0x41)).toBe(true);
    expect(rangeContainsCodePoint(range, 0x7a)).toBe(true);
    expect(rangeContainsCodePoint(range, 0x30)).toBe(false);
  });

  it("matches a single-codepoint token where start and end are the same", () => {
    expect(rangeContainsCodePoint("U+AC00", 0xac00)).toBe(true);
    expect(rangeContainsCodePoint("U+AC00", 0xac01)).toBe(false);
  });

  it("accepts lowercase hex tokens", () => {
    expect(rangeContainsCodePoint("u+ac00-d7a3", 0xd000)).toBe(true);
  });
});

describe("subsetSupportsText", () => {
  it("selects true only when at least one character in the text is in range", () => {
    const hangulSubset = { file: "sans-korean-500-normal.woff", range: "U+AC00-D7A3" };
    const latinSubset = { file: "sans-latin-500-normal.woff", range: "U+0041-005A" };

    expect(subsetSupportsText(hangulSubset, "가나다")).toBe(true);
    expect(subsetSupportsText(latinSubset, "가나다")).toBe(false);
    expect(subsetSupportsText(latinSubset, "ABC 가나다")).toBe(true);
  });
});

describe("selectSubsets", () => {
  it("returns exactly the subsets that contain a codepoint present in the text", () => {
    const manifest: FontManifest = {
      serif: {
        korean: { file: "serif-korean.woff", range: "U+AC00-D7A3" },
        latin: { file: "serif-latin.woff", range: "U+0041-005A" },
      },
      sans: {
        korean: { file: "sans-korean.woff", range: "U+AC00-D7A3" },
      },
    };

    const selected = selectSubsets(manifest, "serif", "가나다");

    expect(selected).toEqual([{ file: "serif-korean.woff", range: "U+AC00-D7A3" }]);
  });

  it("returns an empty list when no subset matches", () => {
    const manifest: FontManifest = {
      serif: { latin: { file: "serif-latin.woff", range: "U+0041-005A" } },
      sans: {},
    };

    expect(selectSubsets(manifest, "serif", "가나다")).toEqual([]);
  });
});

describe("isFontManifest", () => {
  it("accepts a well-formed manifest with serif and sans families", () => {
    const manifest = {
      serif: { korean: { file: "a.woff", range: "U+AC00-D7A3" } },
      sans: { korean: { file: "b.woff", range: "U+AC00-D7A3" } },
    };

    expect(isFontManifest(manifest)).toBe(true);
  });

  it("rejects a manifest missing the sans family", () => {
    const manifest = { serif: { korean: { file: "a.woff", range: "U+AC00-D7A3" } } };

    expect(isFontManifest(manifest)).toBe(false);
  });

  it("rejects a subset missing the file field", () => {
    const manifest = {
      serif: { korean: { range: "U+AC00-D7A3" } },
      sans: {},
    };

    expect(isFontManifest(manifest)).toBe(false);
  });

  it("rejects a subset missing the range field", () => {
    const manifest = {
      serif: { korean: { file: "a.woff" } },
      sans: {},
    };

    expect(isFontManifest(manifest)).toBe(false);
  });

  it("rejects a subset whose fields have the wrong type", () => {
    const manifest = {
      serif: { korean: { file: 123, range: "U+AC00-D7A3" } },
      sans: {},
    };

    expect(isFontManifest(manifest)).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isFontManifest(null)).toBe(false);
    expect(isFontManifest(undefined)).toBe(false);
    expect(isFontManifest("not-a-manifest")).toBe(false);
    expect(isFontManifest(42)).toBe(false);
    expect(isFontManifest([])).toBe(false);
  });
});
