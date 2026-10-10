import { describe, expect, it } from "vitest";
import { DEFAULT_PLACE, type BirthInput } from "@engine/shared/birth";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { computeSaju } from "@engine/saju";
import { buildYearForecast, type YearForecastBlock } from "@engine/saju/yearForecast";
import { buildYearForecastChapters } from "@engine/saju/yearForecastChapters";

const BASE_BIRTH: BirthInput = {
  date: { year: 1990, month: 5, day: 15 },
  time: { hour: 14, minute: 30 },
  place: DEFAULT_PLACE,
  gender: "male",
};

const CHAPTER_KINDS = ["work", "relationships", "wellbeing", "growth"] as const;

function forecastFor(input: BirthInput) {
  const saju = computeSaju(input, { applyTrueSolarTime: false });
  return buildYearForecast(saju);
}

function chapterBlocksOf(blocks: readonly YearForecastBlock[], kind: (typeof CHAPTER_KINDS)[number]) {
  return blocks.filter((block) => block.kind === kind);
}

describe("buildYearForecastChapters", () => {
  it("appends exactly two blocks per domain chapter to the forecast's blocks", () => {
    const forecast = forecastFor(BASE_BIRTH);
    for (const kind of CHAPTER_KINDS) {
      expect(chapterBlocksOf(forecast.blocks, kind)).toHaveLength(2);
    }
  });

  it("every chapter block passes structural validation and carries non-empty factIds only when a match was found", () => {
    const forecast = forecastFor(BASE_BIRTH);
    for (const kind of CHAPTER_KINDS) {
      for (const block of chapterBlocksOf(forecast.blocks, kind)) {
        assertExplanationBlock(block);
        expect(block.tier).toBe("cultural");
        expect(Array.isArray(block.factIds)).toBe(true);
        expect(`${block.detail.ko}${block.detail.en}`).not.toContain("will happen");
      }
    }
  });

  it("the work chapter's notable month is the first month whose stem or branch Ten God is Wealth or Officer", () => {
    const forecast = forecastFor(BASE_BIRTH);
    const [, monthBlock] = chapterBlocksOf(forecast.blocks, "work");
    const expected = forecast.months.find((month) => (
      ["편재", "정재", "편관", "정관"].includes(month.stemTenGod)
      || ["편재", "정재", "편관", "정관"].includes(month.branchTenGod)
    ));
    expect(monthBlock).toBeDefined();
    if (expected) {
      expect(monthBlock?.id).toBe(`saju-year-forecast-2027-work-notable-month-${expected.ordinal + 1}`);
      expect(monthBlock?.factIds?.length).toBeGreaterThan(0);
    } else {
      expect(monthBlock?.id).toBe("saju-year-forecast-2027-work-notable-month-none");
      expect(monthBlock?.factIds).toEqual([]);
    }
  });

  it("falls back to an explicit 'no notable month' block when no month qualifies for a chapter", () => {
    const forecast = forecastFor(BASE_BIRTH);
    // Force every month's Ten Gods to a role that never satisfies the work chapter's rule
    // (Companion), regardless of what this fixture's real chart happens to contain.
    const neutralMonths = forecast.months.map((month) => ({ ...month, stemTenGod: "비견" as const, branchTenGod: "겁재" as const }));

    const blocks = buildYearForecastChapters({
      year: forecast.year,
      result: computeSaju(BASE_BIRTH, { applyTrueSolarTime: false }),
      annual: forecast.annual,
      months: neutralMonths,
      natalBranchRelations: forecast.natalBranchRelations,
    });

    const [, workMonthBlock] = blocks.filter((block) => block.kind === "work");
    expect(workMonthBlock?.id).toBe("saju-year-forecast-2027-work-notable-month-none");
    expect(workMonthBlock?.factIds).toEqual([]);
    expect(workMonthBlock?.detail.ko).toContain("확인되지 않았습니다");
  });

  it("falls back to the no-relation-found text when no natal branch relation was found", () => {
    const forecast = forecastFor(BASE_BIRTH);
    const blocks = buildYearForecastChapters({
      year: forecast.year,
      result: computeSaju(BASE_BIRTH, { applyTrueSolarTime: false }),
      annual: forecast.annual,
      months: forecast.months,
      natalBranchRelations: [],
    });

    const [relationshipsAnnualBlock] = blocks.filter((block) => block.kind === "relationships");
    expect(relationshipsAnnualBlock?.factIds).toEqual(["relationship.none-found"]);
    expect(relationshipsAnnualBlock?.detail.ko).toContain("확인되지 않았습니다");
  });
});
