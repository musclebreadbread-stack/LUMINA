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
      "eq",
      "cognitive",
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
    expect(analysisDefinition("eq").evidence.validationStatus).toBe("translation-not-validated");
    expect(analysisDefinition("cognitive").evidence.validationStatus).toBe("experimental");
  });

  it("claims no norm sample for the cognitive exploration", () => {
    // 규준이 없다는 사실이 카탈로그에서 조용히 사라지면 백분위·IQ 환산치가 되살아날 자리가 생긴다.
    expect(analysisDefinition("cognitive").evidence.normSource).toBeNull();
    expect(analysisDefinition("cognitive").evidence.limitations.length).toBe(4);
  });
});
