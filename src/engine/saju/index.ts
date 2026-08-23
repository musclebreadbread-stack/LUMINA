import { DateTime } from "luxon";
import {
  DEFAULT_PLACE,
  assertValidBirthInput,
  type BirthInput,
  type Gender,
} from "@engine/shared/birth";
import { computeTrueSolarTime, resolveInstant, resolveTimeZone } from "@engine/shared/time";
import type { EvidenceTier } from "@engine/shared/tier";
import { branchAt, stemAt, type FiveElement } from "./constants";
import {
  computeDayMasterStrength,
  computeElementDistribution,
  type DayMasterStrength,
  type ElementDistribution,
} from "./elements";
import { isLunarConvertible, lunarToSolar, solarToLunar, type LunarDate } from "./lunar";
import {
  computePillars,
  pillarLabel,
  twelveStageOf,
  voidBranchesOf,
  type DayBoundaryRule,
  type FourPillars,
} from "./pillars";
import {
  computeLuckPeriods,
  computeLuckStart,
  computeYearlyLuck,
  luckDirection,
  luckPeriodAtAge,
  type LuckDirection,
  type LuckPeriod,
  type LuckStart,
  type YearlyLuck,
} from "./luck";
import { computeTenGods, type TenGodChart } from "./tenGods";

export * from "./constants";
export * from "./elements";
export * from "./lunar";
export * from "./luck";
export * from "./pillars";
export * from "./solarTerms";
export * from "./tenGods";
export * from "./rarity";
export * from "./citations";
export * from "./explanations";

/** 시각 미상일 때 절기 판정에 쓰는 기준 시각. 정오는 경계 오차가 가장 작다. */
const UNKNOWN_TIME_FALLBACK = { hour: 12, minute: 0 } as const;

export interface SajuOptions {
  /** 일주 경계 학설. 기본 "zi23" (야자시론). */
  readonly dayBoundaryRule?: DayBoundaryRule;
  /** 진태양시 보정(경도 보정 + 균시차) 적용 여부. 기본 true. */
  readonly applyTrueSolarTime?: boolean;
  /** 균시차만 따로 끄고 싶을 때. 기본 true. */
  readonly applyEquationOfTime?: boolean;
  /** 산출할 대운 개수. 기본 10 (약 100년). */
  readonly luckPeriodCount?: number;
  /**
   * 현재 나이·대운·세운을 함께 산출할 기준 시각.
   * 생략하면 시간 의존 결과를 내지 않는다 — 공유 링크의 재현성을 위해
   * 엔진 내부에서 현재 시각을 읽지 않는다.
   */
  readonly referenceDate?: Date;
}

export interface SajuTimeInfo {
  readonly timeZone: string;
  readonly utcOffsetMinutes: number;
  readonly isDST: boolean;
  /** 입력된 벽시계 시각 (ISO, 오프셋 포함) */
  readonly localISO: string;
  /** 절대 시각 (ISO UTC) */
  readonly instantISO: string;
  /** 진태양시 기준 시각 (ISO). 보정을 끄면 localISO 와 같다. */
  readonly trueSolarISO: string;
  readonly longitudeCorrectionMinutes: number;
  readonly equationOfTimeMinutes: number;
  readonly totalCorrectionMinutes: number;
  readonly timeUnknown: boolean;
}

export interface SajuPillarView {
  readonly ko: string;
  readonly hanja: string;
  readonly stemKo: string;
  readonly branchKo: string;
  readonly stemElement: FiveElement;
  readonly branchElement: FiveElement;
  readonly zodiacKo: string;
  readonly stage: string;
}

export interface SajuBoundaryFlags {
  /** 23:00~23:59 출생 — 일주 학설에 따라 결과가 갈린다. */
  readonly inLateZiHour: boolean;
  /** 가장 가까운 절입까지의 시간(시간 단위). 12시간 이내면 UI에서 고지한다. */
  readonly hoursToNearestTermBoundary: number;
  readonly timeUnknown: boolean;
  /** 성별 미지정 — 대운 방향을 확정할 수 없다. */
  readonly genderUnspecified: boolean;
}

