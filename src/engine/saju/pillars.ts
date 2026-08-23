import { DateTime } from "luxon";
import { gregorianToJDN } from "@engine/shared/time";
import {
  LIFE_STAGE_ORIGIN,
  TWELVE_STAGES,
  branchAt,
  monthBranchFromMajorTerm,
  stemAt,
} from "./constants";
import { monthBracketOf, type MonthTermBracket } from "./solarTerms";

/**
 * 일주(日柱)가 바뀌는 시점에 대한 두 학설.
 *
 * - "zi23"    야자시론(夜子時論). 23:00에 일주가 바뀐다. 국내 명리 실무의 다수설.
 * - "midnight" 자정론. 00:00에 일주가 바뀐다. 23:00~23:59는 당일 일간 + 子시로 본다.
 *
 * 두 학설은 23:00~23:59 출생에서만 갈리며, 그 외에는 완전히 동일한 결과를 낸다.
 */
export type DayBoundaryRule = "zi23" | "midnight";

export interface Pillar {
  /** 천간 index 0..9 */
  readonly stem: number;
  /** 지지 index 0..11 */
  readonly branch: number;
  /** 60갑자 index 0..59 */
  readonly sexagenary: number;
}

export interface FourPillars {
  readonly year: Pillar;
  readonly month: Pillar;
  readonly day: Pillar;
  /** 출생 시각 미상이면 null */
  readonly hour: Pillar | null;
}

/** (천간, 지지) → 60갑자 index. 음양이 어긋난 조합은 존재하지 않으므로 오류를 던진다. */
export function sexagenaryIndex(stem: number, branch: number): number {
  const s = ((stem % 10) + 10) % 10;
  const b = ((branch % 12) + 12) % 12;
  if ((s - b) % 2 !== 0) {
    throw new RangeError(`stem ${s} and branch ${b} have mismatched polarity — no 60갑자 exists`);
  }
  const k = (((5 * ((b - s)) ) / 2) % 6 + 6) % 6;
  return s + 10 * k;
}

export function makePillar(stem: number, branch: number): Pillar {
  const s = ((stem % 10) + 10) % 10;
  const b = ((branch % 12) + 12) % 12;
  return Object.freeze({ stem: s, branch: b, sexagenary: sexagenaryIndex(s, b) });
}

/** 60갑자 index → 간지 */
export function pillarFromSexagenary(index: number): Pillar {
  const i = ((index % 60) + 60) % 60;
  return Object.freeze({ stem: i % 10, branch: i % 12, sexagenary: i });
}

/**
 * 연주(年柱). 사주년(입춘 기준)에서 직접 유도한다.
 * 서기 4년이 갑자년이므로 (year - 4) 를 쓴다. 1984년 → 갑자년.
 */
export function yearPillar(sajuYear: number): Pillar {
  const n = ((sajuYear - 4) % 60 + 60) % 60;
  return pillarFromSexagenary(n);
}

/**
 * 월주(月柱).
 * 월지는 절입으로 정해지고, 월간은 연간에서 오호둔(五虎遁)으로 정해진다.
 *   갑·기년 → 병인월, 을·경년 → 무인월, 병·신년 → 경인월,
 *   정·임년 → 임인월, 무·계년 → 갑인월
 */
export function monthPillar(yearStem: number, monthOrdinal: number): Pillar {
  const firstMonthStem = ((yearStem % 5) * 2 + 2) % 10;
  const stem = (firstMonthStem + monthOrdinal) % 10;
  return makePillar(stem, monthBranchFromMajorTerm(monthOrdinal));
}

/**
 * 일주(日柱). 율리우스 적일(JDN)에서 끊김 없이 이어지는 60갑자 주기다.
 * 기준: 1900-01-01(그레고리력) = 갑술일, 1949-10-01 = 갑자일.
 */
export function dayPillarFromJDN(jdn: number): Pillar {
  return pillarFromSexagenary(jdn + 49);
}

