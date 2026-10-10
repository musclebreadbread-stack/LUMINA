import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION,
  isYearForecastExpertReviewApproved,
} from "./yearForecastApproval";

vi.mock("server-only", () => ({}));

describe("2027 forecast expert review approval", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed unless approval is true for the current report version", () => {
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "false");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION);
    expect(isYearForecastExpertReviewApproved()).toBe(false);

    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "true");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", "2027-saju-report-v0");
    expect(isYearForecastExpertReviewApproved()).toBe(false);

    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION);
    expect(isYearForecastExpertReviewApproved()).toBe(true);
  });
});
