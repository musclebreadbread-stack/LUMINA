import type { ScoreRunInput, ScoredRun } from "./types";

/**
 * Phase A deliberately has no approved norm registry. Phase B may add a
 * version only after preregistration, calibration, Korean adult norming,
 * fairness review and independent sign-off.
 */
export const APPROVED_NORM_VERSIONS: ReadonlySet<string> = new Set();

/**
 * 규준 승인 전에는 어떤 원점수도 IQ·백분위로 노출하지 않는다.
 * 표준화 모드에서는 서버가 승인된 규준 버전과 계산된 점수를 함께 제공해야 한다.
 */
export function scoreRun(input: ScoreRunInput): ScoredRun {
  if (input.releaseMode !== "standardized" || !input.standardizationEligible) {
    return Object.freeze({ status: "pilot_withheld" as const, score: null });
  }

  if (
    input.normVersion === null ||
    input.score === null ||
    input.normVersion.trim().length === 0 ||
    !APPROVED_NORM_VERSIONS.has(input.normVersion)
  ) {
    throw new Error("approved norm version is required");
  }

  if (input.score.normVersion !== input.normVersion) {
    throw new Error("score norm version does not match approved norm version");
  }

  return Object.freeze({ status: "standardized_scored" as const, score: input.score });
}
