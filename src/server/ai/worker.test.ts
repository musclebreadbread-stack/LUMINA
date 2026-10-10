import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/locale";
import type { GeneratedNarrativeCandidate } from "./provider";
import type { AISettings } from "./settings";
import type { NarrativeJob, AIFacts, NarrativeOutput } from "./types";
import { narrativeOutputSchema, narrativeSectionIds } from "./types";
import type { NarrativeValidationResult } from "./validation";

const {
  claimMock,
  completeMock,
  generateMock,
  getAISettingsMock,
  listMock,
  markFallbackMock,
  recordUsageMock,
  releaseReservationMock,
  reserveBudgetMock,
  validateMock,
} = vi.hoisted(() => ({
  claimMock: vi.fn<(narrativeId: string) => Promise<NarrativeJob | null>>(),
  completeMock: vi.fn<(job: NarrativeJob, output: NarrativeOutput) => Promise<void>>(),
  generateMock: vi.fn<(input: Readonly<{ locale: Locale; facts: AIFacts; repairReasons?: readonly string[] }>) => Promise<GeneratedNarrativeCandidate>>(),
  getAISettingsMock: vi.fn<() => AISettings | null>(),
  listMock: vi.fn<(limit: number) => Promise<readonly string[]>>(),
  markFallbackMock: vi.fn<(narrativeId: string) => Promise<void>>(),
  recordUsageMock: vi.fn<(input: unknown) => Promise<void>>(),
  releaseReservationMock: vi.fn<(reservationId: string) => Promise<void>>(),
  reserveBudgetMock: vi.fn<(input: unknown) => Promise<boolean>>(),
  validateMock: vi.fn<(candidate: unknown, facts: AIFacts) => NarrativeValidationResult>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./provider", () => ({ generateYearForecastNarrative: generateMock }));
vi.mock("./settings", () => ({ getAISettings: getAISettingsMock }));
vi.mock("./service", () => ({
  claimYearForecastNarrative: claimMock,
  completeYearForecastNarrative: completeMock,
  listYearForecastNarrativesForSweep: listMock,
  markYearForecastNarrativeFallback: markFallbackMock,
  recordAIBudgetUsage: recordUsageMock,
  releaseAIBudgetReservation: releaseReservationMock,
  reserveAIDailyBudget: reserveBudgetMock,
}));
vi.mock("./validation", () => ({ validateNarrative: validateMock }));

import { processYearForecastNarrative, sweepYearForecastNarratives } from "./worker";

const settings: AISettings = {
  apiKey: "synthetic-openrouter-key",
  model: "provider/model-1",
  dailyBudgetMicrousd: 10_000,
  requestLimitMicrousd: 2_500,
};

const facts: AIFacts = [
  { id: "annual.pillar", lane: "annual", tier: "core", value: "wood", evidenceRef: "annual-pillar" },
];

const output: NarrativeOutput = narrativeOutputSchema.parse({
  sections: narrativeSectionIds.map((id) => ({
    id,
    paragraphs: id === "monthly"
      ? Array.from({ length: 12 }, () => ({
        text: "A grounded reflection can focus on patterns supported by the available evidence.",
        citedFactIds: ["annual.pillar"],
      }))
      : [{ text: "A grounded reflection can focus on patterns supported by the available evidence.", citedFactIds: ["annual.pillar"] }],
  })),
});

const job: NarrativeJob = {
  id: "narrative-1",
  userId: "member-1",
  userRefHmac: Buffer.alloc(32, 11),
  cacheKey: Buffer.alloc(32, 12),
  factSheetVersion: "2027.1",
  locale: "ko",
  promptVersion: "year-forecast.v1",
  schemaVersion: "narrative.v1",
  tier: "report",
  facts,
  attemptCount: 2,
};

function makeCandidate(outputValue: unknown = { sections: "synthetic" }): GeneratedNarrativeCandidate {
  return {
    output: outputValue,
    model: settings.model,
    inputTokens: 15,
    outputTokens: 25,
    costMicrousd: 120,
    costIsEstimate: false,
  };
}

function acceptedValidation(): NarrativeValidationResult {
  return { accepted: true, output, coverage: 1, repairReasons: [] };
}

function rejectedValidation(): NarrativeValidationResult {
  return { accepted: false, output: null, coverage: 0.5, repairReasons: ["invalid_annual_paragraph_1"] };
}

beforeEach(() => {
  claimMock.mockReset().mockResolvedValue(job);
  completeMock.mockReset().mockResolvedValue(undefined);
  generateMock.mockReset().mockResolvedValue(makeCandidate());
  getAISettingsMock.mockReset().mockReturnValue(settings);
  listMock.mockReset().mockResolvedValue([]);
  markFallbackMock.mockReset().mockResolvedValue(undefined);
  recordUsageMock.mockReset().mockResolvedValue(undefined);
  releaseReservationMock.mockReset().mockResolvedValue(undefined);
  reserveBudgetMock.mockReset().mockResolvedValue(true);
  validateMock.mockReset().mockReturnValue(acceptedValidation());
});

describe("year forecast AI worker", () => {
  it("does not claim or schedule work when AI is disabled", async () => {
    getAISettingsMock.mockReturnValue(null);

    await processYearForecastNarrative("narrative-1");
    await expect(sweepYearForecastNarratives()).resolves.toEqual({ selected: 0 });

    expect(claimMock).not.toHaveBeenCalled();
    expect(listMock).not.toHaveBeenCalled();
  });

  it("stops when another worker has already claimed the job", async () => {
    claimMock.mockResolvedValue(null);

    await processYearForecastNarrative("narrative-1");

    expect(claimMock).toHaveBeenCalledWith("narrative-1");
    expect(reserveBudgetMock).not.toHaveBeenCalled();
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("uses the deterministic fallback when no daily AI budget is available", async () => {
    reserveBudgetMock.mockResolvedValue(false);

    await processYearForecastNarrative("narrative-1");

    expect(generateMock).not.toHaveBeenCalled();
    expect(markFallbackMock).toHaveBeenCalledWith(job.id);
  });

  it("records provider usage and completes an accepted first response", async () => {
    const candidate = makeCandidate({ untrusted: "raw" });
    generateMock.mockResolvedValue(candidate);
    validateMock.mockReturnValue({ ...acceptedValidation(), output });

    await processYearForecastNarrative(job.id);

    expect(recordUsageMock).toHaveBeenCalledWith(expect.objectContaining({
      usage: expect.objectContaining({
        narrativeId: job.id,
        requestId: `${job.id}:${job.attemptCount}:report`,
        tier: "report",
        userRefHmac: job.userRefHmac,
        costMicrousd: candidate.costMicrousd,
      }),
    }));
    expect(validateMock).toHaveBeenCalledWith(candidate.output, facts);
    expect(completeMock).toHaveBeenCalledWith(job, output);
    expect(generateMock).toHaveBeenCalledOnce();
    expect(markFallbackMock).not.toHaveBeenCalled();
  });

  it("repairs an invalid first response once and completes the accepted repair", async () => {
    generateMock
      .mockResolvedValueOnce(makeCandidate({ first: true }))
      .mockResolvedValueOnce(makeCandidate({ repaired: true }));
    validateMock.mockReturnValueOnce(rejectedValidation()).mockReturnValueOnce(acceptedValidation());

    await processYearForecastNarrative(job.id);

    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(generateMock.mock.calls[1]?.[0]).toEqual({
      locale: job.locale,
      facts,
      repairReasons: ["invalid_annual_paragraph_1"],
    });
    expect(recordUsageMock).toHaveBeenCalledTimes(2);
    expect(recordUsageMock.mock.calls[1]?.[0]).toMatchObject({
      usage: { requestId: `${job.id}:${job.attemptCount}:repair`, tier: "repair" },
    });
    expect(completeMock).toHaveBeenCalledWith(job, output);
    expect(markFallbackMock).not.toHaveBeenCalled();
  });

  it("marks deterministic fallback when both generated responses fail validation", async () => {
    validateMock.mockReturnValue(rejectedValidation());

    await processYearForecastNarrative(job.id);

    expect(generateMock).toHaveBeenCalledTimes(2);
    expect(completeMock).not.toHaveBeenCalled();
    expect(markFallbackMock).toHaveBeenCalledWith(job.id);
  });

  it("releases a budget reservation when provider generation fails", async () => {
    generateMock.mockRejectedValue(new Error("synthetic provider failure"));

    await expect(processYearForecastNarrative(job.id)).resolves.toBeUndefined();

    expect(releaseReservationMock).toHaveBeenCalledOnce();
    expect(recordUsageMock).not.toHaveBeenCalled();
    expect(markFallbackMock).toHaveBeenCalledWith(job.id);
  });

  it("uses fallback when recording usage fails and ignores reservation-release failure", async () => {
    recordUsageMock.mockRejectedValue(new Error("synthetic usage ledger failure"));
    releaseReservationMock.mockRejectedValue(new Error("synthetic release failure"));

    await expect(processYearForecastNarrative(job.id)).resolves.toBeUndefined();

    expect(generateMock).toHaveBeenCalledOnce();
    expect(validateMock).not.toHaveBeenCalled();
    expect(markFallbackMock).toHaveBeenCalledWith(job.id);
  });

  it("falls back when the repaired generation cannot reserve budget", async () => {
    validateMock.mockReturnValueOnce(rejectedValidation());
    reserveBudgetMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await processYearForecastNarrative(job.id);

    expect(generateMock).toHaveBeenCalledOnce();
    expect(markFallbackMock).toHaveBeenCalledWith(job.id);
  });

  it("falls back when saving an accepted narrative fails and swallows fallback-write errors", async () => {
    completeMock.mockRejectedValue(new Error("synthetic narrative save failure"));
    markFallbackMock.mockRejectedValue(new Error("synthetic fallback write failure"));

    await expect(processYearForecastNarrative(job.id)).resolves.toBeUndefined();

    expect(completeMock).toHaveBeenCalledOnce();
    expect(markFallbackMock).toHaveBeenCalledWith(job.id);
  });

  it("sweeps only the selected IDs and returns their count", async () => {
    listMock.mockResolvedValue(["narrative-1", "narrative-2"]);
    claimMock.mockImplementation(async (narrativeId) => ({ ...job, id: narrativeId }));

    await expect(sweepYearForecastNarratives(3)).resolves.toEqual({ selected: 2 });

    expect(listMock).toHaveBeenCalledWith(3);
    expect(claimMock.mock.calls.map(([narrativeId]) => narrativeId)).toEqual(["narrative-1", "narrative-2"]);
    expect(completeMock).toHaveBeenCalledTimes(2);
  });
});
