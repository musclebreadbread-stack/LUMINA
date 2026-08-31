import { describe, expect, it } from "vitest";
import {
  LENS_SCENE_BUDGET,
  LENS_SCENE_PALETTES,
  type LensScenePreset,
} from "@/lib/scene3dAssets";

describe("procedural lens scene contract", () => {
  it("keeps every supported preset on the local palette", () => {
    const presets: readonly LensScenePreset[] = ["result", "relationship", "evidence"];

    expect(Object.keys(LENS_SCENE_PALETTES).sort()).toEqual([...presets].sort());
    for (const preset of presets) {
      expect(LENS_SCENE_PALETTES[preset].primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(LENS_SCENE_PALETTES[preset].secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(LENS_SCENE_PALETTES[preset].tertiary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(LENS_SCENE_PALETTES[preset].glow).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("stays within the low-cost renderer budget", () => {
    expect(LENS_SCENE_BUDGET.maxParticles).toBeLessThanOrEqual(48);
    expect(LENS_SCENE_BUDGET.maxMaterials).toBeLessThanOrEqual(4);
    expect(LENS_SCENE_BUDGET.maxCanvasPerRoute).toBe(1);
    expect(LENS_SCENE_BUDGET.maxDevicePixelRatio).toBeLessThanOrEqual(1.25);
  });
});
