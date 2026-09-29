import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { MemberProfile } from "@/server/member/profileSchema";
import { forecastFromProfile } from "../forecastFromProfile";

const PROFILE: MemberProfile = {
  year: 1990,
  month: 5,
  day: 14,
  calendar: "solar",
  isLeapMonth: false,
  hour: 10,
  minute: 30,
  gender: "unspecified",
  dayBoundaryRule: "zi23",
  placeLabel: "서울",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
};

describe("forecastFromProfile", () => {
  it("builds a 2027 forecast from a full member profile, defaulting to a pending expert review status", () => {
    const forecast = forecastFromProfile(PROFILE);
    expect(forecast.expertReviewStatus).toBe("pending");
    expect(forecast.blocks.length).toBeGreaterThan(0);
  });

  it("reflects an approved expert review status when explicitly passed", () => {
    const forecast = forecastFromProfile(PROFILE, { expertReviewStatus: "approved" });
    expect(forecast.expertReviewStatus).toBe("approved");
  });

  it("computes a forecast for a profile with an unknown birth time (null hour/minute)", () => {
    const forecast = forecastFromProfile({ ...PROFILE, hour: null, minute: null });
    expect(forecast.blocks.length).toBeGreaterThan(0);
  });
});
