import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { narrativeSectionIds, type AIFacts, type NarrativeSectionId } from "../types";
import { validateNarrative } from "../validation";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

function fact(id: string, lane: AIFacts[number]["lane"]): AIFacts[number] {
  return { id, lane, tier: "core", value: "sample value", evidenceRef: "annual-pillar" };
}

const FACTS: AIFacts = [
  fact("annual.pillar", "annual"),
  fact("work.stage", "work"),
  fact("rel.branch", "relationships"),
  fact("well.time", "wellbeing"),
  fact("growth.luck", "growth"),
  ...MONTHS.map((m) => fact(`month.${m}.pillar`, "monthly")),
];

const FACT_BY_SECTION: Record<Exclude<NarrativeSectionId, "monthly">, string> = {
  annual: "annual.pillar",
  work: "work.stage",
  relationships: "rel.branch",
  wellbeing: "well.time",
  growth: "growth.luck",
};

const TEXT = "This paragraph describes a calm and steady tone for the period.";

function paragraph(citedFactIds: string[], text = TEXT) {
  return { text, citedFactIds };
}

function section(id: NarrativeSectionId) {
  if (id === "monthly") {
    return { id, paragraphs: MONTHS.map((m) => paragraph([`month.${m}.pillar`])) };
  }
  return { id, paragraphs: [paragraph([FACT_BY_SECTION[id]])] };
}

function validOutput() {
  return { sections: narrativeSectionIds.map((id) => section(id)) };
}

describe("validateNarrative", () => {
  it("accepts a fully valid narrative and normalizes it", () => {
    const value = validOutput();
    value.sections[0]!.paragraphs[0] = paragraph(["annual.pillar", "annual.pillar"], `  ${TEXT}  `);
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(true);
    expect(result.coverage).toBe(1);
    expect(result.repairReasons).toEqual([]);
    const annual = result.output?.sections.find((s) => s.id === "annual");
    expect(annual?.paragraphs[0]).toEqual({ text: TEXT, citedFactIds: ["annual.pillar"] });
  });

  it("rejects schema-invalid input with sanitized repair reasons", () => {
    const result = validateNarrative({ sections: [] }, FACTS);
    expect(result).toMatchObject({ accepted: false, output: null, coverage: 0 });
    expect(result.repairReasons.length).toBeGreaterThan(0);
    expect(result.repairReasons.every((r) => r.startsWith("schema_"))).toBe(true);
  });

  it("rejects non-object input", () => {
    const result = validateNarrative(null, FACTS);
    expect(result.accepted).toBe(false);
    expect(result.repairReasons[0]).toMatch(/^schema_/u);
  });

  it("includes the issue path in the repair reason", () => {
    const value = validOutput();
    (value.sections[1]!.paragraphs[0] as { text: string }).text = "short";
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(false);
    expect(result.repairReasons.some((r) => r.startsWith("schema_too_small_sections.1.paragraphs.0.text"))).toBe(true);
  });

  it("flags paragraphs citing unknown facts", () => {
    const value = validOutput();
    value.sections[1]!.paragraphs[0] = paragraph(["nope.fact"]);
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(false);
    expect(result.output).toBeNull();
    expect(result.repairReasons).toContain("invalid_work_paragraph_1");
    expect(result.repairReasons).toContain("empty_section_work");
    expect(result.coverage).toBeLessThan(1);
  });

  it("flags paragraphs citing a fact from the wrong lane", () => {
    const value = validOutput();
    value.sections[2]!.paragraphs[0] = paragraph(["work.stage"]);
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(false);
    expect(result.repairReasons).toContain("invalid_relationships_paragraph_1");
  });

  it("requires each monthly comment to cite its own month", () => {
    const value = validOutput();
    const monthly = value.sections[5]!;
    monthly.paragraphs[0] = paragraph(["month.02.pillar"]);
    const result = validateNarrative(value, FACTS);
    expect(result.repairReasons).toContain("invalid_monthly_paragraph_1");
    // 1 of 17 paragraphs invalid => coverage still >= 0.9 but monthly has only 11 comments.
    expect(result.coverage).toBeGreaterThanOrEqual(0.9);
    expect(result.accepted).toBe(false);
    expect(result.output).toBeNull();
  });

  it.each([
    ["korean forbidden claim", "이 문단은 반드시 좋은 결과가 나온다는 뜻으로 읽힙니다 정말로."],
    ["english forbidden claim", "This paragraph says the outcome is guaranteed for everyone here."],
    ["digits", "This paragraph mentions the year 2027 explicitly in the text."],
  ])("rejects unsafe text: %s", (_label, text) => {
    const value = validOutput();
    value.sections[0]!.paragraphs[0] = paragraph(["annual.pillar"], text);
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(false);
    expect(result.repairReasons).toContain("invalid_annual_paragraph_1");
  });

  it("accepts when coverage is >= 0.9 and all sections still have paragraphs", () => {
    const value = validOutput();
    // Add extra paragraphs (max 3 per non-monthly section) so a single bad one keeps coverage high.
    for (const s of value.sections) {
      if (s.id !== "monthly") s.paragraphs.push(paragraph([FACT_BY_SECTION[s.id]]), paragraph([FACT_BY_SECTION[s.id]]));
    }
    // 15 + 12 = 27 paragraphs; one invalid => 26/27 ~ 0.963
    value.sections[0]!.paragraphs[2] = paragraph(["work.stage"]);
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(true);
    expect(result.coverage).toBeCloseTo(26 / 27);
    expect(result.repairReasons).toEqual(["invalid_annual_paragraph_3"]);
    expect(result.output?.sections.find((s) => s.id === "annual")?.paragraphs).toHaveLength(2);
  });

  it("rejects when coverage falls below 0.9", () => {
    const value = validOutput();
    for (const s of value.sections) {
      if (s.id !== "monthly") s.paragraphs[0] = paragraph(["unknown.id"]);
    }
    const result = validateNarrative(value, FACTS);
    expect(result.accepted).toBe(false);
    expect(result.coverage).toBeLessThan(0.9);
  });
});
