import { describe, expect, it } from "vitest";
import { assessLikertResponseQuality } from "@/lib/responseQuality";

describe("Likert response quality", () => {
  it("flags a uniformly answered scale without changing the response values", () => {
    expect(assessLikertResponseQuality([3, 3, 3, 3, 3])).toMatchObject({
      flag: "uniform",
      answeredCount: 5,
      distinctValueCount: 1,
    });
  });

  it("flags a very narrow response range but leaves varied responses unflagged", () => {
    expect(assessLikertResponseQuality([3, 4, 3, 4, 3])).toMatchObject({ flag: "narrow-range" });
    expect(assessLikertResponseQuality([1, 2, 3, 4, 5])).toMatchObject({ flag: null });
  });
});
