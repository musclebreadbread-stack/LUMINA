export type ResponseQualityFlag = "uniform" | "narrow-range";

export interface ResponseQuality {
  readonly flag: ResponseQualityFlag | null;
  readonly answeredCount: number;
  readonly distinctValueCount: number;
}

/**
 * A non-diagnostic response-pattern check. It never changes a score; it only
 * tells the reader when a one-pattern response makes fine-grained wording less useful.
 */
export function assessLikertResponseQuality(values: readonly number[]): ResponseQuality {
  const answered = values.filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
  const distinct = new Set(answered);
  const distinctValueCount = distinct.size;
  const minimum = Math.min(...answered);
  const maximum = Math.max(...answered);
  const flag =
    answered.length >= 4 && distinctValueCount === 1
      ? "uniform"
      : answered.length >= 4 && distinctValueCount <= 2 && maximum - minimum <= 1
        ? "narrow-range"
        : null;

  return Object.freeze({ flag, answeredCount: answered.length, distinctValueCount });
}
