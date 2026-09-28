import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeSaju } from "@engine/saju";
import { buildYearForecast } from "@engine/saju/yearForecast";
import type { BirthInput } from "@engine/shared/birth";
import { DEFAULT_PLACE } from "@engine/shared/birth";
import { buildYearForecastFacts } from "../facts";

const BIRTH: BirthInput = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 14, minute: 30 },
  place: DEFAULT_PLACE,
  gender: "male",
};

function forecastWith(expertReviewStatus: "pending" | "approved") {
  const saju = computeSaju(BIRTH, { applyTrueSolarTime: false });
  return buildYearForecast(saju, 2027, { expertReviewStatus });
}

describe("buildYearForecastFacts", () => {
  it("builds facts when the forecast's review status is 'pending'", () => {
    const facts = buildYearForecastFacts(forecastWith("pending"));
    expect(facts.length).toBeGreaterThan(0);
  });

  it("still builds facts once the forecast's review status is 'approved'", () => {
    // Regression test: buildYearForecastFacts used to throw whenever
    // expertReviewStatus was anything other than "pending" — which is exactly the
    // state a real approval flow would set it to. That check was backwards: the
    // AI pipeline's own gate (YEAR_FORECAST_EXPERT_REVIEW_APPROVED, checked in
    // getAISettings()) already controls whether this function runs at all, so
    // there is no reason for facts-building itself to reject an approved review.
    const facts = buildYearForecastFacts(forecastWith("approved"));
    expect(facts.length).toBeGreaterThan(0);
  });

  it("produces the same facts regardless of review status", () => {
    const pending = buildYearForecastFacts(forecastWith("pending"));
    const approved = buildYearForecastFacts(forecastWith("approved"));
    expect(approved).toEqual(pending);
  });

  it("every factId cited by the forecast's domain-chapter blocks (Track B1) names a real fact", () => {
    // yearForecastChapters.ts is a pure engine module and cannot import this
    // server-only file, so its factIds are plain string literals kept in sync
    // with buildYearForecastFacts() by convention. This is the parity check.
    const forecast = forecastWith("pending");
    const facts = buildYearForecastFacts(forecast);
    const factIdSet = new Set(facts.map((fact) => fact.id));
    const citedFactIds = forecast.blocks.flatMap((block) => block.factIds ?? []);

    expect(citedFactIds.length).toBeGreaterThan(0);
    for (const factId of citedFactIds) {
      expect(factIdSet.has(factId)).toBe(true);
    }
  });
});
