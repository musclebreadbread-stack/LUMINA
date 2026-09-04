import type { AnalysisKey } from "@engine/shared/evidence";

export const INTEGRATED_PORTRAIT_SCHEMA_VERSION = 1 as const;

export type ResultLane = "scientific" | "cultural" | "situational" | "relational";

export type SnapshotBand = "low" | "mid" | "high";

/**
 * The analyses that have an approved visual companion in the integrated
 * portrait. Pilot-withheld and contextual analyses intentionally stay out of
 * this union so a missing artwork cannot silently become a portrait signal.
 */
export type PortraitArtworkKey =
  | "saju"
  | "astro"
  | "numerology"
  | "psychometrics"
  | "jungian"
  | "darktriad"
  | "attachment"
  | "eq";

export type SignalValue =
  | Readonly<{ kind: "band"; band: SnapshotBand }>
  | Readonly<{ kind: "category"; code: string }>
  | Readonly<{ kind: "observation"; code: string }>;

export interface ConstructSignalV1 {
  readonly constructId: string;
  readonly value: SignalValue;
  readonly descriptorIds: readonly string[];
  readonly limitationIds: readonly string[];
}

export interface ResultSnapshotV1 {
  readonly schemaVersion: typeof INTEGRATED_PORTRAIT_SCHEMA_VERSION;
  readonly id: string;
  readonly sourceAssessmentId: string;
  readonly analysisKey: AnalysisKey;
  readonly provenanceGroup: string;
  readonly lane: ResultLane;
  readonly instrumentVersion: string;
  readonly scoringModelVersion: string;
  readonly completedAt: string;
  readonly locale: "ko" | "en";
  readonly signals: readonly ConstructSignalV1[];
  readonly referenceIds: readonly string[];
}

export interface ResultSnapshotDraftV1 {
  readonly schemaVersion: typeof INTEGRATED_PORTRAIT_SCHEMA_VERSION;
  readonly analysisKey: AnalysisKey;
  readonly provenanceGroup: string;
  readonly lane: ResultLane;
  readonly instrumentVersion: string;
  readonly scoringModelVersion: string;
  readonly locale: "ko" | "en";
  readonly signals: readonly ConstructSignalV1[];
  readonly referenceIds: readonly string[];
}

export interface PortraitEligibility {
  readonly distinctAnalysisCount: number;
  readonly scientificProvenanceCount: number;
  readonly missingAnalysisCount: number;
  readonly missingScientificProvenanceCount: number;
  readonly isUnlocked: boolean;
}

export interface IntegrationAnalysisRegistration {
  readonly analysisKey: AnalysisKey;
  readonly lane: ResultLane;
  readonly provenanceGroup: string;
  readonly scoringModelVersion: string;
  readonly includeInPortrait: boolean;
  readonly exclusionReason: "pilot_withheld" | null;
  readonly instrumentVersion: string;
  readonly referenceIds: readonly string[];
}

export type ClaimKind = "repetition" | "complement" | "tension" | "single-source";
export type ClaimStatus = "supported" | "contextual" | "exploratory";

export interface SynthesisClaimV1 {
  readonly claimId: string;
  readonly kind: ClaimKind;
  readonly status: ClaimStatus;
  readonly sourceSignalIds: readonly string[];
  readonly counterSignalIds: readonly string[];
  readonly interpretationKey: string;
  readonly limitationIds: readonly string[];
  readonly experimentKey?: string;
}

export interface SynthesisReportV1 {
  readonly scientificClaims: readonly SynthesisClaimV1[];
  readonly culturalObservations: readonly SynthesisClaimV1[];
  readonly contextualClaims: readonly SynthesisClaimV1[];
}

export interface CharacterRecipeV1 {
  readonly schemaVersion: 1;
  readonly seed: string;
  readonly backgroundLayer: string;
  readonly frameLayer: string;
  readonly accentLayer: string;
  readonly motionVariant: string;
  /** Current latest analysis lenses represented in the artwork rail. */
  readonly artworkKeys: readonly PortraitArtworkKey[];
  /** The most recently completed lens used for the large hero artwork. */
  readonly primaryArtworkKey: PortraitArtworkKey | null;
  readonly fallback: boolean;
}
