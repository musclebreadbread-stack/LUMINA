import "server-only";

import { serverFeatureFlags } from "@/lib/flags";

export interface AISettings {
  readonly apiKey: string;
  readonly model: string;
  readonly dailyBudgetMicrousd: number;
  readonly requestLimitMicrousd: number;
}

function usdToMicrousd(value: string | undefined): number | null {
  if (!value || !/^(?:0|[1-9]\d{0,5})(?:\.\d{1,6})?$/u.test(value)) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100) return null;
  const microusd = Math.round(amount * 1_000_000);
  return Number.isSafeInteger(microusd) ? microusd : null;
}

export function getAISettings(): AISettings | null {
  if (!serverFeatureFlags.aiNarrative
    || process.env.APP_ENV !== "production"
    || process.env.AI_NARRATIVE_LEGAL_APPROVED !== "true"
    || process.env.AI_GOLDEN_SET_APPROVED !== "true"
    || process.env.AI_FACT_SOURCES_APPROVED !== "true"
    || process.env.AI_LICENSE_APPROVED !== "true"
    || process.env.YEAR_FORECAST_EXPERT_REVIEW_APPROVED !== "true") {
    return null;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  const dailyBudgetMicrousd = usdToMicrousd(process.env.AI_DAILY_BUDGET_USD);
  const requestLimitMicrousd = usdToMicrousd(process.env.AI_MAX_REQUEST_COST_USD);
  const workerUrl = process.env.AI_DATABASE_URL?.trim();
  const hmacKey = process.env.AI_USER_REF_HMAC_KEY;
  if (!apiKey || /[\r\n]/u.test(apiKey)
    || !model || !/^[a-z0-9][a-z0-9._/-]{2,200}$/iu.test(model)
    || !workerUrl || !hmacKey || Buffer.byteLength(hmacKey, "utf8") < 32 || /[\r\n]/u.test(hmacKey)
    || dailyBudgetMicrousd === null || requestLimitMicrousd === null
    || dailyBudgetMicrousd < requestLimitMicrousd) {
    return null;
  }

  return { apiKey, model, dailyBudgetMicrousd, requestLimitMicrousd };
}

export function isAIReportingEnabled(): boolean {
  return getAISettings() !== null;
}

/**
 * Whether a human has signed off on the deterministic 2027 forecast's calculation
 * core. This is a narrower, earlier approval than `isAIReportingEnabled()`: the
 * saju content itself can be reviewed and approved before the AI narrative
 * pipeline's other gates (golden set, source licensing, OpenRouter keys, ...) are
 * ready, and the report page shows this status regardless of whether AI is on.
 */
export function isYearForecastExpertReviewApproved(): boolean {
  return process.env.YEAR_FORECAST_EXPERT_REVIEW_APPROVED === "true";
}
