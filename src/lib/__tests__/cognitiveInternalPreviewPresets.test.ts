import { describe, expect, it } from "vitest";
import { INTERNAL_PREVIEW_PRESETS, resolveInternalPreviewPreset } from "../cognitiveInternalPreviewPresets";

describe("cognitive internal preview presets", () => {
  it("falls back to the average preset for an unknown or missing key", () => {
    expect(resolveInternalPreviewPreset(undefined)).toEqual(INTERNAL_PREVIEW_PRESETS.average);
    expect(resolveInternalPreviewPreset("not-a-real-preset")).toEqual(INTERNAL_PREVIEW_PRESETS.average);
  });

  it("resolves a known preset key", () => {
    expect(resolveInternalPreviewPreset("high")).toEqual(INTERNAL_PREVIEW_PRESETS.high);
    expect(resolveInternalPreviewPreset("low")).toEqual(INTERNAL_PREVIEW_PRESETS.low);
  });

  it("marks every preset as synthetic, never a real norm version", () => {
    for (const preset of Object.values(INTERNAL_PREVIEW_PRESETS)) {
      expect(preset.normVersion).toBe("internal-preview-synthetic-v1");
    }
  });
});
