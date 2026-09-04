import LZString from "lz-string";
import { daysInGregorianMonth, type CalendarType, type Gender } from "@engine/shared/birth";
import type { StoredProfile } from "./profile";

/**
 * 공유 링크 인코딩.
 *
 * 결과를 서버에 저장하지 않는다 — 입력값 자체를 URL에 담고, 링크를 여는 쪽에서
 * 다시 계산한다. 그래서 같은 링크는 언제 열어도 같은 결과를 낸다.
 * 이름 같은 식별 정보는 애초에 받지 않으므로 링크에 담길 것도 없다.
 */

const GENDERS: readonly Gender[] = ["unspecified", "male", "female"];
const CALENDARS: readonly CalendarType[] = ["solar", "lunar"];
const PROFILE_PAYLOAD_VERSION = "profile-v2";

/** 필드 순서를 고정한 배열로 줄여 URL 길이를 아낀다. */
type Packed = [
  year: number,
  month: number,
  day: number,
  calendar: number,
  leap: number,
  hour: number,
  minute: number,
  gender: number,
  lat: number,
  lng: number,
  timeZone: string,
  placeLabel: string,
  dayBoundaryRule: number,
  placeLabelEn: string,
];

export function encodeProfile(profile: StoredProfile): string {
  const packed: Packed = [
    profile.year,
    profile.month,
    profile.day,
    CALENDARS.indexOf(profile.calendar),
    profile.isLeapMonth ? 1 : 0,
    profile.hour ?? -1,
    profile.minute ?? -1,
    Math.max(0, GENDERS.indexOf(profile.gender)),
    Math.round(profile.lat * 1e4) / 1e4,
    Math.round(profile.lng * 1e4) / 1e4,
    profile.timeZone,
    profile.placeLabel,
    profile.dayBoundaryRule === "midnight" ? 1 : 0,
    profile.placeLabelEn,
  ];
  return LZString.compressToEncodedURIComponent(JSON.stringify([PROFILE_PAYLOAD_VERSION, ...packed]));
}

export function decodeProfile(encoded: string): StoredProfile | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;

    const isVersionedPayload = parsed[0] === PROFILE_PAYLOAD_VERSION;
    if (isVersionedPayload && parsed.length !== 15) return null;

    const p = isVersionedPayload ? parsed.slice(1) : parsed;
    if (p.length !== 12 && p.length !== 13 && p.length !== 14) return null;

    const [year, month, day, calendar, leap, hour, minute, gender, lat, lng, timeZone, placeLabel, dayBoundary, placeLabelEn] =
      p;

    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31 ||
      !Number.isInteger(calendar) ||
      calendar < 0 ||
      calendar >= CALENDARS.length ||
      (calendar === 0 && day > daysInGregorianMonth(year, month)) ||
      (leap !== 0 && leap !== 1) ||
      !Number.isInteger(hour) ||
      hour < -1 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < -1 ||
      minute > 59 ||
      !Number.isInteger(gender) ||
      gender < 0 ||
      gender >= GENDERS.length ||
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180 ||
      typeof timeZone !== "string" ||
      timeZone.length === 0 ||
      timeZone.length > 100 ||
      typeof placeLabel !== "string" ||
      placeLabel.length > 120 ||
      (p.length >= 13 && dayBoundary !== 0 && dayBoundary !== 1) ||
      (p.length === 14 && (typeof placeLabelEn !== "string" || placeLabelEn.length > 120))
    ) {
      return null;
    }

    return {
      year,
      month,
      day,
      calendar: CALENDARS[calendar] ?? "solar",
      isLeapMonth: leap === 1,
      hour: hour < 0 ? null : hour,
      minute: minute < 0 ? null : minute,
      gender: GENDERS[gender] ?? "unspecified",
      lat,
      lng,
      timeZone,
      placeLabel,
      placeLabelEn: p.length === 14 ? (placeLabelEn as string) : "",
      dayBoundaryRule: p.length >= 13 && dayBoundary === 1 ? "midnight" : "zi23",
    };
  } catch {
    return null;
  }
}
