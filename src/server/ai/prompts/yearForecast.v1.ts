import "server-only";

import type { AIFacts } from "../types";
import type { Locale } from "@/i18n/locale";

const SHARED_RULES = [
  "Write a culturally scoped reflection, never a prediction or promise.",
  "Use only the supplied categorical facts. Do not add names, dates, statistics, scores, diagnoses, or other facts.",
  "Do not give medical, investment, legal, safety, or other professional advice.",
  "Keep every statement tentative and useful for self-reflection. Avoid claims about guaranteed events or outcomes.",
  "Return exactly these six section ids once each: annual, work, relationships, wellbeing, growth, monthly.",
  "Each paragraph must cite one or more supplied fact ids in citedFactIds. Do not invent or alter ids.",
  "Write one short paragraph in each non-monthly section. Write exactly twelve short paragraphs in monthly, in the order of the supplied month facts.",
  "Do not include digits or numeric quantities in paragraph text.",
].join("\n");

const LANGUAGE_RULES = Object.freeze({
  ko: "Write all paragraph text in natural Korean. Keep the section ids unchanged.",
  en: "Write all paragraph text in clear English. Keep the section ids unchanged.",
});

export interface YearForecastPromptInput {
  readonly locale: Locale;
  readonly facts: AIFacts;
  readonly repairReasons?: readonly string[];
}

export function buildYearForecastPrompt(input: YearForecastPromptInput): string {
  const repair = input.repairReasons?.length
    ? `\n\nREPAIR REQUIRED: Regenerate the complete object from the facts. Correct these structural/content issue codes: ${input.repairReasons.join(", ")}. Do not reuse unsupported claims.`
    : "";
  return [
    SHARED_RULES,
    LANGUAGE_RULES[input.locale === "ko" ? "ko" : "en"],
    "Section focus: annual is an overall synthesis; work is a work-and-resource reflection; relationships is a reflection on symbolic relation categories; wellbeing discusses pace and routines without health claims; growth offers a learning reflection; monthly gives one short comment per month fact.",
    "The fact values are traditional labels, not empirical measures. Explain them gently and avoid treating symbolic relationships as causal evidence.",
    `FACTS_JSON=${JSON.stringify(input.facts)}`,
    repair,
  ].filter(Boolean).join("\n\n");
}
