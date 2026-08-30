import { describe, expect, it } from "vitest";
import { planetPosition } from "@engine/astro";
import { buildMandalaModel, MANDALA_FEATURES } from "../mandalaModel";

describe("home mandala model", () => {
  const instant = new Date("2026-08-21T03:00:00.000Z");

  it("contains exactly ten feature nodes including the MBTI analysis, Dark Triad, Attachment, EQ, and Cognitive", () => {
    const model = buildMandalaModel(instant);

    expect(model.nodes).toHaveLength(10);
    expect(model.nodes.map((node) => node.key)).toEqual(
      MANDALA_FEATURES.map((feature) => feature.key),
    );
    expect(model.nodes.find((node) => node.key === "jungian")?.href).toBe("/psychometrics/types");
    expect(model.nodes.find((node) => node.key === "darktriad")?.href).toBe("/darktriad");
    expect(model.nodes.find((node) => node.key === "attachment")?.href).toBe("/attachment");
    expect(model.nodes.find((node) => node.key === "eq")?.href).toBe("/eq");
    expect(model.nodes.find((node) => node.key === "cognitive")?.href).toBe("/cognitive");
  });

  it("uses dedicated navigation artwork for each newly illustrated assessment", () => {
    const imageByKey = new Map(MANDALA_FEATURES.map((feature) => [feature.key, feature.imageSrc] as const));

    expect(imageByKey.get("darktriad")).toBe("/psychometrics/darktriad/mandala.webp");
    expect(imageByKey.get("attachment")).toBe("/psychometrics/attachment/mandala.webp");
    expect(imageByKey.get("eq")).toBe("/psychometrics/eq/mandala.webp");
    expect(imageByKey.get("cognitive")).toBe("/psychometrics/cognitive/mandala.webp");
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

    // 카드가 겹치지 않는 조건은 "고정 각도"가 아니라 "균등 배치 한 칸"이다 — 노드가 늘면
    // 균등 배치로 얻을 수 있는 최대 간격 자체가 360/n으로 줄어들므로 상수 대신 n에서 구한다.
    const uniformGap = 360 / model.nodes.length;
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(uniformGap - 1e-9);
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
