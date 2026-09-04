import LZString from "lz-string";
import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type StoredProfile } from "../profile";
import { decodeProfile, encodeProfile } from "../share";

function encodePacked(value: readonly unknown[]): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(value));
}

describe("profile share payload", () => {
  it("round-trips the supported profile fields", () => {
    const profile: StoredProfile = {
      ...DEFAULT_PROFILE,
      hour: null,
      minute: null,
      gender: "female",
      lat: -33.86881234,
      lng: 151.20934567,
      timeZone: "Australia/Sydney",
      placeLabel: "시드니",
    };

    expect(decodeProfile(encodeProfile(profile))).toEqual({
      ...profile,
      lat: -33.8688,
      lng: 151.2093,
    });
  });

  it("writes the explicit current payload version", () => {
    const encoded = encodeProfile(DEFAULT_PROFILE);
    const raw = LZString.decompressFromEncodedURIComponent(encoded);

    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "null")).toHaveLength(15);
    expect(JSON.parse(raw ?? "null")[0]).toBe("profile-v2");
  });

  it("keeps the selected day-boundary convention in new links", () => {
    const profile: StoredProfile = { ...DEFAULT_PROFILE, dayBoundaryRule: "midnight" };
    expect(decodeProfile(encodeProfile(profile))?.dayBoundaryRule).toBe("midnight");
  });

  it("keeps decoding a fixed current-format share link", () => {
    const fixedLink =
      "NoRgnGCsA0Bs0hgBmikAmVWDMB2AdDBrtAEQCCAzgJYCGA9AMoCmA9gK4A2pZLH3qALpA";

    expect(decodeProfile(fixedLink)).toEqual({
      year: 1995,
      month: 6,
      day: 15,
      calendar: "solar",
      isLeapMonth: false,
      hour: 12,
      minute: 0,
      gender: "unspecified",
      lat: 37.5,
      lng: 127,
      timeZone: "Asia/Seoul",
      placeLabel: "Seoul",
      placeLabelEn: "",
      dayBoundaryRule: "zi23",
    });
  });

  it("decodes a fixed 14-field link including placeLabelEn", () => {
    const fixedLink =
      "NoRgnGCsA0Bs0hgBmikAmVWDMB2AdDBrtAEQCCAzgJYCGA9AMoCmA9gK4A2pZgOIOAdYzxSkWHbgF0gA";

    expect(decodeProfile(fixedLink)).toEqual({
      year: 1995,
      month: 6,
      day: 15,
      calendar: "solar",
      isLeapMonth: false,
      hour: 12,
      minute: 0,
      gender: "unspecified",
      lat: 37.5,
      lng: 127,
      timeZone: "Asia/Seoul",
      placeLabel: "서울",
      placeLabelEn: "Seoul",
      dayBoundaryRule: "zi23",
    });
  });

  it("reads legacy twelve-field links with the historical 23:00 default", () => {
    const legacy = [
      DEFAULT_PROFILE.year,
      DEFAULT_PROFILE.month,
      DEFAULT_PROFILE.day,
      0,
      0,
      DEFAULT_PROFILE.hour,
      DEFAULT_PROFILE.minute,
      0,
      DEFAULT_PROFILE.lat,
      DEFAULT_PROFILE.lng,
      DEFAULT_PROFILE.timeZone,
      DEFAULT_PROFILE.placeLabel,
    ];
    expect(decodeProfile(encodePacked(legacy))?.dayBoundaryRule).toBe("zi23");
  });

  it("keeps lunar payloads out of Gregorian month-length validation", () => {
    const lunar = [
      1990,
      2,
      30,
      1,
      0,
      12,
      0,
      0,
      37.5,
      127,
      "Asia/Seoul",
      "서울",
      0,
      "Seoul",
    ];

    expect(decodeProfile(encodePacked(lunar))).toMatchObject({
      calendar: "lunar",
      month: 2,
      day: 30,
    });
  });

  it.each([
    ["", "empty payload"],
    ["not-a-payload", "corrupt payload"],
    [encodePacked([1, 2, 3]), "wrong field count"],
    [encodePacked(["1995", 6, 15, 0, 0, 12, 0, 0, 37.5, 127, "Asia/Seoul", "서울"]), "wrong type"],
    [encodePacked([1899, 6, 15, 0, 0, 12, 0, 0, 37.5, 127, "Asia/Seoul", "서울"]), "year range"],
    [encodePacked([1995, 2, 30, 0, 0, 12, 0, 0, 37.5, 127, "Asia/Seoul", "서울"]), "invalid date"],
    [encodePacked([1995, 6, 15, 0, 0, 24, 0, 0, 37.5, 127, "Asia/Seoul", "서울"]), "hour range"],
    [encodePacked([1995, 6, 15, 0, 0, 12, 0, 0, 91, 127, "Asia/Seoul", "서울"]), "latitude range"],
  ])("rejects %s", (encoded) => {
    expect(decodeProfile(encoded)).toBeNull();
  });
});
