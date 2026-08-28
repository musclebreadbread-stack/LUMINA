import type { IrtParameters } from "./types";

const PROBABILITY_EPSILON = 1e-12;

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

function assertParameters(parameters: IrtParameters): void {
  assertFinite("discrimination", parameters.discrimination);
  assertFinite("difficulty", parameters.difficulty);
  assertFinite("guessing", parameters.guessing);

  if (parameters.discrimination <= 0) {
    throw new RangeError("discrimination must be greater than zero");
  }
  if (parameters.guessing < 0 || parameters.guessing >= 1) {
    throw new RangeError("guessing must be in the range [0, 1)");
  }
}

function logistic(value: number): number {
  // This form avoids overflowing Math.exp for extreme theta values.
  if (value >= 0) {
    const exp = Math.exp(-value);
    return 1 / (1 + exp);
  }
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

/** 3모수 로지스틱(3PL) 문항의 정답 확률을 계산한다. */
export function probabilityCorrect(theta: number, parameters: IrtParameters): number {
  assertFinite("theta", theta);
  assertParameters(parameters);

  const probability =
    parameters.guessing +
    (1 - parameters.guessing) * logistic(parameters.discrimination * (theta - parameters.difficulty));

  return Math.min(1, Math.max(parameters.guessing, probability));
}

/** 3PL 문항이 능력치 theta에서 제공하는 Fisher 정보량을 계산한다. */
export function itemInformation(theta: number, parameters: IrtParameters): number {
  const probability = probabilityCorrect(theta, parameters);
  const boundedProbability = Math.min(1 - PROBABILITY_EPSILON, Math.max(PROBABILITY_EPSILON, probability));
  const q = 1 - boundedProbability;
  const oneMinusGuessing = 1 - parameters.guessing;
  const numerator = parameters.discrimination ** 2 * (boundedProbability - parameters.guessing) ** 2;
  const denominator = oneMinusGuessing ** 2 * boundedProbability * q;

  return numerator / denominator;
}
