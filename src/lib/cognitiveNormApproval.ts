// Node's native strip-types runner (scripts/neon-approve-cognitive-norm.ts) cannot resolve the
// @engine/* path alias, so this module uses a relative import with an explicit extension.
// @ts-expect-error TS5097 is intentional for the Node strip-types entrypoint.
import { validateNormTable, type AgeNormRow, type NormTable } from "../engine/cognitive-standardized/norming.ts";

export interface ReleaseManifest {
  readonly status: string;
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
  readonly evidenceHashes: readonly string[];
}

export interface ReviewRecord {
  readonly reviewer: string;
  readonly date: string;
  readonly statement: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** The manifest produced by research/cognitive/v1/R/00-run-release-pipeline.R. */
export function parseReleaseManifest(value: unknown): ReleaseManifest {
  if (!isRecord(value)) throw new Error("release manifest must be an object");
  const { status, item_bank_version: itemBankVersion, algorithm_version: algorithmVersion, evidence_hashes: evidenceHashes } = value;
  if (typeof status !== "string") throw new Error("release manifest status must be a string");
  if (!nonEmptyString(itemBankVersion) || !nonEmptyString(algorithmVersion)) {
    throw new Error("release manifest item_bank_version/algorithm_version must be non-empty strings");
  }
  if (!Array.isArray(evidenceHashes) || !evidenceHashes.every((hash) => typeof hash === "string")) {
    throw new Error("release manifest evidence_hashes must be an array of strings");
  }
  if (status !== "candidate") {
    throw new Error(`release manifest status is "${status}", not "candidate" — refusing to approve`);
  }
  return { status, itemBankVersion, algorithmVersion, evidenceHashes };
}

function parseAgeRow(value: unknown, index: number): AgeNormRow {
  if (!isRecord(value)) throw new Error(`norm payload byAge[${index}] must be an object`);
  const { minimumAge, maximumAge, thetaToIq, iqToPercentile } = value;
  if (typeof minimumAge !== "number" || typeof maximumAge !== "number") {
    throw new Error(`norm payload byAge[${index}] minimumAge/maximumAge must be numbers`);
  }
  if (!Array.isArray(thetaToIq) || !thetaToIq.every((entry) => typeof entry === "number")) {
    throw new Error(`norm payload byAge[${index}] thetaToIq must be a number array`);
  }
  if (!Array.isArray(iqToPercentile) || !iqToPercentile.every((entry) => typeof entry === "number")) {
    throw new Error(`norm payload byAge[${index}] iqToPercentile must be a number array`);
  }
  return { minimumAge, maximumAge, thetaToIq, iqToPercentile };
}

/**
 * Parses an operator-supplied norm payload into the exact shape the live scoring
 * engine (thetaToStandardizedScore) will consume, then runs it through the engine's
 * own structural/statistical rule (validateNormTable) — the same rule production
 * scoring applies, not a re-implementation of it.
 */
export function parseNormTablePayload(value: unknown, manifest: ReleaseManifest): NormTable {
  if (!isRecord(value)) throw new Error("norm payload must be an object");
  const { itemBankVersion, algorithmVersion, iqPointsPerTheta, byAge, thetaGrid } = value;
  if (!nonEmptyString(itemBankVersion) || !nonEmptyString(algorithmVersion)) {
    throw new Error("norm payload itemBankVersion/algorithmVersion must be non-empty strings");
  }
  if (itemBankVersion !== manifest.itemBankVersion || algorithmVersion !== manifest.algorithmVersion) {
    throw new Error("norm payload version does not match the release manifest — refusing to approve a mismatched pair");
  }
  if (typeof iqPointsPerTheta !== "number") throw new Error("norm payload iqPointsPerTheta must be a number");
  if (!Array.isArray(byAge)) throw new Error("norm payload byAge must be an array");
  const rows = byAge.map((row, index) => parseAgeRow(row, index));
  let gridValue: readonly number[] | undefined;
  if (thetaGrid !== undefined) {
    if (!Array.isArray(thetaGrid) || !thetaGrid.every((entry) => typeof entry === "number")) {
      throw new Error("norm payload thetaGrid must be a number array");
    }
    gridValue = thetaGrid;
  }
  const table: NormTable = {
    itemBankVersion,
    algorithmVersion,
    iqPointsPerTheta,
    byAge: rows,
    ...(gridValue === undefined ? {} : { thetaGrid: gridValue }),
  };
  validateNormTable(table);
  return table;
}

/** Human attestation required before any approval write; never auto-generated. */
export function parseReviewRecord(value: unknown): ReviewRecord {
  if (!isRecord(value)) throw new Error("review record must be an object");
  const { reviewer, date, statement } = value;
  if (!nonEmptyString(reviewer)) throw new Error("review record reviewer is required");
  if (!nonEmptyString(date)) throw new Error("review record date is required");
  if (!nonEmptyString(statement)) throw new Error("review record statement is required");
  return { reviewer, date, statement };
}
