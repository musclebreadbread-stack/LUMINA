import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PLACE } from "@engine/shared/birth";
import { computeSaju } from "@engine/saju";
import { buildYearForecast, type YearForecast } from "@engine/saju/yearForecast";
import { aiFactsSchema } from "./types";

vi.mock("server-only", () => ({}));

import { buildYearForecastFacts } from "./facts";

function makeForecast(time: { hour: number; minute: number } | undefined = { hour: 14, minute: 30 }): YearForecast {
  const saju = computeSaju({
    date: { year: 1990, month: 5, day: 15 },
    ...(time ? { time } : {}),
    place: DEFAULT_PLACE,
    gender: "male",
  }, { applyTrueSolarTime: false });
  return buildYearForecast(saju);
}

describe("buildYearForecastFacts", () => {
  it("creates schema-valid annual, work, wellbeing, growth, relationship, and 12-month facts", () => {
    const forecast = makeForecast();
    const facts = buildYearForecastFacts(forecast);

    expect(aiFactsSchema.safeParse(facts).success).toBe(true);
    expect(facts.find((fact) => fact.id === "annual.pillar")).toMatchObject({
      lane: "annual",
      value: forecast.annual.labelHanja,
      evidenceRef: "annual-pillar",
    });
    expect(facts.find((fact) => fact.id === "work.luck-overlap")?.value).toBe("overlap-present");
    expect(facts.filter((fact) => fact.lane === "monthly" && fact.id.endsWith(".pillar")).map((fact) => fact.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `month.${String(index + 1).padStart(2, "0")}.pillar`),
    );
    expect(facts.some((fact) => fact.lane === "relationships")).toBe(true);
  });

  it("marks unknown birth time and an empty relationship set without inventing overlap", () => {
    const forecast = makeForecast(undefined);
    const noRelations: YearForecast = {
      ...forecast,
      natalBranchRelations: [],
      luckOverlap: {
        status: "unavailable-time-unknown",
        year: forecast.year,
        periods: [],
        basis: "birth-time-unknown",
        evidenceRefs: ["major-luck-overlap", "birth-time-precision"],
      },
    };
    const facts = buildYearForecastFacts(noRelations);

    expect(facts.find((fact) => fact.id === "work.luck-overlap")?.value).toBe("unavailable-time-unknown");
    expect(facts.find((fact) => fact.id === "relationship.none-found")).toMatchObject({
      value: "no-relation-match",
      evidenceRef: "natal-branch-relations",
    });
  });

  it("distinguishes a known-time forecast with no overlapping luck period", () => {
    const forecast = makeForecast();
    const noOverlap: YearForecast["luckOverlap"] = {
      status: "available",
      year: forecast.year,
      periods: [],
      basis: "rounded-calendar-year",
      evidenceRefs: ["major-luck-overlap", "birth-time-precision"],
    };

    const facts = buildYearForecastFacts({ ...forecast, luckOverlap: noOverlap });

    expect(facts.find((fact) => fact.id === "work.luck-overlap")?.value).toBe("no-overlap");
  });

  it("normalizes untrusted category labels before including them as facts", () => {
    const forecast = makeForecast();
    const unsafeLabel = {
      ...forecast,
      annual: { ...forecast.annual, labelHanja: "  丁未123😀  " },
    };

    expect(buildYearForecastFacts(unsafeLabel).find((fact) => fact.id === "annual.pillar")?.value).toBe("丁未");
  });

  it("bounds long category labels to the fact schema limit", () => {
    const forecast = makeForecast();
    const longLabel = {
      ...forecast,
      annual: { ...forecast.annual, labelHanja: "甲".repeat(100) },
    };

    expect(buildYearForecastFacts(longLabel).find((fact) => fact.id === "annual.pillar")?.value).toHaveLength(80);
  });

  it("refuses forecasts that no longer have the pending expert-review status", () => {
    const forecast = makeForecast();
    const reviewedForecast = { ...forecast, expertReviewStatus: "approved" } as unknown as YearForecast;

    expect(() => buildYearForecastFacts(reviewedForecast)).toThrow("Unexpected year forecast review state");
  });
});
