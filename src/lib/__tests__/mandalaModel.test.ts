import { describe, expect, it } from "vitest";
import { planetPosition } from "@engine/astro";
import { buildMandalaModel, MANDALA_FEATURES } from "../mandalaModel";

describe("home mandala model", () => {
  const instant = new Date("2026-08-21T03:00:00.000Z");

  it("contains exactly eight feature nodes including the Jungian lens, Dark Triad, and Attachment", () => {
    const model = buildMandalaModel(instant);

    expect(model.nodes).toHaveLength(8);
    expect(model.nodes.map((node) => node.key)).toEqual(
      MANDALA_FEATURES.map((feature) => feature.key),
    );
    expect(model.nodes.find((node) => node.key === "jungian")?.href).toBe("/psychometrics/types");
    expect(model.nodes.find((node) => node.key === "darktriad")?.href).toBe("/darktriad");
    expect(model.nodes.find((node) => node.key === "attachment")?.href).toBe("/attachment");
  });

  it("uses the independent astro position as the initial angle and preserves direction", () => {
    const model = buildMandalaModel(instant);

    for (const node of model.nodes) {
      const expected = planetPosition(node.planetKey, instant);
      expect(node.longitude).toBeCloseTo(expected.longitude, 8);
      expect(node.speedPerDay).toBeCloseTo(expected.speedPerDay, 8);
      expect(node.retrograde).toBe(expected.retrograde);
      expect(node.orbitalPeriodDays).toBeGreaterThan(0);
      expect(node.visualDurationSeconds).toBeGreaterThanOrEqual(28);
      expect(node.visualDurationSeconds).toBeLessThanOrEqual(124);
    }
  });

  it("packs crowded presentation angles without changing astronomical longitudes", () => {
    const model = buildMandalaModel(instant);
    const angles = model.nodes.map((node) => node.displayLongitude).sort((a, b) => a - b);
    const gaps = angles.map((angle, index) => {
      const next = angles[(index + 1) % angles.length];
      return next === undefined ? 360 : (next - angle + 360) % 360;
    });

    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(42);
    for (const node of model.nodes) {
      const expected = planetPosition(node.planetKey, instant);
      expect(node.longitude).toBeCloseTo(expected.longitude, 8);
    }
  });

  it("exposes an astronomical moon phase and illumination percentage", () => {
    const model = buildMandalaModel(instant);

    expect(model.sky.moonPhaseAngle).toBeGreaterThanOrEqual(0);
    expect(model.sky.moonPhaseAngle).toBeLessThan(360);
    expect(model.sky.moonIlluminationPercent).toBeGreaterThanOrEqual(0);
    expect(model.sky.moonIlluminationPercent).toBeLessThanOrEqual(100);
  });
});
