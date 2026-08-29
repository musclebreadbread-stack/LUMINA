import type { AnalysisKey } from "@engine/shared/evidence";
import {
  INTEGRATED_PORTRAIT_SCHEMA_VERSION,
  type ConstructSignalV1,
  type ResultSnapshotV1,
  type SignalValue,
} from "./contracts";
import { integrationRegistration, isSnapshotEligibleForPortrait } from "./registry";

export type SnapshotValidationFailureReason =
  | "not-object"
  | "unknown-field"
  | "invalid-schema"
  | "invalid-field"
  | "registry-mismatch"
  | "not-eligible";

export type SnapshotValidationResult =
  | Readonly<{ ok: true; value: ResultSnapshotV1 }>
  | Readonly<{ ok: false; reason: SnapshotValidationFailureReason }>;

const SNAPSHOT_KEYS = Object.freeze([
  "analysisKey",
  "completedAt",
  "id",
  "instrumentVersion",
  "lane",
  "locale",
  "provenanceGroup",
  "referenceIds",
  "schemaVersion",
  "scoringModelVersion",
  "signals",
  "sourceAssessmentId",
] as const);

const SIGNAL_KEYS = Object.freeze(["constructId", "descriptorIds", "limitationIds", "value"] as const);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CODE_PATTERN = /^[a-z0-9._-]+$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isAnalysisKey(value: unknown): value is AnalysisKey {
  return typeof value === "string" && integrationRegistration(value as AnalysisKey) !== null;
}

function isCodeList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && CODE_PATTERN.test(item)) &&
    new Set(value).size === value.length
  );
}

function parseSignalValue(value: unknown): SignalValue | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;

  if (value.kind === "band") {
    if (!hasExactKeys(value, ["band", "kind"])) return null;
    if (value.band !== "low" && value.band !== "mid" && value.band !== "high") return null;
    return { kind: "band", band: value.band };
  }

  if (value.kind === "category" || value.kind === "observation") {
    if (!hasExactKeys(value, ["code", "kind"])) return null;
    if (typeof value.code !== "string" || !CODE_PATTERN.test(value.code)) return null;
    return { kind: value.kind, code: value.code };
  }

  return null;
}

function parseSignal(value: unknown): ConstructSignalV1 | null {
  if (!isRecord(value) || !hasExactKeys(value, SIGNAL_KEYS)) return null;
  if (typeof value.constructId !== "string" || !CODE_PATTERN.test(value.constructId)) return null;
  if (!isCodeList(value.descriptorIds) || !isCodeList(value.limitationIds)) return null;

  const signalValue = parseSignalValue(value.value);
  if (!signalValue) return null;

  return {
    constructId: value.constructId,
    value: signalValue,
    descriptorIds: [...value.descriptorIds],
    limitationIds: [...value.limitationIds],
  };
}

function hasUnknownSignalField(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, SIGNAL_KEYS)) return isRecord(value);
  if (!isRecord(value.value) || typeof value.value.kind !== "string") return false;
  if (value.value.kind === "band") return !hasExactKeys(value.value, ["band", "kind"]);
  if (value.value.kind === "category" || value.value.kind === "observation") {
    return !hasExactKeys(value.value, ["code", "kind"]);
  }
  return false;
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isLocale(value: unknown): value is "ko" | "en" {
  return value === "ko" || value === "en";
}

export function validateSnapshot(value: unknown): SnapshotValidationResult {
  if (!isRecord(value)) return { ok: false, reason: "not-object" };
  if (!hasExactKeys(value, SNAPSHOT_KEYS)) return { ok: false, reason: "unknown-field" };
  if (Array.isArray(value.signals) && value.signals.some(hasUnknownSignalField)) {
    return { ok: false, reason: "unknown-field" };
  }
  if (value.schemaVersion !== INTEGRATED_PORTRAIT_SCHEMA_VERSION) {
    return { ok: false, reason: "invalid-schema" };
  }
  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.sourceAssessmentId !== "string" ||
    !UUID_PATTERN.test(value.sourceAssessmentId) ||
    !isAnalysisKey(value.analysisKey) ||
    typeof value.lane !== "string" ||
    !isLocale(value.locale) ||
    typeof value.instrumentVersion !== "string" ||
    typeof value.scoringModelVersion !== "string" ||
    !isCanonicalIso(value.completedAt) ||
    !Array.isArray(value.signals) ||
    value.signals.length === 0 ||
    !value.signals.every((item) => parseSignal(item) !== null) ||
    !isCodeList(value.referenceIds)
  ) {
    return { ok: false, reason: "invalid-field" };
  }

  const registration = integrationRegistration(value.analysisKey);
  if (!registration) return { ok: false, reason: "registry-mismatch" };
  if (!registration.includeInPortrait) return { ok: false, reason: "not-eligible" };
  if (
    registration.lane !== value.lane ||
    registration.provenanceGroup !== value.provenanceGroup ||
    registration.instrumentVersion !== value.instrumentVersion ||
    registration.scoringModelVersion !== value.scoringModelVersion
  ) {
    return { ok: false, reason: "registry-mismatch" };
  }

  const snapshot: ResultSnapshotV1 = {
    schemaVersion: INTEGRATED_PORTRAIT_SCHEMA_VERSION,
    id: value.id,
    sourceAssessmentId: value.sourceAssessmentId,
    analysisKey: value.analysisKey,
    provenanceGroup: value.provenanceGroup,
    lane: value.lane === "scientific" || value.lane === "cultural" || value.lane === "situational" || value.lane === "relational"
      ? value.lane
      : "relational",
    instrumentVersion: value.instrumentVersion,
    scoringModelVersion: value.scoringModelVersion,
    completedAt: value.completedAt,
    locale: value.locale,
    signals: value.signals.map((item) => parseSignal(item)!).map((item) => Object.freeze(item)),
    referenceIds: [...value.referenceIds],
  };

  if (!isSnapshotEligibleForPortrait(snapshot)) return { ok: false, reason: "registry-mismatch" };

  return { ok: true, value: Object.freeze(snapshot) };
}
