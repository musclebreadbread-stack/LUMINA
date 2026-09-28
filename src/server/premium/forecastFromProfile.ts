import "server-only";

import { computeSaju } from "@engine/saju";
import { buildYearForecast, type YearForecast } from "@engine/saju/yearForecast";
import type { MemberProfile } from "@/server/member/profileSchema";

/** Shared by the report page and the AI narrative route — previously two identical copies. */
export function forecastFromProfile(
  profile: MemberProfile,
  options?: Readonly<{ expertReviewStatus?: "pending" | "approved" }>,
): YearForecast {
  return buildYearForecast(computeSaju({
    date: { year: profile.year, month: profile.month, day: profile.day },
    calendar: profile.calendar,
    isLeapMonth: profile.isLeapMonth,
    ...(profile.hour !== null && profile.minute !== null ? { time: { hour: profile.hour, minute: profile.minute } } : {}),
    place: { lat: profile.lat, lng: profile.lng, label: profile.placeLabel, timeZone: profile.timeZone },
    gender: profile.gender,
  }, { dayBoundaryRule: profile.dayBoundaryRule }), 2027, options);
}
