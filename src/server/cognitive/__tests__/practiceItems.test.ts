import { describe, expect, it } from "vitest";

import { PRACTICE_ITEMS } from "../practiceItems";

describe("public practice item bank", () => {
  it("keeps practice item ids outside the scoring item namespace", () => {
    expect(new Set(PRACTICE_ITEMS.map((item) => item.id)).has("score:gfv1:001")).toBe(false);
    expect(PRACTICE_ITEMS.every((item) => item.id.startsWith("practice:"))).toBe(true);
  });

  it("publishes explanations only for tutorial items", () => {
    expect(PRACTICE_ITEMS.length).toBeGreaterThanOrEqual(5);
    expect(PRACTICE_ITEMS.every((item) => item.explanationKo.length > 0)).toBe(true);
    expect(PRACTICE_ITEMS.every((item) => item.explanationEn.length > 0)).toBe(true);
  });
});
