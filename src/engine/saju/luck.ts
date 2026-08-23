import { DateTime } from "luxon";
import type { Gender } from "@engine/shared/birth";
import { stemAt, type TenGod } from "./constants";
import {
  pillarFromSexagenary,
  twelveStageOf,
  yearPillar,
  type FourPillars,
  type Pillar,
} from "./pillars";
import { ipchunOf, type MonthTermBracket } from "./solarTerms";
import { tenGodOf, tenGodOfBranch } from "./tenGods";

export type LuckDirection = "forward" | "backward";

/**
 * 대운의 순행·역행.
 *   양년(甲丙戊庚壬) 남자 · 음년(乙丁己辛癸) 여자 → 순행
 *   양년 여자 · 음년 남자                        → 역행
 * 성별 미지정이면 판단할 수 없으므로 순행으로 두고 호출부가 고지하도록 한다.
 */
export function luckDirection(yearStem: number, gender: Gender): LuckDirection {
  const isYangYear = stemAt(yearStem).polarity === "yang";
  const isMale = gender !== "female"; // unspecified 는 남성과 동일하게 취급하고 UI에서 고지한다
  return isYangYear === isMale ? "forward" : "backward";
}

export interface LuckStart {
  readonly direction: LuckDirection;
  /** 출생 시각부터 기준 절입까지의 일수 (순행이면 다음 절, 역행이면 이전 절) */
  readonly daysToBoundary: number;
  /** 3일=1년 환산한 정확한 시작 나이 */
  readonly startAgeExact: number;
  /** 관례에 따라 정수로 환산한 대운수. 나머지 1일은 버리고 2일 이상은 올린다. */
  readonly startAge: number;
  /** 기준이 된 절입의 절대 시각 */
  readonly boundaryInstant: Date;
}

const MS_PER_DAY = 86_400_000;

export function computeLuckStart(
  instant: Date,
  bracket: MonthTermBracket,
  direction: LuckDirection,
): LuckStart {
  const boundary = direction === "forward" ? bracket.next.instant : bracket.start.instant;
  const daysToBoundary = Math.abs(boundary.getTime() - instant.getTime()) / MS_PER_DAY;

  const startAgeExact = daysToBoundary / 3;

  // 관례: 일수 ÷ 3 의 몫이 대운수, 나머지 1일은 버리고 2일 이상은 반올림한다.
  const wholeDays = Math.floor(daysToBoundary);
  const quotient = Math.floor(wholeDays / 3);
  const remainder = wholeDays % 3;
  const startAge = Math.max(1, quotient + (remainder >= 2 ? 1 : 0));

  return Object.freeze({
    direction,
    daysToBoundary,
    startAgeExact,
    startAge,
    boundaryInstant: boundary,
  });
}

export interface LuckPeriod {
  /** 몇 번째 대운인지 (0부터) */
  readonly ordinal: number;
  readonly pillar: Pillar;
  /** 이 대운이 시작되는 나이 (세는나이 아님 — 만 나이 기준) */
  readonly fromAge: number;
  readonly toAge: number;
  /** 대략적인 시작·종료 연도 (그레고리력) */
  readonly fromYear: number;
  readonly toYear: number;
  readonly stemTenGod: TenGod;
  readonly branchTenGod: TenGod;
  /** 일간 기준 십이운성 */
  readonly stage: string;
}

/**
 * 대운(大運) 목록. 월주에서 순행/역행으로 60갑자를 밟아 나간다.
 * 기본 10개 = 약 100년으로 생애 전체를 덮는다.
 */
export function computeLuckPeriods(
  pillars: FourPillars,
  start: LuckStart,
  birthLocal: DateTime,
  count = 10,
): readonly LuckPeriod[] {
  const dayStem = pillars.day.stem;
  const step = start.direction === "forward" ? 1 : -1;

  const periods: LuckPeriod[] = [];
  for (let i = 0; i < count; i += 1) {
    const pillar = pillarFromSexagenary(pillars.month.sexagenary + step * (i + 1));
    const fromAge = start.startAge + i * 10;
    periods.push(
      Object.freeze({
        ordinal: i,
        pillar,
        fromAge,
        toAge: fromAge + 10,
        fromYear: birthLocal.year + fromAge,
        toYear: birthLocal.year + fromAge + 10,
        stemTenGod: tenGodOf(dayStem, pillar.stem),
        branchTenGod: tenGodOfBranch(dayStem, pillar.branch),
        stage: twelveStageOf(dayStem, pillar.branch),
      }),
    );
  }
  return Object.freeze(periods);
}

export interface YearlyLuck {
  readonly year: number;
  readonly pillar: Pillar;
  readonly stemTenGod: TenGod;
  readonly branchTenGod: TenGod;
  readonly stage: string;
  /** 이 해의 입춘 절입 시각 (UTC). 세운은 이 시점부터 바뀐다. */
  readonly startsAt: Date;
}

/**
 * 세운(歲運). 연주와 마찬가지로 입춘을 기준으로 바뀌므로,
 * 1월 1일이 아니라 입춘 절입 시각을 경계로 삼는다.
 */
export function computeYearlyLuck(pillars: FourPillars, year: number): YearlyLuck {
  const dayStem = pillars.day.stem;
  const pillar = yearPillar(year);
  return Object.freeze({
    year,
    pillar,
    stemTenGod: tenGodOf(dayStem, pillar.stem),
    branchTenGod: tenGodOfBranch(dayStem, pillar.branch),
    stage: twelveStageOf(dayStem, pillar.branch),
    startsAt: ipchunOf(year),
  });
}

/** 연속한 여러 해의 세운. */
export function computeYearlyLuckRange(
  pillars: FourPillars,
  fromYear: number,
  count: number,
): readonly YearlyLuck[] {
  return Object.freeze(
    Array.from({ length: count }, (_, i) => computeYearlyLuck(pillars, fromYear + i)),
  );
}

/** 특정 나이에 해당하는 대운을 찾는다. 대운 시작 전이면 null. */
export function luckPeriodAtAge(
  periods: readonly LuckPeriod[],
  age: number,
): LuckPeriod | null {
  return periods.find((p) => age >= p.fromAge && age < p.toAge) ?? null;
}
