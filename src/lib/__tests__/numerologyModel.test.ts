import { describe, expect, it } from "vitest";
import { buildNumerologyView, isPublicDestinyValue } from "@/lib/numerologyModel";

describe("public numerology result model", () => {
  it("builds a destiny card from a safe derived value without retaining a name or letter trace", () => {
    const view = buildNumerologyView({ year: 1990, month: 5, day: 20 }, null, 6);

    expect(view.name).toBeNull();
    expect(view.destiny).toMatchObject({ kind: "destiny", value: 6, calculation: "public" });
    if (view.destiny?.kind !== "destiny") throw new Error("expected a destiny card");
    expect(view.destiny.letterValues).toBeUndefined();
    expect(view.destiny.trace).toBeUndefined();
  });

  it("accepts only reduced single digits and configured master numbers", () => {
    expect(isPublicDestinyValue(1)).toBe(true);
    expect(isPublicDestinyValue(33)).toBe(true);
    expect(isPublicDestinyValue(10)).toBe(false);
    expect(isPublicDestinyValue(44)).toBe(false);
  });

  it("uses the same derived destiny value for a private calculation and the share-safe card", () => {
    const privateView = buildNumerologyView({ year: 1990, month: 5, day: 20 }, "HONG GILDONG");
    if (privateView.destiny?.kind !== "destiny") throw new Error("expected a destiny card");

    expect(privateView.destiny.value).toBe(4);
    expect(buildNumerologyView({ year: 1990, month: 5, day: 20 }, null, privateView.destiny.value).destiny).toMatchObject({
      value: 4,
      calculation: "public",
    });
  });
});
