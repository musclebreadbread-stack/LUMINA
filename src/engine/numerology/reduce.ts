import { MASTER_NUMBERS } from "./constants";

export interface ReductionStep {
  readonly input: number;
  readonly digits: readonly number[];
  readonly sum: number;
  readonly output: number;
  readonly stoppedAtMaster: boolean;
}

export interface ReductionTrace {
  readonly value: number;
  readonly steps: readonly ReductionStep[];
}

/** 자릿수를 더한다. 음수·소수는 호출부가 걸러야 한다. */
export function sumDigits(n: number): number {
  let sum = 0;
  let v = Math.trunc(Math.abs(n));
  if (v === 0) return 0;
  while (v > 0) {
    sum += v % 10;
    v = Math.floor(v / 10);
  }
  return sum;
}

/**
 * 한 자리 수 또는 마스터 넘버가 될 때까지 자릿수를 더한다.
 *
 * 매 단계에서 먼저 "이미 마스터 넘버인가"를 확인하고, 아니면 자릿수를 더해
 * 다음 단계로 넘어간다. 그래서 11·22·33 은 등장하는 즉시 멈추고, 44 처럼
 * 마스터로 치지 않는 두 자리 수는 한 자리가 될 때까지 계속 줄어든다.
 *
 *   reduceToSingleDigitOrMaster(29)  // 2+9=11 → 마스터, 여기서 멈춘다 → 11
 *   reduceToSingleDigitOrMaster(44)  // 44는 마스터가 아니라 4+4=8 까지 줄어든다 → 8
 */
export function reduceToSingleDigitOrMaster(
  n: number,
  masters: readonly number[] = MASTER_NUMBERS,
): number {
  return reduceWithTrace(n, masters).value;
}

/** 자릿수 합산의 각 단계를 보존한다 — 결과 화면의 계산 궤적에 사용한다. */
export function reduceWithTrace(
  n: number,
  masters: readonly number[] = MASTER_NUMBERS,
): ReductionTrace {
  let value = Math.trunc(Math.abs(n));
  const steps: ReductionStep[] = [];

  while (value > 9 && !masters.includes(value)) {
    const digits = Object.freeze(String(value).split("").map((digit) => Number(digit)));
    const sum = digits.reduce((total, digit) => total + digit, 0);
    const stoppedAtMaster = masters.includes(sum);
    steps.push(
      Object.freeze({
        input: value,
        digits,
        sum,
        output: sum,
        stoppedAtMaster,
      }),
    );
    value = sum;
  }

  return Object.freeze({ value, steps: Object.freeze(steps) });
}
