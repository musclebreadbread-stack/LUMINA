import "server-only";

/** Bump this release id whenever reviewed 2027 forecast content or calculations change. */
export const CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION = "2027-saju-report-v1";

export function isYearForecastExpertReviewApproved(): boolean {
  return process.env.YEAR_FORECAST_EXPERT_REVIEW_APPROVED === "true"
    && process.env.YEAR_FORECAST_EXPERT_REVIEW_VERSION === CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION;
}
