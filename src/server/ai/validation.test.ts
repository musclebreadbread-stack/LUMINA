import { describe, expect, it, vi } from "vitest";
import type { AIFacts, NarrativeSectionId } from "./types";

vi.mock("server-only", () => ({}));

import { narrativeSectionIds } from "./types";
import { mapUnicodeConfusable } from "./unicodeConfusables";
import { validateNarrative } from "./validation";

const safeText = "A grounded reflection can focus on patterns supported by the available evidence.";

function makeFacts(): AIFacts {
  const facts: AIFacts = narrativeSectionIds
    .filter((sectionId) => sectionId !== "monthly")
    .map((lane) => ({
      id: `${lane}.fact`,
      lane,
      tier: "core",
      value: "evidence",
      evidenceRef: "annual-pillar",
    }));

  for (let month = 1; month <= 12; month += 1) {
    facts.push({
      id: `month.${String(month).padStart(2, "0")}.fact`,
      lane: "monthly",
      tier: "core",
      value: "evidence",
      evidenceRef: "monthly-pillar",
    });
  }

  return facts;
}

function makeNarrative() {
  return {
    sections: narrativeSectionIds.map((id) => ({
      id,
      paragraphs: id === "monthly"
        ? Array.from({ length: 12 }, (_, index) => ({
          text: safeText,
          citedFactIds: [`month.${String(index + 1).padStart(2, "0")}.fact`],
        }))
        : [{ text: safeText, citedFactIds: [`${id}.fact`] }],
    })),
  };
}

