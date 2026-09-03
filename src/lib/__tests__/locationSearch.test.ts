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
      ["Paris", "FR", 48.85341, 2.3488, ""],
      ["Paris", "US", 33.66094, -95.55551, "Texas"],
      ["New York City", "US", 40.71427, -74.00597, "New York"],
    ]);
    expect(isWorldLocationsLoaded()).toBe(true);

    const results = searchLocations("Paris");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.source === "world")).toBe(true);
    expect(results.some((r) => r.en === "Paris, France")).toBe(true);
    expect(results.some((r) => r.en === "Paris, Texas, United States")).toBe(true);
  });

  it("disambiguates same-name cities in the same country using admin1", () => {
    __resetWorldLocationsForTests([
      ["Springfield", "US", 39.80172, -89.64371, "Illinois"],
      ["Springfield", "US", 42.10148, -72.58981, "Massachusetts"],
    ]);
    const results = searchLocations("Springfield");
    expect(results).toHaveLength(2);
    expect(results.some((r) => r.en === "Springfield, Illinois, United States")).toBe(true);
    expect(results.some((r) => r.en === "Springfield, Massachusetts, United States")).toBe(true);
  });

  it("falls back to name and country when admin1 is unavailable", () => {
    __resetWorldLocationsForTests([["Oranjestad", "AW", 12.52398, -70.02703, ""]]);
    const results = searchLocations("Oranjestad");
    expect(results).toHaveLength(1);
    expect(results[0]?.en).toBe("Oranjestad, Aruba");
  });

  it("resolves a Korean exonym alias to the matching world row", () => {
    __resetWorldLocationsForTests([
      ["Paris", "FR", 48.85341, 2.3488, ""],
      ["New York City", "US", 40.71427, -74.00597, "New York"],
    ]);
    const results = searchLocations("뉴욕");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ ko: "뉴욕", lat: 40.71427, lng: -74.00597, source: "world" });
  });

  it("does not duplicate a result reachable through both a direct match and an alias", () => {
    __resetWorldLocationsForTests([["Tokyo", "JP", 35.6895, 139.69171, "Tokyo"]]);
    const results = searchLocations("Tokyo");
    expect(results).toHaveLength(1);
  });

  it("caps results at the requested limit", () => {
    __resetWorldLocationsForTests(
      Array.from({ length: 20 }, (_, i) => [`Springfield ${i}`, "US", 30 + i, -90, ""]),
    );
    expect(searchLocations("Springfield", 5)).toHaveLength(5);
  });
});
