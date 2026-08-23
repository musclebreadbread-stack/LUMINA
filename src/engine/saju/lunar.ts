import KoreanLunarCalendar from "korean-lunar-calendar";
import type { BirthDate } from "@engine/shared/birth";

/**
 * 한국 음력 ↔ 양력 변환.
 *
 * 중국 농력(农历)은 UTC+8(북경) 기준, 한국 음력은 UTC+9(한국표준시) 기준으로
 * 삭(朔)의 순간을 판정하므로 두 달력은 드물게 하루가 어긋난다. 여기서는 한국
 * 천문연구원 발표 자료를 그대로 옮긴 korean-lunar-calendar 를 쓴다.
 *
 * 주의: 사주의 네 기둥은 음력을 쓰지 않는다. 연·월주는 24절기, 일주는 율리우스
 * 적일에서 나온다. 음력은 (1) 사용자가 음력 생일을 입력했을 때의 변환과
 * (2) 결과 화면의 음력 표기에만 쓰인다.
 */

/**
 * korean-lunar-calendar 가 보장하는 변환 가능 범위.
 * 정확한 경계는 음력 1000-01-01 ~ 2050-11-18, 양력 1000-02-13 ~ 2050-12-31 이다.
 * 연 단위 판정에는 아래 값을 쓰고, 경계일 여부는 변환 함수가 직접 검사한다.
 */
export const LUNAR_MIN_YEAR = 1000;
export const LUNAR_MAX_YEAR = 2050;

export class LunarConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LunarConversionError";
  }
}

export interface LunarDate extends BirthDate {
  readonly isLeapMonth: boolean;
}

/** 음력 → 양력. */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth = false,
): BirthDate {
  const cal = new KoreanLunarCalendar();
  if (!cal.setLunarDate(year, month, day, isLeapMonth)) {
    throw new LunarConversionError(
      `invalid Korean lunar date: ${year}-${month}-${day}${isLeapMonth ? " (윤달)" : ""}` +
        ` — supported range is ${LUNAR_MIN_YEAR}..${LUNAR_MAX_YEAR}`,
    );
  }
  const solar = cal.getSolarCalendar();
  return Object.freeze({ year: solar.year, month: solar.month, day: solar.day });
}

/** 양력 → 음력. */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  const cal = new KoreanLunarCalendar();
  if (!cal.setSolarDate(year, month, day)) {
    throw new LunarConversionError(
      `invalid solar date for lunar conversion: ${year}-${month}-${day}` +
        ` — supported range is ${LUNAR_MIN_YEAR}..${LUNAR_MAX_YEAR}`,
    );
  }
  const lunar = cal.getLunarCalendar();
  return Object.freeze({
    year: lunar.year,
    month: lunar.month,
    day: lunar.day,
    isLeapMonth: lunar.intercalation === true,
  });
}

/** 음력 표기가 가능한 범위인지. 범위 밖이면 결과 화면에서 음력 줄을 숨긴다. */
export function isLunarConvertible(year: number): boolean {
  return year >= LUNAR_MIN_YEAR && year <= LUNAR_MAX_YEAR;
}
