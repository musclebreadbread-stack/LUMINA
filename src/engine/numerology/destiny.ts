import { MASTER_NUMBERS, LETTER_VALUES } from "./constants";
import { reduceWithTrace, type ReductionStep } from "./reduce";

export class NumerologyInputError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = "NumerologyInputError";
  }
}

export interface DestinyResult {
  readonly value: number;
  readonly isMaster: boolean;
  readonly rawSum: number;
  /** 계산에 실제로 들어간 로마자 개수 */
  readonly lettersUsed: number;
  /** 공백·구두점·한글 등 계산에서 빠진 문자 수 */
  readonly ignoredCharacters: number;
  readonly letterValues: readonly { readonly letter: string; readonly value: number }[];
  readonly trace: readonly ReductionStep[];
}

/**
 * 운명수(Destiny/Expression Number).
 *
 * 피타고라스 문자표는 로마자 A~Z 에만 정의되어 있다. 한글·숫자·기호는 세지 않고
 * 그대로 건너뛴다 — 한글 이름은 로마자 표기(성명의 로마자 표기)를 넣어야 한다.
 * 로마자가 한 글자도 없으면 계산할 수 없으므로 오류를 던진다.
 */
export function computeDestinyNumber(name: string): DestinyResult {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new NumerologyInputError("name must not be empty", "name");
  }

  let rawSum = 0;
  let lettersUsed = 0;
  let ignoredCharacters = 0;
  const letterValues: { letter: string; value: number }[] = [];

  for (const ch of trimmed.toUpperCase()) {
    const value = LETTER_VALUES[ch];
    if (value === undefined) {
      if (ch.trim().length > 0) ignoredCharacters += 1;
      continue;
    }
    rawSum += value;
    lettersUsed += 1;
    letterValues.push(Object.freeze({ letter: ch, value }));
  }

  if (lettersUsed === 0) {
    throw new NumerologyInputError(
      "name has no Latin letters — enter a romanized spelling",
      "name",
    );
  }

  const reduction = reduceWithTrace(rawSum);
  const value = reduction.value;

  return Object.freeze({
    value,
    isMaster: MASTER_NUMBERS.includes(value),
    rawSum,
    lettersUsed,
    ignoredCharacters,
    letterValues: Object.freeze(letterValues),
    trace: reduction.steps,
  });
}
