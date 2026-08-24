import { describe, expect, it } from "vitest";
import { ANALYSIS_CATALOG, analysisDefinition } from "@/lib/analysisCatalog";

describe("analysis evidence catalog", () => {
  it("contains every user-facing analysis exactly once", () => {
    const keys = ANALYSIS_CATALOG.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      "saju",
      "astro",
      "tarot",
      "numerology",
      "psychometrics",
      "jungian",
      "darktriad",
      "attachment",
      "horoscope",
      "compatibility",
    ]);
  });

  it("does not describe derived or unvalidated methods as target-population validated", () => {
    expect(analysisDefinition("jungian").evidence.validationStatus).toBe("derived");
    expect(analysisDefinition("attachment").evidence.validationStatus).toBe("experimental");
    expect(analysisDefinition("darktriad").evidence.validationStatus).toBe(
      "translation-not-validated",
    );
  });
});
