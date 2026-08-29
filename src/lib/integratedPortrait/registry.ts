import type { AnalysisKey } from "@engine/shared/evidence";
import { analysisDefinition } from "@/lib/analysisCatalog";
import type { IntegrationAnalysisRegistration, ResultLane, ResultSnapshotV1 } from "./contracts";

interface RegistrationInput {
  readonly lane: ResultLane;
  readonly provenanceGroup: string;
  readonly scoringModelVersion: string;
  readonly includeInPortrait: boolean;
  readonly exclusionReason: "pilot_withheld" | null;
}

function register(
  analysisKey: AnalysisKey,
  input: RegistrationInput,
): IntegrationAnalysisRegistration {
  const definition = analysisDefinition(analysisKey);

  return Object.freeze({
    analysisKey,
    ...input,
    instrumentVersion: definition.evidence.instrumentVersion,
    referenceIds: Object.freeze([...definition.evidence.referenceIds]),
  });
}

export const INTEGRATED_PORTRAIT_REGISTRY = Object.freeze([
  register("psychometrics", {
    lane: "scientific",
    provenanceGroup: "ipip-50-v1",
    scoringModelVersion: "big-five-derived-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("jungian", {
    lane: "scientific",
    provenanceGroup: "ipip-50-v1",
    scoringModelVersion: "jungian-derived-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("darktriad", {
    lane: "scientific",
    provenanceGroup: "sd3-27-v1",
    scoringModelVersion: "dark-triad-derived-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("attachment", {
    lane: "scientific",
    provenanceGroup: "attachment-ecrr-exploratory-v1",
    scoringModelVersion: "attachment-derived-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("eq", {
    lane: "scientific",
    provenanceGroup: "eq-self-report-v1",
    scoringModelVersion: "eq-derived-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("saju", {
    lane: "cultural",
    provenanceGroup: "saju-symbolic-v1",
    scoringModelVersion: "saju-symbolic-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("astro", {
    lane: "cultural",
    provenanceGroup: "astro-symbolic-v1",
    scoringModelVersion: "astro-symbolic-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("numerology", {
    lane: "cultural",
    provenanceGroup: "numerology-symbolic-v1",
    scoringModelVersion: "numerology-symbolic-v1",
    includeInPortrait: true,
    exclusionReason: null,
  }),
  register("cognitive", {
    lane: "scientific",
    provenanceGroup: "cognitive-standardized-v1",
    scoringModelVersion: "cognitive-standardized-v1",
    includeInPortrait: false,
    exclusionReason: "pilot_withheld",
  }),
] as const satisfies readonly IntegrationAnalysisRegistration[]);

const registryByAnalysisKey = new Map<AnalysisKey, IntegrationAnalysisRegistration>(
  INTEGRATED_PORTRAIT_REGISTRY.map((entry) => [entry.analysisKey, entry]),
);

export function integrationRegistration(
  analysisKey: AnalysisKey,
): IntegrationAnalysisRegistration | null {
  return registryByAnalysisKey.get(analysisKey) ?? null;
}

export function isSnapshotEligibleForPortrait(snapshot: ResultSnapshotV1): boolean {
  const registration = integrationRegistration(snapshot.analysisKey);

  return (
    registration !== null &&
    registration.includeInPortrait &&
    registration.lane === snapshot.lane &&
    registration.provenanceGroup === snapshot.provenanceGroup
  );
}
