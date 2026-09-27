import type { AIFacts } from "@/lib/aiNarrativeSchema";
import type { Locale } from "@/i18n/locale";

export {
  AI_FACT_SHEET_VERSION,
  AI_NARRATIVE_PROMPT_VERSION,
  AI_NARRATIVE_SCHEMA_VERSION,
  aiNarrativeGenerationSchema,
  aiFactSchema,
  aiFactsSchema,
  narrativeOutputSchema,
  narrativeSectionIds,
} from "@/lib/aiNarrativeSchema";
export type { AIFact, AIFacts, NarrativeOutput, NarrativeSectionId } from "@/lib/aiNarrativeSchema";

export interface NarrativeJob {
  readonly id: string;
  readonly userId: string;
  readonly userRefHmac: Buffer;
  readonly cacheKey: Buffer;
  readonly factSheetVersion: string;
  readonly locale: Locale;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly tier: "report" | "qa" | "repair";
  readonly facts: AIFacts;
  readonly attemptCount: number;
}

export type NarrativeStatus = "queued" | "processing" | "succeeded" | "fallback";