export interface SajuCurrent {
  /** 만 나이 */
  readonly age: number;
  readonly luckPeriod: LuckPeriod | null;
  readonly yearlyLuck: YearlyLuck;
}

export interface SajuResult {
  readonly engine: "saju";
  readonly tier: EvidenceTier;
  readonly version: 1;

  readonly birth: {
    readonly solar: { year: number; month: number; day: number };
    readonly lunar: LunarDate | null;
    readonly time: { hour: number; minute: number } | null;
    readonly place: { lat: number; lng: number; label?: string };
    readonly gender: Gender;
  };
  readonly time: SajuTimeInfo;

  readonly pillars: FourPillars;
  readonly view: {
    readonly year: SajuPillarView;
    readonly month: SajuPillarView;
    readonly day: SajuPillarView;
    readonly hour: SajuPillarView | null;
  };
  /** 일간(日干) — 사주 해석의 중심축 */
  readonly dayMaster: { readonly stem: number; readonly ko: string; readonly hanja: string; readonly element: FiveElement };

  readonly elements: ElementDistribution;
  readonly strength: DayMasterStrength;
  readonly tenGods: TenGodChart;
  /** 공망(空亡) 지지 index 2개 */
  readonly voidBranches: readonly [number, number];

  readonly luck: {
    readonly direction: LuckDirection;
    readonly start: LuckStart;
    readonly periods: readonly LuckPeriod[];
  };
  readonly current: SajuCurrent | null;
  readonly boundary: SajuBoundaryFlags;
  readonly options: Required<Omit<SajuOptions, "referenceDate">>;
}

function toView(
  pillar: { stem: number; branch: number },
  dayStem: number,
): SajuPillarView {
  const s = stemAt(pillar.stem);
  const b = branchAt(pillar.branch);
  return Object.freeze({
    ko: `${s.ko}${b.ko}`,
    hanja: `${s.hanja}${b.hanja}`,
    stemKo: s.ko,
    branchKo: b.ko,
    stemElement: s.element,
    branchElement: b.element,
    zodiacKo: b.zodiacKo,
    stage: twelveStageOf(dayStem, b.index),
  });
}

/**
 * 사주팔자 산출.
 *
 * 계산과 해석을 엄격히 분리한다 — 이 함수는 결정론적인 구조화 JSON만 만들고,
 * 문장 생성은 해석 레이어가 이 JSON을 입력으로 받아 수행한다.
 */
