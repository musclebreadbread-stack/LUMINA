/** 모든 출생 기반 엔진(사주/점성술/수비학)이 공유하는 입력 타입. */

export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female" | "unspecified";

export interface BirthPlace {
  /** 위도 (-90 ~ 90) */
  lat: number;
  /** 경도 (-180 ~ 180) */
  lng: number;
  /** IANA 타임존. 생략하면 좌표로부터 해석한다. */
  timeZone?: string;
  /** 표시용 라벨. 개인 식별 정보를 담지 않는다. */
  label?: string;
}

export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

export interface BirthTime {
  hour: number;
  minute: number;
}

export interface BirthInput {
  date: BirthDate;
  /** 생략 시 "시간 미상" — 시주(時柱)와 상승궁을 계산하지 않는다. */
  time?: BirthTime;
  /** 기본값 "solar" (양력) */
  calendar?: CalendarType;
  /** 음력 입력일 때 윤달 여부 */
  isLeapMonth?: boolean;
  place?: BirthPlace;
  gender?: Gender;
}

/** 출생지 미입력 시 기본값 — 서울시청 좌표. */
export const DEFAULT_PLACE: Readonly<Required<Omit<BirthPlace, "label">> & { label: string }> =
  Object.freeze({
    lat: 37.5665,
    lng: 126.978,
    timeZone: "Asia/Seoul",
    label: "Seoul",
  });

export class BirthInputError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = "BirthInputError";
  }
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function isGregorianLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) return isGregorianLeapYear(year) ? 29 : 28;
  return DAYS_IN_MONTH[month - 1] ?? 30;
}

/** 입력값 검증. 실패 시 어떤 필드가 왜 틀렸는지 명시한 오류를 던진다. */
export function assertValidBirthInput(input: BirthInput): void {
  const { year, month, day } = input.date;

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new BirthInputError(`year must be an integer in 1900..2100, got ${year}`, "date.year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BirthInputError(`month must be an integer in 1..12, got ${month}`, "date.month");
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new BirthInputError(`day must be an integer in 1..31, got ${day}`, "date.day");
  }
  // 양력 입력만 그레고리력 월 길이를 검사한다. 음력은 변환 단계에서 검증된다.
  if ((input.calendar ?? "solar") === "solar" && day > daysInGregorianMonth(year, month)) {
    throw new BirthInputError(
      `${year}-${month} has ${daysInGregorianMonth(year, month)} days, got day ${day}`,
      "date.day",
    );
  }

  if (input.time) {
    const { hour, minute } = input.time;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new BirthInputError(`hour must be an integer in 0..23, got ${hour}`, "time.hour");
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new BirthInputError(`minute must be an integer in 0..59, got ${minute}`, "time.minute");
    }
  }

  if (input.place) {
    const { lat, lng } = input.place;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BirthInputError(`lat must be in -90..90, got ${lat}`, "place.lat");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BirthInputError(`lng must be in -180..180, got ${lng}`, "place.lng");
    }
  }
}