function getSection(value: ReturnType<typeof makeNarrative>, id: NarrativeSectionId) {
  const section = value.sections.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Missing test section: ${id}`);
  return section;
}

describe("AI narrative safety and evidence validation", () => {
  it("maps Unicode lookalikes to ASCII and preserves empty input", () => {
    expect(mapUnicodeConfusable("\u0448")).toBe("w");
    expect(mapUnicodeConfusable("\u0667")).toBe("V");
    expect(mapUnicodeConfusable("")).toBe("");
  });

  it("returns bounded schema issue codes without returning untrusted output", () => {
    const result = validateNarrative({ sections: [] }, makeFacts());

    expect(result).toMatchObject({ accepted: false, output: null, coverage: 0 });
    expect(result.repairReasons).toEqual([
      "schema_too_small_sections",
      "schema_custom_sections",
    ]);
  });

  it("accepts a complete evidence-backed narrative and normalizes citations", () => {
    const narrative = makeNarrative();
    const annual = getSection(narrative, "annual");
    annual.paragraphs[0] = {
      text: `  ${safeText}  `,
      citedFactIds: ["annual.fact", "annual.fact"],
    };

    const result = validateNarrative(narrative, makeFacts());

    expect(result.accepted).toBe(true);
    expect(result.coverage).toBe(1);
    expect(result.repairReasons).toEqual([]);
    expect(result.output?.sections.find((section) => section.id === "annual")?.paragraphs[0]).toEqual({
      text: safeText,
      citedFactIds: ["annual.fact"],
    });
  });

  it("accepts a repairable response at or above the 90 percent paragraph threshold", () => {
    const narrative = makeNarrative();
    getSection(narrative, "work").paragraphs.push({ text: safeText, citedFactIds: ["work.fact"] });
    getSection(narrative, "annual").paragraphs.push(
      { text: "This section contains 7 unsupported numeric details.", citedFactIds: ["annual.fact"] },
      { text: "This section contains 8 unsupported numeric details.", citedFactIds: ["annual.fact"] },
    );

    const result = validateNarrative(narrative, makeFacts());

    expect(result.coverage).toBe(0.9);
    expect(result.accepted).toBe(true);
    expect(result.repairReasons).toEqual(["invalid_annual_paragraph_2", "invalid_annual_paragraph_3"]);
    expect(result.output?.sections.find((section) => section.id === "annual")?.paragraphs).toHaveLength(1);
  });

  it("rejects a response below the 90 percent paragraph threshold", () => {
    const narrative = makeNarrative();
    getSection(narrative, "work").paragraphs.push(
      { text: safeText, citedFactIds: ["work.fact"] },
      { text: "This section contains 9 unsupported numeric details.", citedFactIds: ["work.fact"] },
    );
    const annual = getSection(narrative, "annual");
    annual.paragraphs.push(
      { text: "This section contains 7 unsupported numeric details.", citedFactIds: ["annual.fact"] },
      { text: "This section contains 8 unsupported numeric details.", citedFactIds: ["annual.fact"] },
    );

    const result = validateNarrative(narrative, makeFacts());

    expect(result.coverage).toBe(18 / 21);
    expect(result.accepted).toBe(false);
    expect(result.output).toBeNull();
  });

  it.each([
    {
      name: "cross-lane citations",
      sectionId: "annual" as const,
      paragraphIndex: 0,
      text: safeText,
      citedFactIds: ["work.fact"],
      repairReason: "invalid_annual_paragraph_1",
    },
    {
      name: "unknown citations",
      sectionId: "work" as const,
      paragraphIndex: 0,
      text: safeText,
      citedFactIds: ["missing.fact"],
      repairReason: "invalid_work_paragraph_1",
    },
    {
      name: "monthly citations that point to another month",
      sectionId: "monthly" as const,
      paragraphIndex: 0,
      text: safeText,
      citedFactIds: ["month.02.fact"],
      repairReason: "invalid_monthly_paragraph_1",
    },
    {
      name: "ASCII decimal digits",
      sectionId: "wellbeing" as const,
      paragraphIndex: 0,
      text: "This section includes 7 details that are not supported.",
      citedFactIds: ["wellbeing.fact"],
      repairReason: "invalid_wellbeing_paragraph_1",
    },
    {
      name: "full-width decimal digits",
      sectionId: "growth" as const,
      paragraphIndex: 0,
      text: "이 문장에는 숫자 ７이 포함되어 근거 문장으로 사용할 수 없습니다.",
      citedFactIds: ["growth.fact"],
      repairReason: "invalid_growth_paragraph_1",
    },
    {
      name: "Arabic-Indic decimal digits",
      sectionId: "growth" as const,
      paragraphIndex: 0,
      text: "This section contains an Arabic-Indic digit \u0667 that is unsupported.",
      citedFactIds: ["growth.fact"],
      repairReason: "invalid_growth_paragraph_1",
    },
    {
      name: "full-width forbidden claims",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This ＧＵＡＲＡＮＴＥＥＤ outcome should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims with common Cyrillic homoglyphs",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome is gu\u0430ranteed and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims with Greek upsilon",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome is g\u03C5aranteed and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims with Cyrillic ghe",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome is gua\u0433anteed and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims with Greek gamma",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome will be certainl\u03B3 and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims with Cyrillic palochka",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome will be certain\u04CFy and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims with Cyrillic sha",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This scenario includes la\u0448suit language that should be rejected.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims split by an invisible format character",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome is desti\u200Bned and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
    {
      name: "forbidden claims split by an invisible combining character",
      sectionId: "relationships" as const,
      paragraphIndex: 0,
      text: "This outcome is desti\u034Fned and should be considered carefully.",
      citedFactIds: ["relationships.fact"],
      repairReason: "invalid_relationships_paragraph_1",
    },
  ])("rejects $name", ({ sectionId, paragraphIndex, text, citedFactIds, repairReason }) => {
    const narrative = makeNarrative();
    const section = getSection(narrative, sectionId);
    const paragraph = section.paragraphs[paragraphIndex];
    if (!paragraph) throw new Error(`Missing test paragraph: ${sectionId}.${paragraphIndex}`);
    section.paragraphs[paragraphIndex] = { text, citedFactIds };

    const result = validateNarrative(narrative, makeFacts());

    expect(result.accepted).toBe(false);
    expect(result.repairReasons).toContain(repairReason);
  });
});
