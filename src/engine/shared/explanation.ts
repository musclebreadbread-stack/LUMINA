import type { EvidenceTier } from "./tier";
import type { Citation } from "./citation";

export interface LocalizedText {
  readonly ko: string;
  readonly en: string;
}

export interface ExplanationBlock {
  readonly id: string;
  readonly summary: LocalizedText;
  readonly detail: LocalizedText;
  readonly method: LocalizedText | null;
  readonly evidenceRefs: readonly string[];
  readonly citations: readonly Citation[];
  readonly tier: EvidenceTier;
}

export function localizeText(text: LocalizedText, locale: "ko" | "en"): string {
  return locale === "en" ? text.en : text.ko;
}

export function assertExplanationBlock(block: ExplanationBlock): void {
  if (!block.id.trim()) throw new Error("explanation block id must not be empty");
  if (!block.summary.ko.trim() || !block.summary.en.trim()) {
    throw new Error(`explanation ${block.id} has an empty summary`);
  }
  if (!block.detail.ko.trim() || !block.detail.en.trim()) {
    throw new Error(`explanation ${block.id} has an empty detail`);
  }
  if (block.evidenceRefs.length === 0) {
    throw new Error(`explanation ${block.id} must reference calculation evidence`);
  }
}

export function freezeExplanationBlock(block: ExplanationBlock): ExplanationBlock {
  assertExplanationBlock(block);
  return Object.freeze({
    ...block,
    summary: Object.freeze({ ...block.summary }),
    detail: Object.freeze({ ...block.detail }),
    method: block.method ? Object.freeze({ ...block.method }) : null,
    evidenceRefs: Object.freeze([...block.evidenceRefs]),
    citations: Object.freeze([...block.citations]),
  });
}