/** 시지(時支). 23:00~00:59 가 子시이고 2시간 단위로 진행한다. */
export function hourBranchOf(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

/**
 * 시주(時柱). 시간(時干)은 일간에서 오서둔(五鼠遁)으로 정해진다.
 *   갑·기일 → 갑자시, 을·경일 → 병자시, 병·신일 → 무자시,
 *   정·임일 → 경자시, 무·계일 → 임자시
 */
export function hourPillar(dayStem: number, hour: number): Pillar {
  const branch = hourBranchOf(hour);
  const firstHourStem = (dayStem % 5) * 2;
  return makePillar((firstHourStem + branch) % 10, branch);
}

/** 십이운성(十二運星). 양간은 장생부터 순행, 음간은 역행한다. */
export function twelveStageOf(stemIndex: number, branchIndex: number): string {
  const origin = LIFE_STAGE_ORIGIN[((stemIndex % 10) + 10) % 10];
  if (origin === undefined) throw new RangeError(`invalid stem index: ${stemIndex}`);
  const forward = stemAt(stemIndex).polarity === "yang";
  const b = ((branchIndex % 12) + 12) % 12;
  const offset = forward ? (b - origin + 12) % 12 : (origin - b + 12) % 12;
  const stage = TWELVE_STAGES[offset];
  if (!stage) throw new RangeError(`invalid twelve-stage offset: ${offset}`);
  return stage;
}

/** 공망(空亡). 일주가 속한 순(旬)에서 짝을 못 만난 두 지지. */
export function voidBranchesOf(dayPillar: Pillar): readonly [number, number] {
  const decade = Math.floor(dayPillar.sexagenary / 10);
  const first = (decade * 10 + 10) % 12;
  return Object.freeze([first, (first + 1) % 12] as [number, number]);
}

export interface PillarComputationInput {
  /** 절기 판정 기준이 되는 절대 시각 (UTC) */
  readonly instant: Date;
  /** 시주·일주 경계 판정에 쓰는 실효 현지 시각 (진태양시 적용 시 보정된 값) */
  readonly effectiveLocal: DateTime;
  /** 출생 시각 미상 여부. true 면 시주를 계산하지 않는다. */
  readonly timeUnknown: boolean;
  readonly dayBoundaryRule: DayBoundaryRule;
}

export interface PillarComputationResult {
  readonly pillars: FourPillars;
  readonly bracket: MonthTermBracket;
  /** 일주 산정에 실제로 사용된 달력 날짜 (야자시 규칙 적용 후) */
  readonly dayPillarDate: { year: number; month: number; day: number };
  /** 23:00~23:59 출생 — 일주 학설에 따라 결과가 갈리는 구간 */
  readonly inLateZiHour: boolean;
}

export function computePillars(input: PillarComputationInput): PillarComputationResult {
  const { instant, effectiveLocal, timeUnknown, dayBoundaryRule } = input;

  const bracket = monthBracketOf(instant);
  const year = yearPillar(bracket.sajuYear);
  const month = monthPillar(year.stem, bracket.monthOrdinal);

  const hour = effectiveLocal.hour;
  const inLateZiHour = !timeUnknown && hour === 23;

  // 야자시론에서는 23시부터 다음 날의 일주를 쓴다.
  const advanceDay = dayBoundaryRule === "zi23" && inLateZiHour;
  const dayDate = advanceDay ? effectiveLocal.plus({ days: 1 }) : effectiveLocal;

  const jdn = gregorianToJDN(dayDate.year, dayDate.month, dayDate.day);
  const day = dayPillarFromJDN(jdn);

  return {
    pillars: Object.freeze({
      year,
      month,
      day,
      hour: timeUnknown ? null : hourPillar(day.stem, hour),
    }),
    bracket,
    dayPillarDate: { year: dayDate.year, month: dayDate.month, day: dayDate.day },
    inLateZiHour,
  };
}

/** 표시용 간지 문자열. 예: "갑자" / "甲子" / "Jia Zi" */
export function pillarLabel(p: Pillar, script: "ko" | "hanja" | "en" = "ko"): string {
  const s = stemAt(p.stem);
  const b = branchAt(p.branch);
  if (script === "hanja") return `${s.hanja}${b.hanja}`;
  if (script === "en") return `${s.en} ${b.en}`;
  return `${s.ko}${b.ko}`;
}
