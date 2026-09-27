import { z } from "zod";

export const AI_FACT_SHEET_VERSION = "saju-year-forecast-v1";
export const AI_NARRATIVE_PROMPT_VERSION = "year-forecast-crosswalk-v1";
export const AI_NARRATIVE_SCHEMA_VERSION = "narrative-sections-v1";

export const aiFactSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/u),
  lane: z.enum(["annual", "work", "relationships", "wellbeing", "growth", "monthly"]),
  tier: z.enum(["core", "supporting"]),
  value: z.string().min(1).max(80).regex(/^[\p{L}\p{M}_: -]+$/u),
  evidenceRef: z.enum([
    "annual-pillar",
    "annual-ten-gods",
    "annual-stage",
    "ipchun-boundary",
    "monthly-pillar",
    "monthly-ten-gods",
    "monthly-stage",
    "solar-term-boundary",
    "natal-branch-relations",
    "major-luck-overlap",
    "birth-time-precision",
    "day-boundary-rule",
  ]),
}).strict();

export type AIFact = z.infer<typeof aiFactSchema>;
export const aiFactsSchema = z.array(aiFactSchema).min(4).max(80);
export type AIFacts = z.infer<typeof aiFactsSchema>;

export const narrativeSectionIds = ["annual", "work", "relationships", "wellbeing", "growth", "monthly"] as const;
export type NarrativeSectionId = (typeof narrativeSectionIds)[number];

const narrativeParagraphSchema = z.object({
  text: z.string().trim().min(24).max(400),
  citedFactIds: z.array(z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/u)).min(1).max(12),
}).strict();

export const aiNarrativeGenerationSchema = z.object({
  sections: z.array(z.object({
    id: z.enum(narrativeSectionIds),
    paragraphs: z.array(narrativeParagraphSchema).min(1).max(12),
  }).strict()).length(narrativeSectionIds.length),
}).strict();

export const narrativeOutputSchema = aiNarrativeGenerationSchema.superRefine((value, context) => {
  const seen = new Set<string>();
  for (const [index, section] of value.sections.entries()) {
    if (seen.has(section.id)) context.addIssue({ code: "custom", path: ["sections", index, "id"], message: "duplicate_section" });
    seen.add(section.id);
    if (section.id === "monthly" && section.paragraphs.length !== 12) {
      context.addIssue({ code: "custom", path: ["sections", index, "paragraphs"], message: "monthly_section_requires_twelve_comments" });
    }
    if (section.id !== "monthly" && section.paragraphs.length > 3) {
      context.addIssue({ code: "custom", path: ["sections", index, "paragraphs"], message: "section_has_too_many_paragraphs" });
    }
  }
  if (seen.size !== narrativeSectionIds.length) context.addIssue({ code: "custom", path: ["sections"], message: "missing_section" });
});

export type NarrativeOutput = z.infer<typeof narrativeOutputSchema>;
