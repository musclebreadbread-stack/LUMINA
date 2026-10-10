import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locale";
import type { AIFacts } from "./types";
import type { AISettings } from "./settings";

type GenerateTextOptions = Readonly<{
  model: string;
  output: unknown;
  prompt: string;
  maxOutputTokens: number;
  abortSignal: AbortSignal;
  providerOptions: Readonly<Record<string, unknown>>;
}>;

type GenerateTextResult = Readonly<{
  output: unknown;
  response: Readonly<{ modelId: string }>;
  totalUsage: Readonly<{ inputTokens?: number; outputTokens?: number }>;
  providerMetadata: unknown;
}>;

const {
  buildPromptMock,
  createOpenRouterMock,
  generateTextMock,
  getAISettingsMock,
  outputObjectMock,
} = vi.hoisted(() => ({
  buildPromptMock: vi.fn<(input: Readonly<{ locale: Locale; facts: AIFacts; repairReasons?: readonly string[] }>) => string>(),
  createOpenRouterMock: vi.fn<(options: Readonly<{ apiKey: string }>) => (modelId: string) => string>(),
  generateTextMock: vi.fn<(options: GenerateTextOptions) => Promise<GenerateTextResult>>(),
  getAISettingsMock: vi.fn<() => AISettings | null>(),
  outputObjectMock: vi.fn<(input: Readonly<{ schema: unknown }>) => unknown>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@openrouter/ai-sdk-provider", () => ({ createOpenRouter: createOpenRouterMock }));
vi.mock("ai", () => ({ generateText: generateTextMock, Output: { object: outputObjectMock } }));
vi.mock("./prompts/yearForecast.v1", () => ({ buildYearForecastPrompt: buildPromptMock }));
vi.mock("./settings", () => ({ getAISettings: getAISettingsMock }));

import { generateYearForecastNarrative } from "./provider";

const settings: AISettings = {
  apiKey: "synthetic-openrouter-key",
  model: "provider/model-1",
  dailyBudgetMicrousd: 10_000,
  requestLimitMicrousd: 2_500,
};

const facts: AIFacts = [
  { id: "annual.pillar", lane: "annual", tier: "core", value: "wood", evidenceRef: "annual-pillar" },
];

function makeResult(providerMetadata: unknown, responseModelId = "provider/actual-model"): GenerateTextResult {
  return {
    output: { sections: [] },
    response: { modelId: responseModelId },
    totalUsage: { inputTokens: 17, outputTokens: 23 },
    providerMetadata,
  };
}

beforeEach(() => {
  getAISettingsMock.mockReset().mockReturnValue(settings);
  createOpenRouterMock.mockReset().mockReturnValue((modelId) => `model:${modelId}`);
  generateTextMock.mockReset().mockResolvedValue(makeResult(null));
  outputObjectMock.mockReset().mockReturnValue({ kind: "structured-output" });
  buildPromptMock.mockReset().mockReturnValue("synthetic narrative prompt");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("OpenRouter narrative provider", () => {
  it("fails closed when AI provider settings are disabled", async () => {
    getAISettingsMock.mockReturnValue(null);

    await expect(generateYearForecastNarrative({ locale: "ko", facts })).rejects.toThrow("ai_provider_disabled");
    expect(createOpenRouterMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("uses the response usage, model, ZDR settings, and provider-reported cost", async () => {
    generateTextMock.mockResolvedValue(makeResult({ openrouter: { usage: { cost: 0.0000011 } } }));

    await expect(generateYearForecastNarrative({
      locale: "ko",
      facts,
      repairReasons: ["invalid_annual_paragraph_1"],
    })).resolves.toEqual({
      output: { sections: [] },
      model: "provider/actual-model",
      inputTokens: 17,
      outputTokens: 23,
      costMicrousd: 2,
      costIsEstimate: false,
    });

    expect(createOpenRouterMock).toHaveBeenCalledWith({ apiKey: settings.apiKey });
    expect(buildPromptMock).toHaveBeenCalledWith({ locale: "ko", facts, repairReasons: ["invalid_annual_paragraph_1"] });
    expect(outputObjectMock).toHaveBeenCalledOnce();
    const request = generateTextMock.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      maxOutputTokens: 2_400,
      prompt: "synthetic narrative prompt",
      providerOptions: {
        openrouter: {
          provider: {
            data_collection: "deny",
            zdr: true,
            max_price: { request: "0.002500" },
          },
          usage: { include: true },
          temperature: 0.25,
        },
      },
    });
    expect(request?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("uses safe defaults when usage fields or the provider model id are absent", async () => {
    generateTextMock.mockResolvedValue({
      output: "narrative",
      response: { modelId: "" },
      totalUsage: {},
      providerMetadata: { openrouter: { usage: { cost: 0 } } },
    });

    await expect(generateYearForecastNarrative({ locale: "en", facts })).resolves.toEqual({
      output: "narrative",
      model: settings.model,
      inputTokens: 0,
      outputTokens: 0,
      costMicrousd: 0,
      costIsEstimate: false,
    });
  });

  it.each([
    null,
    [],
    { openrouter: [] },
    { openrouter: { usage: [] } },
    { openrouter: { usage: { cost: "0.01" } } },
    { openrouter: { usage: { cost: -0.01 } } },
    { openrouter: { usage: { cost: Number.POSITIVE_INFINITY } } },
    { openrouter: { usage: { cost: Number.MAX_VALUE } } },
  ])("uses the configured request limit when provider cost metadata is invalid", async (providerMetadata) => {
    generateTextMock.mockResolvedValue(makeResult(providerMetadata));

    await expect(generateYearForecastNarrative({ locale: "en", facts })).resolves.toMatchObject({
      costMicrousd: settings.requestLimitMicrousd,
      costIsEstimate: true,
    });
  });
});
