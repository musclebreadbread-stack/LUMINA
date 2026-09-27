import "server-only";

import { randomUUID } from "node:crypto";
import { generateYearForecastNarrative } from "./provider";
import { getAISettings } from "./settings";
import {
  claimYearForecastNarrative,
  completeYearForecastNarrative,
  listYearForecastNarrativesForSweep,
  markYearForecastNarrativeFallback,
  recordAIBudgetUsage,
  releaseAIBudgetReservation,
  reserveAIDailyBudget,
} from "./service";
import { validateNarrative } from "./validation";
import type { NarrativeJob } from "./types";

async function generateAndAccount(
  job: NarrativeJob,
  settings: NonNullable<ReturnType<typeof getAISettings>>,
  tier: "report" | "repair",
  repairReasons?: readonly string[],
): Promise<unknown> {
  const reservationId = randomUUID();
  const reserved = await reserveAIDailyBudget({
    reservationId,
    narrativeId: job.id,
    requestLimitMicrousd: settings.requestLimitMicrousd,
    dailyBudgetMicrousd: settings.dailyBudgetMicrousd,
  });
  if (!reserved) throw new Error("ai_daily_budget_reached");

  try {
    const candidate = await generateYearForecastNarrative({ locale: job.locale, facts: job.facts, repairReasons });
    await recordAIBudgetUsage({
      reservationId,
      usage: {
        narrativeId: job.id,
        requestId: `${job.id}:${job.attemptCount}:${tier}`,
        userRefHmac: job.userRefHmac,
        tier,
        model: candidate.model,
        inputTokens: candidate.inputTokens,
        outputTokens: candidate.outputTokens,
        costMicrousd: candidate.costMicrousd,
        costIsEstimate: candidate.costIsEstimate,
      },
    });
    return candidate.output;
  } catch (error) {
    await releaseAIBudgetReservation(reservationId).catch(() => undefined);
    throw error;
  }
}

export async function processYearForecastNarrative(narrativeId: string): Promise<void> {
  const settings = getAISettings();
  if (!settings) return;
  const job = await claimYearForecastNarrative(narrativeId);
  if (!job) return;

  try {
    const initial = await generateAndAccount(job, settings, "report");
    const firstValidation = validateNarrative(initial, job.facts);
    if (firstValidation.accepted && firstValidation.output) {
      await completeYearForecastNarrative(job, firstValidation.output);
      return;
    }

    const repaired = await generateAndAccount(job, settings, "repair", firstValidation.repairReasons);
    const secondValidation = validateNarrative(repaired, job.facts);
    if (secondValidation.accepted && secondValidation.output) {
      await completeYearForecastNarrative(job, secondValidation.output);
      return;
    }
  } catch {
    // The deterministic year-forecast explanation blocks remain the user-visible fallback.
  }
  await markYearForecastNarrativeFallback(job.id).catch(() => undefined);
}

export async function sweepYearForecastNarratives(limit = 2): Promise<Readonly<{ selected: number }>> {
  if (!getAISettings()) return { selected: 0 };
  const ids = await listYearForecastNarrativesForSweep(limit);
  for (const id of ids) await processYearForecastNarrative(id);
  return { selected: ids.length };
}
