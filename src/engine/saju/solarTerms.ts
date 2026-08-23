import { SearchSunLongitude } from "astronomy-engine";
import { MAJOR_TERMS, SOLAR_TERMS, type SolarTermDef } from "./constants";

/**
 * 24절기 절입 시각을 천문 계산으로 직접 구한다.
 *
 * 절기는 태양의 겉보기 황경이 15°의 배수를 지나는 "절대 시각"이다. 따라서
 * 음력 변환표나 지역 달력에 의존하지 않으며, 타임존과도 무관하다. 표시할 때만
 * 현지 시각으로 환산한다. (KASI 발표값과 초 단위로 일치함을 테스트로 고정한다.)
 */

export interface SolarTermInstant {
  readonly def: SolarTermDef;
  /** 절입 절대 시각 (UTC) */
  readonly instant: Date;
}

export class SolarTermError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SolarTermError";
  }
}

function searchLongitude(targetLon: number, from: Date, limitDays: number): Date {
  const t = SearchSunLongitude(targetLon, from, limitDays);
  if (!t) {
    throw new SolarTermError(
      `failed to locate solar longitude ${targetLon}° within ${limitDays}d of ${from.toISOString()}`,
    );
  }
  return t.date;
}

/**
 * 사주년(四柱年) = 입춘부터 다음 입춘 전까지의 한 해.
 * 그레고리력 해와 다르며, 연주(年柱)와 월주(月柱)의 기준이 된다.
 */

const ipchunCache = new Map<number, Date>();

/** 그레고리력 year 의 입춘(황경 315°) 절입 시각 (UTC). 입춘은 항상 2월 3~5일에 든다. */
export function ipchunOf(year: number): Date {
  const cached = ipchunCache.get(year);
  if (cached) return cached;
  const found = searchLongitude(315, new Date(Date.UTC(year, 0, 20, 0, 0, 0)), 30);
  ipchunCache.set(year, found);
  return found;
}

const majorTermsCache = new Map<number, readonly SolarTermInstant[]>();

/**
 * 사주년 `sajuYear` 에 속한 12개 절(節)의 절입 시각.
 * 배열 index 가 곧 월 순번이다 (0 = 인월/입춘 … 11 = 축월/소한).
 */
export function majorTermsOfSajuYear(sajuYear: number): readonly SolarTermInstant[] {
  const cached = majorTermsCache.get(sajuYear);
  if (cached) return cached;

  const result: SolarTermInstant[] = [];
  let cursor = new Date(Date.UTC(sajuYear, 0, 20, 0, 0, 0));
  for (const def of MAJOR_TERMS) {
    // 절은 약 30~31일 간격이므로 40일 창이면 충분하고, 이웃 절을 잘못 잡지 않는다.
    const instant = searchLongitude(def.longitude, cursor, 40);
    result.push({ def, instant });
    cursor = new Date(instant.getTime() + 20 * 86_400_000);
  }

  const frozen = Object.freeze(result.map((r) => Object.freeze(r)));
  majorTermsCache.set(sajuYear, frozen);
  return frozen;
}

const allTermsCache = new Map<number, readonly SolarTermInstant[]>();

/** 사주년 `sajuYear` 의 24절기 전체 (입춘 → 대한). 달력/세운 표시에 쓴다. */
export function allTermsOfSajuYear(sajuYear: number): readonly SolarTermInstant[] {
  const cached = allTermsCache.get(sajuYear);
  if (cached) return cached;

  const result: SolarTermInstant[] = [];
  let cursor = new Date(Date.UTC(sajuYear, 0, 20, 0, 0, 0));
  for (const def of SOLAR_TERMS) {
    const instant = searchLongitude(def.longitude, cursor, 25);
    result.push({ def, instant });
    cursor = new Date(instant.getTime() + 10 * 86_400_000);
  }

  const frozen = Object.freeze(result.map((r) => Object.freeze(r)));
  allTermsCache.set(sajuYear, frozen);
  return frozen;
}

/** 절대 시각이 속한 사주년(입춘 기준)을 판정한다. */
export function sajuYearOf(instant: Date): number {
  const gregorianYear = instant.getUTCFullYear();
  return instant.getTime() < ipchunOf(gregorianYear).getTime() ? gregorianYear - 1 : gregorianYear;
}

export interface MonthTermBracket {
  readonly sajuYear: number;
  /** 0 = 인월(입춘) … 11 = 축월(소한) */
  readonly monthOrdinal: number;
  /** 이번 달을 연 절입 시각 */
  readonly start: SolarTermInstant;
  /** 다음 달을 여는 절입 시각 (= 이번 달의 끝) */
  readonly next: SolarTermInstant;
}

/**
 * 절대 시각이 어느 절(節) 구간에 있는지 판정한다.
 * 경계는 `start <= instant < next` 로 좌폐우개(左閉右開)다 — 절입 순간은 새 달에 속한다.
 */
export function monthBracketOf(instant: Date): MonthTermBracket {
  const sajuYear = sajuYearOf(instant);
  const terms = majorTermsOfSajuYear(sajuYear);
  const t = instant.getTime();

  for (let i = terms.length - 1; i >= 0; i -= 1) {
    const term = terms[i];
    if (!term) continue;
    if (t >= term.instant.getTime()) {
      const next =
        i + 1 < terms.length
          ? terms[i + 1]
          : majorTermsOfSajuYear(sajuYear + 1)[0];
      if (!next) throw new SolarTermError(`missing next major term after ordinal ${i}`);
      return { sajuYear, monthOrdinal: i, start: term, next };
    }
  }

  // sajuYearOf 가 입춘 이전을 걸러내므로 도달할 수 없다.
  throw new SolarTermError(
    `instant ${instant.toISOString()} precedes 입춘 of resolved saju year ${sajuYear}`,
  );
}