export function computeSaju(input: BirthInput, options: SajuOptions = {}): SajuResult {
  assertValidBirthInput(input);

  const dayBoundaryRule = options.dayBoundaryRule ?? "zi23";
  const applyTrueSolarTime = options.applyTrueSolarTime ?? true;
  const applyEquationOfTime = options.applyEquationOfTime ?? true;
  const luckPeriodCount = options.luckPeriodCount ?? 10;

  // 1) 음력 입력이면 양력으로 변환한다. 이후 모든 계산은 양력 기준이다.
  const solar =
    (input.calendar ?? "solar") === "lunar"
      ? lunarToSolar(input.date.year, input.date.month, input.date.day, input.isLeapMonth ?? false)
      : { year: input.date.year, month: input.date.month, day: input.date.day };

  // 2) 벽시계 시각 → 절대 시각. 역사적 표준시와 서머타임은 IANA 존이 처리한다.
  const place = input.place ?? DEFAULT_PLACE;
  const timeZone = resolveTimeZone(place);
  const timeUnknown = !input.time;
  const wallTime = input.time ?? UNKNOWN_TIME_FALLBACK;
  const resolved = resolveInstant(solar, wallTime, timeZone);

  // 3) 진태양시 보정. 시주와 (야자시론에서는) 일주 경계가 이 값을 따른다.
  const trueSolar = computeTrueSolarTime(resolved, place.lng, {
    applyEquationOfTime: applyTrueSolarTime && applyEquationOfTime,
  });
  const localDateTime = DateTime.fromJSDate(resolved.instant, { zone: timeZone });
  const effectiveLocal = applyTrueSolarTime ? trueSolar.dateTime : localDateTime;

  // 4) 네 기둥
  const { pillars, bracket, inLateZiHour } = computePillars({
    instant: resolved.instant,
    effectiveLocal,
    timeUnknown,
    dayBoundaryRule,
  });

  // 5) 분석
  const elements = computeElementDistribution(pillars);
  const strength = computeDayMasterStrength(pillars, elements);
  const tenGods = computeTenGods(pillars);
  const voidBranches = voidBranchesOf(pillars.day);

  // 6) 대운
  const gender: Gender = input.gender ?? "unspecified";
  const direction = luckDirection(pillars.year.stem, gender);
  const luckStart = computeLuckStart(resolved.instant, bracket, direction);
  const periods = computeLuckPeriods(pillars, luckStart, localDateTime, luckPeriodCount);

  // 7) 기준 시각이 주어졌을 때만 나이·현재 대운·세운을 낸다.
  let current: SajuCurrent | null = null;
  if (options.referenceDate) {
    const ref = DateTime.fromJSDate(options.referenceDate, { zone: timeZone });
    const age = Math.max(0, Math.floor(ref.diff(localDateTime, "years").years));
    current = Object.freeze({
      age,
      luckPeriod: luckPeriodAtAge(periods, age),
      yearlyLuck: computeYearlyLuck(
        pillars,
        // 세운도 입춘 기준이므로, 입춘 전이면 전년도 간지를 쓴다.
        options.referenceDate.getTime() < computeYearlyLuck(pillars, ref.year).startsAt.getTime()
          ? ref.year - 1
          : ref.year,
      ),
    });
  }

  const hoursToNearestTermBoundary =
    Math.min(
      Math.abs(resolved.instant.getTime() - bracket.start.instant.getTime()),
      Math.abs(bracket.next.instant.getTime() - resolved.instant.getTime()),
    ) / 3_600_000;

  const dayStemDef = stemAt(pillars.day.stem);

  return Object.freeze({
    engine: "saju" as const,
    tier: "cultural" as EvidenceTier,
    version: 1 as const,

    birth: Object.freeze({
      solar: Object.freeze(solar),
      lunar: isLunarConvertible(solar.year) ? solarToLunar(solar.year, solar.month, solar.day) : null,
      time: input.time ? Object.freeze({ ...input.time }) : null,
      place: Object.freeze({ lat: place.lat, lng: place.lng, label: place.label }),
      gender,
    }),

    time: Object.freeze({
      timeZone,
      utcOffsetMinutes: resolved.utcOffsetMinutes,
      isDST: resolved.isDST,
      localISO: localDateTime.toISO() ?? "",
      instantISO: resolved.instant.toISOString(),
      trueSolarISO: effectiveLocal.toISO() ?? "",
      longitudeCorrectionMinutes: trueSolar.longitudeCorrectionMinutes,
      equationOfTimeMinutes: trueSolar.equationOfTimeMinutes,
      totalCorrectionMinutes: applyTrueSolarTime ? trueSolar.totalCorrectionMinutes : 0,
      timeUnknown,
    }),

    pillars,
    view: Object.freeze({
      year: toView(pillars.year, pillars.day.stem),
      month: toView(pillars.month, pillars.day.stem),
      day: toView(pillars.day, pillars.day.stem),
      hour: pillars.hour ? toView(pillars.hour, pillars.day.stem) : null,
    }),
    dayMaster: Object.freeze({
      stem: pillars.day.stem,
      ko: dayStemDef.ko,
      hanja: dayStemDef.hanja,
      element: dayStemDef.element,
    }),

    elements,
    strength,
    tenGods,
    voidBranches,

    luck: Object.freeze({ direction, start: luckStart, periods }),
    current,
    boundary: Object.freeze({
      inLateZiHour,
      hoursToNearestTermBoundary,
      timeUnknown,
      genderUnspecified: gender === "unspecified",
    }),
    options: Object.freeze({
      dayBoundaryRule,
      applyTrueSolarTime,
      applyEquationOfTime,
      luckPeriodCount,
    }),
  });
}

/** 간지 문자열 헬퍼 재수출 — 리포트 렌더러가 쓴다. */
export { pillarLabel };
