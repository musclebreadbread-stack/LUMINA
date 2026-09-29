import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  getAISettings: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  list: vi.fn(),
  fallback: vi.fn(),
  record: vi.fn(),
  release: vi.fn(),
  reserve: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("../provider", () => ({ generateYearForecastNarrative: mocks.generate }));
vi.mock("../settings", () => ({ getAISettings: mocks.getAISettings }));
vi.mock("../service", () => ({
  claimYearForecastNarrative: mocks.claim,
  completeYearForecastNarrative: mocks.complete,
  listYearForecastNarrativesForSweep: mocks.list,
  markYearForecastNarrativeFallback: mocks.fallback,
  recordAIBudgetUsage: mocks.record,
  releaseAIBudgetReservation: mocks.release,
  reserveAIDailyBudget: mocks.reserve,
}));
vi.mock("../validation", () => ({ validateNarrative: mocks.validate }));

import { processYearForecastNarrative, sweepYearForecastNarratives } from "../worker";

const SETTINGS = { apiKey: "k", model: "m", dailyBudgetMicrousd: 1000, requestLimitMicrousd: 100 };
const JOB = {
  id: "n1",
  userId: "u1",
  userRefHmac: Buffer.from("ref"),
  locale: "ko",
  facts: [{ id: "a" }],
  attemptCount: 2,
};
const CANDIDATE = {
  output: { sections: ["candidate"] },
  model: "model-x",
  inputTokens: 10,
  outputTokens: 20,
  costMicrousd: 5,
  costIsEstimate: true,
};
const ACCEPTED = { accepted: true, output: { sections: ["ok"] }, repairReasons: [] };
const REJECTED = { accepted: false, output: null, repairReasons: ["bad_1"] };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getAISettings.mockReturnValue(SETTINGS);
  mocks.claim.mockResolvedValue(JOB);
  mocks.reserve.mockResolvedValue(true);
  mocks.generate.mockResolvedValue(CANDIDATE);
  mocks.record.mockResolvedValue(undefined);
  mocks.release.mockResolvedValue(undefined);
  mocks.fallback.mockResolvedValue(undefined);
  mocks.complete.mockResolvedValue(undefined);
});

describe("processYearForecastNarrative", () => {
  it("does nothing when AI is not configured", async () => {
    mocks.getAISettings.mockReturnValue(null);
    await processYearForecastNarrative("n1");
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("does nothing when no job can be claimed", async () => {
    mocks.claim.mockResolvedValue(null);
    await processYearForecastNarrative("n1");
    expect(mocks.claim).toHaveBeenCalledWith("n1");
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.fallback).not.toHaveBeenCalled();
  });

  it("completes on the first accepted generation and records usage", async () => {
    mocks.validate.mockReturnValue(ACCEPTED);
    await processYearForecastNarrative("n1");

    expect(mocks.reserve).toHaveBeenCalledTimes(1);
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({
      narrativeId: "n1",
      requestLimitMicrousd: 100,
      dailyBudgetMicrousd: 1000,
    }));
    expect(mocks.generate).toHaveBeenCalledWith({ locale: "ko", facts: JOB.facts, repairReasons: undefined });
    const usageCall = mocks.record.mock.calls[0]![0];
    expect(usageCall.usage).toMatchObject({
      narrativeId: "n1",
      requestId: "n1:2:report",
      tier: "report",
      model: "model-x",
      inputTokens: 10,
      outputTokens: 20,
      costMicrousd: 5,
      costIsEstimate: true,
    });
    expect(usageCall.reservationId).toBe(mocks.reserve.mock.calls[0]![0].reservationId);
    expect(mocks.complete).toHaveBeenCalledWith(JOB, ACCEPTED.output);
    expect(mocks.fallback).not.toHaveBeenCalled();
  });

  it("repairs after a rejected first attempt and completes with the repaired output", async () => {
    mocks.validate.mockReturnValueOnce(REJECTED).mockReturnValueOnce(ACCEPTED);
    await processYearForecastNarrative("n1");

    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.generate.mock.calls[1]![0].repairReasons).toEqual(["bad_1"]);
    expect(mocks.record.mock.calls[1]![0].usage).toMatchObject({ tier: "repair", requestId: "n1:2:repair" });
    expect(mocks.complete).toHaveBeenCalledWith(JOB, ACCEPTED.output);
    expect(mocks.fallback).not.toHaveBeenCalled();
  });

  it("marks fallback when the repair attempt is also rejected", async () => {
    mocks.validate.mockReturnValue(REJECTED);
    await processYearForecastNarrative("n1");
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fallback).toHaveBeenCalledWith("n1");
  });

  it("treats accepted-without-output as rejected", async () => {
    mocks.validate.mockReturnValue({ accepted: true, output: null, repairReasons: [] });
    await processYearForecastNarrative("n1");
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.fallback).toHaveBeenCalledWith("n1");
  });

  it("falls back without generating when the daily budget is exhausted", async () => {
    mocks.reserve.mockResolvedValue(false);
    await processYearForecastNarrative("n1");
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.fallback).toHaveBeenCalledWith("n1");
  });

  it("releases the reservation and falls back when generation throws", async () => {
    mocks.generate.mockRejectedValue(new Error("provider down"));
    await processYearForecastNarrative("n1");
    const reservationId = mocks.reserve.mock.calls[0]![0].reservationId;
    expect(mocks.release).toHaveBeenCalledWith(reservationId);
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.fallback).toHaveBeenCalledWith("n1");
  });

  it("still falls back when releasing the reservation and marking fallback both fail", async () => {
    mocks.generate.mockRejectedValue(new Error("provider down"));
    mocks.release.mockRejectedValue(new Error("db down"));
    mocks.fallback.mockRejectedValue(new Error("db down"));
    await expect(processYearForecastNarrative("n1")).resolves.toBeUndefined();
    expect(mocks.fallback).toHaveBeenCalledWith("n1");
  });
});

describe("sweepYearForecastNarratives", () => {
  it("returns zero when AI is not configured", async () => {
    mocks.getAISettings.mockReturnValue(null);
    await expect(sweepYearForecastNarratives()).resolves.toEqual({ selected: 0 });
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("processes each listed narrative sequentially", async () => {
    mocks.list.mockResolvedValue(["a", "b"]);
    mocks.claim.mockResolvedValue(null);
    await expect(sweepYearForecastNarratives(5)).resolves.toEqual({ selected: 2 });
    expect(mocks.list).toHaveBeenCalledWith(5);
    expect(mocks.claim.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
  });

  it("defaults the limit to 2", async () => {
    mocks.list.mockResolvedValue([]);
    await expect(sweepYearForecastNarratives()).resolves.toEqual({ selected: 0 });
    expect(mocks.list).toHaveBeenCalledWith(2);
  });
});
