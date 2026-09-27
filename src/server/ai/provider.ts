import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { buildYearForecastPrompt } from "./prompts/yearForecast.v1";
import { getAISettings } from "./settings";
import { aiNarrativeGenerationSchema, type AIFacts } from "./types";
import type { Locale } from "@/i18n/locale";

export interface GeneratedNarrativeCandidate {
  readonly output: unknown;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costMicrousd: number;
  readonly costIsEstimate: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOpenRouterCost(providerMetadata: unknown): number | null {
  if (!isRecord(providerMetadata)) return null;
  const openrouter = providerMetadata.openrouter;
  if (!isRecord(openrouter) || !isRecord(openrouter.usage)) return null;
  const cost = openrouter.usage.cost;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) return null;
  const microusd = Math.ceil(cost * 1_000_000);
  return Number.isSafeInteger(microusd) ? microusd : null;
}

export async function generateYearForecastNarrative(input: Readonly<{
  locale: Locale;
  facts: AIFacts;
  repairReasons?: readonly string[];
}>): Promise<GeneratedNarrativeCandidate> {
  const settings = getAISettings();
  if (!settings) throw new Error("ai_provider_disabled");

  const provider = createOpenRouter({ apiKey: settings.apiKey });
  const result = await generateText({
    model: provider(settings.model),
    output: Output.object({ schema: aiNarrativeGenerationSchema }),
    prompt: buildYearForecastPrompt(input),
    maxOutputTokens: 2_400,
    abortSignal: AbortSignal.timeout(45_000),
    providerOptions: {
      openrouter: {
        provider: {
          data_collection: "deny",
          zdr: true,
          max_price: { request: (settings.requestLimitMicrousd / 1_000_000).toFixed(6) },
        },
        usage: { include: true },
        temperature: 0.25,
      },
    },
  });

  const providerCostMicrousd = readOpenRouterCost(result.providerMetadata);
  const costMicrousd = providerCostMicrousd ?? settings.requestLimitMicrousd;
  return {
    output: result.output,
    model: result.response.modelId || settings.model,
    inputTokens: result.totalUsage.inputTokens ?? 0,
    outputTokens: result.totalUsage.outputTokens ?? 0,
    costMicrousd,
    costIsEstimate: providerCostMicrousd === null,
  };
}
