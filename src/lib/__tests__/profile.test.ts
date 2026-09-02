import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, placeDisplayLabel } from "../profile";

describe("placeDisplayLabel", () => {
  it("always returns the raw label for Korean locale, regardless of placeLabelEn", () => {
    expect(placeDisplayLabel("경기도 의정부시", "Uijeongbu-si, Gyeonggi-do", "ko")).toBe("경기도 의정부시");
    expect(placeDisplayLabel("경기도 의정부시", "", "ko")).toBe("경기도 의정부시");
  });

  it("uses placeLabelEn directly when present", () => {
    expect(placeDisplayLabel("경기도 의정부시", "Uijeongbu-si, Gyeonggi-do", "en")).toBe(
      "Uijeongbu-si, Gyeonggi-do",
    );
  });

  it("falls back to the legacy 16-preset table when placeLabelEn is missing", () => {
    expect(placeDisplayLabel("서울", "", "en")).toBe("Seoul");
    expect(placeDisplayLabel("시드니", "", "en")).toBe("Sydney");
  });

  it("falls back to the raw label when neither placeLabelEn nor a legacy entry exists", () => {
    expect(placeDisplayLabel("경기도 의정부시", "", "en")).toBe("경기도 의정부시");
  });

  it("keeps DEFAULT_PROFILE consistent with the legacy table", () => {
    expect(placeDisplayLabel(DEFAULT_PROFILE.placeLabel, DEFAULT_PROFILE.placeLabelEn, "en")).toBe("Seoul");
  });
});
