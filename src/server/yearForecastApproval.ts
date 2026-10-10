import "server-only";

/** Bump this release id whenever reviewed 2027 forecast content or calculations change. */
export const CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION = "2027-saju-report-v1";

/**
 * Whether a human has signed off on the deterministic 2027 forecast's calculation
 * core, for exactly the current content version. This is a narrower, earlier
 * approval than `isAIReportingEnabled()`: the saju content itself can be reviewed
 * and approved before the AI narrative pipeline's other gates (golden set, source
 * licensing, OpenRouter keys, ...) are ready, and the report page shows this
 * status regardless of whether AI is on.
 */
export function isYearForecastExpertReviewApproved(): boolean {
  return process.env.YEAR_FORECAST_EXPERT_REVIEW_APPROVED === "true"
    && process.env.YEAR_FORECAST_EXPERT_REVIEW_VERSION === CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION;
}
