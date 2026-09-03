import { DateTime } from "luxon";
import { MakeTime, SiderealTime, SunPosition, e_tilt } from "astronomy-engine";

export { resolveTimeZone } from "./timezone";

const DEG = Math.PI / 180;

export interface ResolvedInstant {
  /** 절대 시각 (UTC). 절기 비교·천문 계산의 기준. */
  readonly instant: Date;
  /** 해석에 사용된 IANA 타임존 */
  readonly timeZone: string;
  /** 해당 시점의 UTC 오프셋 (분). 역사적 표준시/서머타임이 반영된 값. */
  readonly utcOffsetMinutes: number;
  /** 서머타임 적용 여부 */
  readonly isDST: boolean;
}

export class TimeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeResolutionError";
  }
}

/** 벽시계 시각(현지 표준시) → 절대 시각(UTC). */
export function resolveInstant(
  date: { year: number; month: number; day: number },
  time: { hour: number; minute: number },
  timeZone: string,
): ResolvedInstant {
  const dt = DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day, hour: time.hour, minute: time.minute },
    { zone: timeZone },
  );
  if (!dt.isValid) {
    throw new TimeResolutionError(`invalid datetime in zone ${timeZone}: ${dt.invalidExplanation}`);
  }
  return {
    instant: dt.toJSDate(),
    timeZone,
    utcOffsetMinutes: dt.offset,
    isDST: dt.isInDST,
  };
}

/**
 * 균시차(Equation of Time), 단위: 분.
 *
 * 시태양시(apparent solar time) − 평균태양시(mean solar time).
 * 그리니치 겉보기 항성시(GAST)와 태양의 겉보기 적경으로부터 직접 유도하므로
 * 근사 다항식이 아니라 천문 정밀도를 그대로 따른다. 범위는 대략 −14.2 ~ +16.5분.
 */
export function equationOfTimeMinutes(instant: Date): number {
  const time = MakeTime(instant);
  const sun = SunPosition(time); // 겉보기 황경 (진분점 of date)
  const obliquity = e_tilt(time).tobl * DEG; // 진황도경사각

  const lambda = sun.elon * DEG;
  // 겉보기 적경 α = atan2(cos ε · sin λ, cos λ)
  const raHours =
    (((Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda)) / DEG + 360) % 360) /
      15);

  const gastHours = SiderealTime(time); // 그리니치 겉보기 항성시 (시)
  // 그리니치에서 진태양의 시각 = 시간각 + 12h
  const apparentSolarHours = gastHours - raHours + 12;

  const utHours =
    instant.getUTCHours() +
    instant.getUTCMinutes() / 60 +
    instant.getUTCSeconds() / 3600 +
    instant.getUTCMilliseconds() / 3_600_000;

  let diff = apparentSolarHours - utHours;
  // (−12h, +12h] 로 정규화 — 날짜 경계에서 ±24h 점프를 제거한다.
  diff = ((((diff + 12) % 24) + 24) % 24) - 12;
  return diff * 60;
}

export interface TrueSolarTime {
  /** 진태양시 기준의 현지 벽시계 시각 */
  readonly dateTime: DateTime;
  /** 경도 보정량 (분). 표준자오선과 실제 경도의 차이. */
  readonly longitudeCorrectionMinutes: number;
  /** 균시차 보정량 (분) */
  readonly equationOfTimeMinutes: number;
  /** 총 보정량 (분) */
  readonly totalCorrectionMinutes: number;
}

/**
 * 진태양시(眞太陽時) 산출.
 *
 * 두 가지 보정을 적용한다.
 *  1) 경도 보정 — 표준자오선(예: KST = 135°E)과 출생지 경도의 차이를 4분/도로 환산.
 *     서울(126.978°E)은 약 −32.1분.
 *  2) 균시차 보정 — 지구 공전 궤도의 이심률과 자전축 경사로 생기는 ±16분 이내의 차이.
 *
 * 표준자오선은 하드코딩하지 않고 해당 시점의 실제 UTC 오프셋에서 역산하므로,
 * 한국의 UTC+8:30 시기(1954~1961)와 서머타임 시기에도 자동으로 올바르게 동작한다.
 */
export function computeTrueSolarTime(
  resolved: ResolvedInstant,
  longitude: number,
  options: { applyEquationOfTime?: boolean } = {},
): TrueSolarTime {
  const applyEoT = options.applyEquationOfTime ?? true;

  // 해당 시점에 실제로 적용된 표준자오선 경도 (서머타임 포함)
  const standardMeridian = (resolved.utcOffsetMinutes / 60) * 15;
  const longitudeCorrectionMinutes = (longitude - standardMeridian) * 4;
  const eot = applyEoT ? equationOfTimeMinutes(resolved.instant) : 0;
  const total = longitudeCorrectionMinutes + eot;

  const local = DateTime.fromJSDate(resolved.instant, { zone: resolved.timeZone });
  return {
    dateTime: local.plus({ minutes: total }),
    longitudeCorrectionMinutes,
    equationOfTimeMinutes: eot,
    totalCorrectionMinutes: total,
  };
}

/**
 * 그레고리력 달력 날짜의 율리우스 적일(JDN, 정수).
 * 일주(日柱) 계산의 기준이며, 시각·타임존과 무관한 순수 달력 함수다.
 */
export function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}
