import { afterEach, describe, expect, it } from "vitest";
import {
  __resetWorldLocationsForTests,
  isWorldLocationsLoaded,
  searchLocations,
} from "../locationSearch";

afterEach(() => {
  __resetWorldLocationsForTests(null);
});

describe("searchLocations — domestic", () => {
  it("returns no results for an empty query", () => {
    expect(searchLocations("")).toEqual([]);
    expect(searchLocations("   ")).toEqual([]);
  });

  it("finds a Korean si/gun/gu by partial name", () => {
    const results = searchLocations("의정부");
    expect(results.some((r) => r.ko === "경기도 의정부시" && r.source === "domestic")).toBe(true);
  });

  it("matches the English romanization too", () => {
    const results = searchLocations("uijeongbu");
    expect(results.some((r) => r.ko === "경기도 의정부시")).toBe(true);
  });
});

describe("searchLocations — world (before load)", () => {
  it("returns only domestic matches when the world dataset hasn't loaded", () => {
    expect(isWorldLocationsLoaded()).toBe(false);
    const results = searchLocations("Paris");
    expect(results).toEqual([]);
  });
});

describe("searchLocations — world (after load)", () => {
  it("finds overseas cities once loaded, with country appended", () => {
    __resetWorldLocationsForTests([
      ["Paris", "FR", 48.85341, 2.3488],
      ["Paris", "US", 33.66094, -95.55551],
      ["New York City", "US", 40.71427, -74.00597],
    ]);
    expect(isWorldLocationsLoaded()).toBe(true);

    const results = searchLocations("Paris");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.source === "world")).toBe(true);
    expect(results.some((r) => r.en.includes("France"))).toBe(true);
    expect(results.some((r) => r.en.includes("United States"))).toBe(true);
  });

  it("resolves a Korean exonym alias to the matching world row", () => {
    __resetWorldLocationsForTests([
      ["Paris", "FR", 48.85341, 2.3488],
      ["New York City", "US", 40.71427, -74.00597],
    ]);
    const results = searchLocations("뉴욕");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ ko: "뉴욕", lat: 40.71427, lng: -74.00597, source: "world" });
  });

  it("does not duplicate a result reachable through both a direct match and an alias", () => {
    __resetWorldLocationsForTests([["Tokyo", "JP", 35.6895, 139.69171]]);
    const results = searchLocations("Tokyo");
    expect(results).toHaveLength(1);
  });

  it("caps results at the requested limit", () => {
    __resetWorldLocationsForTests(
      Array.from({ length: 20 }, (_, i) => [`Springfield ${i}`, "US", 30 + i, -90]),
    );
    expect(searchLocations("Springfield", 5)).toHaveLength(5);
  });
});
