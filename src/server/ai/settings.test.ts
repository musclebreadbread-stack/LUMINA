import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION } from "@/server/yearForecastApproval";

const { serverFeatureFlagsMock } = vi.hoisted(() => ({
  serverFeatureFlagsMock: { aiNarrative: true },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: serverFeatureFlagsMock }));

import { getAISettings } from "./settings";

describe("AI narrative launch gates", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("AI_NARRATIVE_LEGAL_APPROVED", "true");
    vi.stubEnv("AI_GOLDEN_SET_APPROVED", "true");
    vi.stubEnv("AI_FACT_SOURCES_APPROVED", "true");
    vi.stubEnv("AI_LICENSE_APPROVED", "true");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "true");
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", CURRENT_YEAR_FORECAST_EXPERT_REVIEW_VERSION);
    vi.stubEnv("OPENROUTER_API_KEY", "synthetic-test-key");
    vi.stubEnv("OPENROUTER_MODEL", "provider/test-model");
    vi.stubEnv("AI_DATABASE_URL", "postgresql://ai-worker.invalid/database");
    vi.stubEnv("AI_USER_REF_HMAC_KEY", "synthetic-ai-reference-key-with-more-than-32-bytes");
    vi.stubEnv("AI_DAILY_BUDGET_USD", "5.00");
    vi.stubEnv("AI_MAX_REQUEST_COST_USD", "0.05");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps AI disabled when review approval is stale for the current report version", () => {
    vi.stubEnv("YEAR_FORECAST_EXPERT_REVIEW_VERSION", "2027-saju-report-v0");

    expect(getAISettings()).toBeNull();
  });

  it("accepts AI settings after the exact reviewed report version is approved", () => {
    expect(getAISettings()).toEqual({
      apiKey: "synthetic-test-key",
      model: "provider/test-model",
      dailyBudgetMicrousd: 5_000_000,
      requestLimitMicrousd: 50_000,
    });
  });
});
