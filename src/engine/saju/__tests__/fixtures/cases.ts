import { DateTime } from "luxon";
import type { BirthPlace } from "@engine/shared/birth";
import { majorTermsOfSajuYear } from "@engine/saju/solarTerms";

/**
 * 교차검증용 결정론적 케이스 생성기.
 *
 * 오라클(lunar-javascript)은 중국 표준시(UTC+8) 고정을 전제로 동작하므로,
 * 비교 시에는 서머타임과 역사적 표준시 변경이 없는 Etc/GMT-8 존에 케이스를 둔다.
 * 한국 표준시 이력(UTC+8:30 시기, 서머타임)은 별도 테스트에서 다룬다.
 */
export const ORACLE_PLACE: BirthPlace = Object.freeze({
  lat: 39.9042,
  lng: 120, // UTC+8 표준자오선
  timeZone: "Etc/GMT-8",
  label: "oracle-reference",
});

export interface SajuCase {
  readonly id: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  /** 이 케이스가 무엇을 노리는지 — 실패 시 원인 파악용 */
  readonly kind: "random" | "solar-term-edge" | "zi-hour" | "calendar-edge";
}

/** 선형 합동 생성기. 시드 고정이므로 실행마다 동일한 케이스가 나온다. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysIn(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return DAYS_IN_MONTH[month - 1] ?? 30;
}

/** 1901~2099 전 구간에 고르게 퍼진 무작위 케이스. */
function randomCases(count: number, seed = 20260818): SajuCase[] {
  const rand = lcg(seed);
  const cases: SajuCase[] = [];
  for (let i = 0; i < count; i += 1) {
    const year = 1901 + Math.floor(rand() * 199);
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * daysIn(year, month));
    const hour = Math.floor(rand() * 24);
    const minute = Math.floor(rand() * 60);
    cases.push({ id: `random-${i}`, year, month, day, hour, minute, kind: "random" });
  }
  return cases;
}

/**
 * 절입 경계 케이스.
 *
 * 오라클의 절기 시각은 분 단위로 절삭되어 있으므로, ±5분보다 가까운 지점은
 * 반올림 차이만으로 갈릴 수 있다. 여기서는 ±10분·±3시간을 써서 경계 "판정 로직"을
 * 검증하고, 절입 시각 자체의 정확도는 solarTerms 테스트에서 초 단위로 따로 본다.
 */
function solarTermEdgeCases(years: readonly number[]): SajuCase[] {
  const offsets = [-180, -10, 10, 180]; // 분
  const cases: SajuCase[] = [];
  for (const year of years) {
    const terms = majorTermsOfSajuYear(year);
    terms.forEach((term, ordinal) => {
      const base = DateTime.fromJSDate(term.instant, { zone: ORACLE_PLACE.timeZone });
      for (const offset of offsets) {
        const t = base.plus({ minutes: offset });
        if (t.year < 1901 || t.year > 2099) continue;
        cases.push({
          id: `term-${year}-${term.def.ko}-${offset >= 0 ? "+" : ""}${offset}m`,
          year: t.year,
          month: t.month,
          day: t.day,
          hour: t.hour,
          minute: t.minute,
          kind: "solar-term-edge",
        });
      }
      void ordinal;
    });
  }
  return cases;
}

/** 자시(子時) 경계 — 야자시론과 자정론이 갈리는 23:00~23:59 및 그 전후. */
function ziHourCases(): SajuCase[] {
  const days: readonly (readonly [number, number, number])[] = [
    [1923, 3, 14], [1968, 11, 30], [1987, 5, 9], [1999, 12, 31],
    [2000, 1, 1], [2012, 2, 29], [2024, 2, 4], [2043, 8, 21],
  ];
  const times: readonly (readonly [number, number])[] = [
    [22, 59], [23, 0], [23, 30], [23, 59], [0, 0], [0, 1], [0, 59], [1, 0],
  ];
  const cases: SajuCase[] = [];
  for (const [year, month, day] of days) {
    for (const [hour, minute] of times) {
      cases.push({
        id: `zi-${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${hour}:${minute}`,
        year, month, day, hour, minute,
        kind: "zi-hour",
      });
    }
  }
  return cases;
}

/** 달력 경계 — 윤년 2/29, 연말연시, 월말. */
function calendarEdgeCases(): SajuCase[] {
  const dates: readonly (readonly [number, number, number])[] = [
    [1904, 2, 29], [1996, 2, 29], [2000, 2, 29], [2020, 2, 29], [2096, 2, 29],
    [1901, 1, 1], [1999, 12, 31], [2000, 1, 1], [2099, 12, 31],
    [1950, 1, 31], [1975, 4, 30], [2033, 10, 31],
  ];
  return dates.map(([year, month, day], i) => ({
    id: `cal-${i}-${year}-${month}-${day}`,
    year, month, day,
    hour: (i * 7) % 24,
    minute: (i * 13) % 60,
    kind: "calendar-edge" as const,
  }));
}

/**
 * 전체 검증 케이스.
 * 무작위 120건 + 절입 경계 + 자시 경계 + 달력 경계 = 300건 이상.
 */
export function buildSajuCases(): readonly SajuCase[] {
  return Object.freeze([
    ...randomCases(120),
    ...solarTermEdgeCases([1912, 1955, 1988, 2024, 2061]),
    ...ziHourCases(),
    ...calendarEdgeCases(),
  ]);
}
