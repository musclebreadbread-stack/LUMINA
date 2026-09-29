import { describe, expect, it } from "vitest";
import { buildAstroView, formatPlanetPosition } from "../astroModel";
import { DEFAULT_PROFILE, type StoredProfile } from "../profile";

const REF = new Date("2026-01-01T00:00:00Z");

describe("formatPlanetPosition", () => {
  const base = { signKo: "사자자리", signEn: "Leo", degreeInSign: 12.5666, retrograde: false };

  it("uses the Korean sign name for ko and English for every other locale", () => {
    expect(formatPlanetPosition(base, "ko")).toBe("사자자리 12°33′");
    expect(formatPlanetPosition(base, "en")).toBe("Leo 12°33′");
  });

  it("zero-pads minutes and appends R for retrograde", () => {
    expect(formatPlanetPosition({ ...base, degreeInSign: 3.0, retrograde: true }, "en")).toBe("Leo 3°00′ R");
  });

  it("floors instead of rounding minutes", () => {
    expect(formatPlanetPosition({ ...base, degreeInSign: 29.999 }, "en")).toBe("Leo 29°59′");
  });
});

describe("buildAstroView", () => {
  const view = buildAstroView(DEFAULT_PROFILE, REF);

  it("is deterministic and ignores the reference date", () => {
    expect(buildAstroView(DEFAULT_PROFILE, new Date("1999-01-01T00:00:00Z"))).toEqual(view);
  });

  it("carries the place labels and a KST offset-aware birth ISO", () => {
    expect(view.placeLabel).toBe("서울");
    expect(view.placeLabelEn).toBe("Seoul");
    expect(view.birthLocalISO).toMatch(/^1995-06-15T12:00:00\.000\+09:00$/);
    expect(view.timeUnknown).toBe(false);
    expect(view.precision.timeZone).toBe("Asia/Seoul");
    expect(view.precision.offsetLabel).toBe("UTC+9");
    expect(view.precision.obliquity).toMatch(/^\d+\.\d{4}°$/);
  });

  it("builds a big three with a rising sign and 10 planets whose balance sums up", () => {
    expect(view.bigThree.rising).not.toBeNull();
    expect(view.bigThree.sun.signIndex).toBeGreaterThanOrEqual(0);
    expect(view.planets.length).toBeGreaterThan(0);
    const total = view.planets.length;
    expect(view.balance.elements.map((e) => e.key)).toEqual(["fire", "earth", "air", "water"]);
    expect(view.balance.modalities.map((m) => m.key)).toEqual(["cardinal", "fixed", "mutable"]);
    expect(view.balance.elements.reduce((s, e) => s + e.count, 0)).toBe(total);
    expect(view.balance.modalities.reduce((s, m) => s + m.count, 0)).toBe(total);
  });

  it("agrees between planets, wheel and explanations", () => {
    expect(view.wheel.planets).toHaveLength(view.planets.length);
    expect(view.explanations.placements).toHaveLength(view.planets.length);
    expect(Object.isFrozen(view.explanations.placements)).toBe(true);
    for (const p of view.wheel.planets) {
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
      expect(p.isLuminary).toBe(p.key === "sun" || p.key === "moon");
    }
    expect(view.wheel.houseSystem).toBe("whole");
    expect(view.wheel.houseCusps).toHaveLength(12);
    expect(view.wheel.ascendant).not.toBeNull();
    expect(view.wheel.midheaven).not.toBeNull();
    expect(view.wheel.aspectLines).toHaveLength(view.aspects.length);
    for (const a of view.aspects) expect(a.orb).toMatch(/^\d+\.\d°$/);
  });

  it("always includes the houseSystem note and adds dst only when in DST", () => {
    expect(view.notes).toEqual([{ key: "houseSystem" }]);
    const summer: StoredProfile = {
      ...DEFAULT_PROFILE,
      year: 1988,
      month: 7,
      day: 20,
      placeLabel: "뉴욕",
      placeLabelEn: "New York",
      lat: 40.7128,
      lng: -74.006,
      timeZone: "America/New_York",
    };
    const v = buildAstroView(summer, REF);
    expect(v.precision.isDST).toBe(true);
    expect(v.precision.offsetLabel).toBe("UTC−4");
    expect(v.notes.map((n) => n.key)).toEqual(["dst", "houseSystem"]);
  });

  it("omits angles, house cusps and rising when the birth time is unknown", () => {
    const v = buildAstroView({ ...DEFAULT_PROFILE, hour: null, minute: null }, REF);
    expect(v.timeUnknown).toBe(true);
    expect(v.bigThree.rising).toBeNull();
    expect(v.wheel.ascendant).toBeNull();
    expect(v.wheel.midheaven).toBeNull();
    expect(v.wheel.houseCusps).toEqual([]);
    expect(v.planets.every((p) => p.house === null)).toBe(true);
    const keys = v.notes.map((n) => n.key);
    expect(keys).toContain("timeUnknown");
    expect(keys.at(-1)).toBe("houseSystem");
  });

  it("flags polar latitude and falls back from Placidus to equal houses", () => {
    const polar: StoredProfile = {
      ...DEFAULT_PROFILE,
      placeLabel: "트롬쇠",
      placeLabelEn: "Tromso",
      lat: 78.2232,
      lng: 15.6267,
      timeZone: "Arctic/Longyearbyen",
    };
    const v = buildAstroView(polar, REF, "placidus");
    expect(v.notes.map((n) => n.key)).toEqual(
      expect.arrayContaining(["polarLatitude", "houseSystem", "houseFallback"]),
    );
    expect(v.wheel.houseFallback).toBe(true);
    expect(v.notes.at(-1)).toEqual({ key: "houseFallback" });
  });

  it("honours the requested house system", () => {
    expect(buildAstroView(DEFAULT_PROFILE, REF, "equal").wheel.houseSystem).toBe("equal");
    const placidus = buildAstroView(DEFAULT_PROFILE, REF, "placidus");
    expect(placidus.wheel.houseSystem).toBe("placidus");
    expect(placidus.wheel.houseFallback).toBe(false);
  });

  it("formats half-hour offsets with padded minutes", () => {
    const india: StoredProfile = {
      ...DEFAULT_PROFILE,
      placeLabel: "뭄바이",
      placeLabelEn: "Mumbai",
      lat: 19.076,
      lng: 72.8777,
      timeZone: "Asia/Kolkata",
    };
    expect(buildAstroView(india, REF).precision.offsetLabel).toBe("UTC+5:30");
  });
});
