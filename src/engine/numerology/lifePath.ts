import { BirthInputError, daysInGregorianMonth } from "@engine/shared/birth";
import { MASTER_NUMBERS } from "./constants";
import { reduceWithTrace, type ReductionStep } from "./reduce";

export interface LifePathDate {
  readonly year: number;
  readonly day: number;
  readonly month: number;
}

export interface LifePathResult {
  readonly value: number;
  readonly isMaster: boolean;
  /** 연·월·일을 각각 줄인 값. 셋을 더한 뒤 다시 줄이면 최종값이 나온다. */
  readonly breakdown: { readonly year: number; readonly month: number; readonly day: number };
  readonly trace: Readonly<{
    readonly year: readonly ReductionStep[];
    readonly month: readonly ReductionStep[];
    readonly day: readonly ReductionStep[];
    readonly total: readonly ReductionStep[];
  }>;
}

/** 사주·점성술과 같은 범위(1900~2100)로 맞춘다. 계산 자체는 어떤 날짜에도 통한다. */
export function assertValidLifePathDate(date: LifePathDate): void {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new BirthInputError(`year must be an integer in 1900..2100, got ${year}`, "date.year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BirthInputError(`month must be an integer in 1..12, got ${month}`, "date.month");
  }
  if (!Number.isInteger(day) || day < 1 || day > daysInGregorianMonth(year, month)) {
    throw new BirthInputError(
      `${year}-${month} has ${daysInGregorianMonth(year, month)} days, got day ${day}`,
      "date.day",
    );
  }
}

/**
 * 생애수(Life Path Number).
 *
 * 연·월·일을 각각 따로 줄인 뒤 셋을 더해 다시 줄인다 — 자릿수를 몽땅 한 줄로
 * 늘어놓고 더하는 방식과 결과가 거의 같지만, 연·월·일 각각에서 마스터 넘버가
 * 나타날 수 있게 해 준다는 점이 다르다. 최종 합이 마스터가 아니면(예: 44)
 * 한 자리가 될 때까지 계속 줄어든다.
 */
export function computeLifePathNumber(date: LifePathDate): LifePathResult {
  assertValidLifePathDate(date);

  const yearTrace = reduceWithTrace(date.year);
  const monthTrace = reduceWithTrace(date.month);
  const dayTrace = reduceWithTrace(date.day);
  const year = yearTrace.value;
  const month = monthTrace.value;
  const day = dayTrace.value;

  const totalTrace = reduceWithTrace(year + month + day);
  const value = totalTrace.value;

  return Object.freeze({
    value,
    isMaster: MASTER_NUMBERS.includes(value),
    breakdown: Object.freeze({ year, month, day }),
    trace: Object.freeze({
      year: yearTrace.steps,
      month: monthTrace.steps,
      day: dayTrace.steps,
      total: totalTrace.steps,
    }),
  });
}
