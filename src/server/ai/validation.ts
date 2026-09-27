import "server-only";

import { narrativeSectionIds, narrativeOutputSchema, type AIFacts, type NarrativeOutput, type NarrativeSectionId } from "./types";

const FORBIDDEN_CLAIMS = [
  /운명|예언|반드시|확실히|틀림없이|무조건|정해져 있|일어날 것|성공할 것|부자가 될|당첨|사망|불임|임신|질병|병에 걸|진단|치료|약을 복용|투자|수익률|법률 조언|소송|이혼|단명/iu,
  /\b(?:destined|guaranteed|certainly|definitely|will happen|will be wealthy|win the lottery|diagnos(?:e|is)|treat(?:ment)?|medical advice|investment advice|legal advice|lawsuit|divorce|death|infertility|pregnan(?:t|cy)|rate of return)\b/iu,
];

const ALLOWED_LANES: Readonly<Record<NarrativeSectionId, ReadonlySet<AIFacts[number]["lane"]>>> = Object.freeze({
  annual: new Set<AIFacts[number]["lane"]>(["annual"]),
  work: new Set<AIFacts[number]["lane"]>(["work"]),
  relationships: new Set<AIFacts[number]["lane"]>(["relationships"]),
  wellbeing: new Set<AIFacts[number]["lane"]>(["wellbeing"]),
  growth: new Set<AIFacts[number]["lane"]>(["growth"]),
  monthly: new Set<AIFacts[number]["lane"]>(["monthly"]),
});

export interface NarrativeValidationResult {
  readonly accepted: boolean;
  readonly output: NarrativeOutput | null;
  readonly coverage: number;
  readonly repairReasons: readonly string[];
}

export function validateNarrative(value: unknown, facts: AIFacts): NarrativeValidationResult {
  const parsed = narrativeOutputSchema.safeParse(value);
  if (!parsed.success) {
    const repairReasons = parsed.error.issues.slice(0, 20).map((issue) => {
      const path = issue.path.map((part) => String(part).replace(/[^a-z0-9_-]/giu, "")).join(".").slice(0, 80);
      return `schema_${issue.code}${path ? `_${path}` : ""}`;
    });
    return { accepted: false, output: null, coverage: 0, repairReasons };
  }

  const sourceById = new Map(facts.map((fact) => [fact.id, fact]));
  const normalizedSections: NarrativeOutput["sections"][number][] = [];
  type NarrativeSection = NarrativeOutput["sections"][number];
  type NarrativeParagraph = NarrativeSection["paragraphs"][number];
  let totalParagraphs = 0;
  let validParagraphs = 0;
  const repairReasons: string[] = [];

  for (const sectionId of narrativeSectionIds) {
    const section: NarrativeSection | undefined = parsed.data.sections.find((candidate) => candidate.id === sectionId);
    if (!section) {
      repairReasons.push(`missing_section_${sectionId}`);
      continue;
    }
    const paragraphs: NarrativeParagraph[] = [];
    for (const [index, paragraph] of section.paragraphs.entries()) {
      totalParagraphs += 1;
      const citedFacts = paragraph.citedFactIds.map((id) => sourceById.get(id));
      const citationIsValid = citedFacts.length > 0
        && citedFacts.every((fact) => fact !== undefined && ALLOWED_LANES[sectionId].has(fact.lane));
      const monthlyFactIsRelevant = sectionId !== "monthly"
        || paragraph.citedFactIds.some((id) => id.startsWith(`month.${String(index + 1).padStart(2, "0")}.`));
      const textIsSafe = !/\d/u.test(paragraph.text)
        && !FORBIDDEN_CLAIMS.some((pattern) => pattern.test(paragraph.text));
      if (!citationIsValid || !monthlyFactIsRelevant || !textIsSafe) {
        repairReasons.push(`invalid_${sectionId}_paragraph_${index + 1}`);
        continue;
      }
      validParagraphs += 1;
      paragraphs.push({
        text: paragraph.text.trim(),
        citedFactIds: [...new Set(paragraph.citedFactIds)],
      });
    }
    if (paragraphs.length === 0) repairReasons.push(`empty_section_${sectionId}`);
    normalizedSections.push({ id: sectionId, paragraphs });
  }

  const coverage = totalParagraphs > 0 ? validParagraphs / totalParagraphs : 0;
  const completeSections = normalizedSections.length === narrativeSectionIds.length
    && normalizedSections.every((section) => section.paragraphs.length > 0);
  const monthly = normalizedSections.find((section) => section.id === "monthly");
  const allMonthlyCommentsValid = monthly?.paragraphs.length === 12;
  const accepted = coverage >= 0.9 && completeSections && allMonthlyCommentsValid;
  const output = accepted ? narrativeOutputSchema.parse({ sections: normalizedSections }) : null;
  return { accepted, output, coverage, repairReasons: [...new Set(repairReasons)].slice(0, 40) };
}
