import { describe, expect, it } from "vitest";

import { itemInformation, probabilityCorrect } from "../irt";

describe("3PL item functions", () => {
  const item = { discrimination: 1.2, difficulty: 0, guessing: 0.25 } as const;

  it("is bounded by guessing and one", () => {
    expect(probabilityCorrect(-8, item)).toBeGreaterThanOrEqual(item.guessing);
    expect(probabilityCorrect(8, item)).toBeLessThanOrEqual(1);
  });

  it("has positive information near its difficulty", () => {
    expect(itemInformation(0, item)).toBeGreaterThan(0);
  });

  it("rejects invalid item parameters", () => {
    expect(() => probabilityCorrect(0, { ...item, discrimination: 0 })).toThrow(
      "discrimination",
    );
    expect(() => probabilityCorrect(0, { ...item, guessing: 1 })).toThrow("guessing");
  });
});
