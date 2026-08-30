export const COGNITIVE_EXPORT_COLUMNS = Object.freeze([
  "run_id",
  "item_version_id",
  "ordinal",
  "submitted_option_id",
  "scored_correct",
  "submitted_at",
  "consent_version",
  "age_band",
  "education_band",
  "region_class",
  "device_eligibility",
  "recontact_token",
  "item_bank_version",
  "algorithm_version",
  "split",
] as const);

export const REQUIRED_COGNITIVE_EXPORT_COLUMNS = Object.freeze([
  "run_id",
  "item_version_id",
  "ordinal",
  "submitted_option_id",
  "scored_correct",
  "submitted_at",
  "consent_version",
  "device_eligibility",
  "item_bank_version",
  "algorithm_version",
  "split",
] as const);

export const FORBIDDEN_COGNITIVE_EXPORT_COLUMNS = Object.freeze([
  "name",
  "email",
  "ip_address",
  "user_agent",
  "url",
  "service_role_key",
  "database_url",
  "access_token",
  "auth_token",
] as const);

export const COGNITIVE_EXPORT_SPLITS = Object.freeze(["development", "holdout", "retest"] as const);

type RequiredColumn = (typeof REQUIRED_COGNITIVE_EXPORT_COLUMNS)[number];
export type CognitiveExportSplit = (typeof COGNITIVE_EXPORT_SPLITS)[number];

export interface CognitiveExportRow {
  readonly [column: string]: string | undefined;
}

export interface CognitiveExportValidationConfig {
  readonly dictionaryColumns: readonly string[];
  readonly approvedConsentVersions?: readonly string[];
  readonly expectedItemBankVersion?: string;
  readonly expectedAlgorithmVersion?: string;
  /**
   * Optional catalog projection from the restricted item bank. Only pilot and
   * active ids should be passed here; retired/practice ids are rejected.
   */
  readonly allowedItemVersionIds?: ReadonlySet<string>;
}

export interface CognitiveExportValidationSummary {
  readonly status: "valid";
  readonly rowCount: number;
  readonly runCount: number;
  readonly uniqueItemCount: number;
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
  readonly splits: readonly CognitiveExportSplit[];
  readonly runsBySplit: Readonly<Record<CognitiveExportSplit, number>>;
}

export class CognitiveExportValidationError extends Error {
  readonly reasons: readonly string[];

  constructor(reasons: readonly string[]) {
    super(`cognitive export validation failed: ${reasons.join("; ")}`);
    this.name = "CognitiveExportValidationError";
    this.reasons = Object.freeze([...reasons]);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
const AGE_BANDS = new Set(["18-24", "25-34", "35-44", "45-54", "55-64", "unreported"]);

const DEFAULT_CONFIG: CognitiveExportValidationConfig = Object.freeze({
  dictionaryColumns: COGNITIVE_EXPORT_COLUMNS,
  approvedConsentVersions: ["cognitive-pilot-consent-v1"],
  expectedItemBankVersion: "cognitive-pilot-v1",
  expectedAlgorithmVersion: "cat-v1",
});

interface RunRow {
  readonly ordinal: number;
  readonly itemVersionId: string;
  readonly submittedAt: number;
}

interface RunState {
  readonly split: CognitiveExportSplit;
  readonly rows: RunRow[];
}

function isRequiredColumn(column: string): column is RequiredColumn {
  return (REQUIRED_COGNITIVE_EXPORT_COLUMNS as readonly string[]).includes(column);
}

function valueOf(row: CognitiveExportRow, column: string): string {
  return row[column]?.trim() ?? "";
}

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function validateRowShape(
  row: CognitiveExportRow,
  rowNumber: number,
  approvedConsentVersions: ReadonlySet<string>,
  allowedItemVersionIds: ReadonlySet<string> | undefined,
  reasons: string[],
): void {
  const runId = valueOf(row, "run_id");
  const itemVersionId = valueOf(row, "item_version_id");
  const ordinal = valueOf(row, "ordinal");
  const optionId = valueOf(row, "submitted_option_id");
  const scoredCorrect = valueOf(row, "scored_correct");
  const submittedAt = valueOf(row, "submitted_at");
  const consentVersion = valueOf(row, "consent_version");
  const deviceEligibility = valueOf(row, "device_eligibility");
  const split = valueOf(row, "split");

  if (!UUID_PATTERN.test(runId)) addReason(reasons, `row ${rowNumber}: invalid run id`);
  if (!IDENTIFIER_PATTERN.test(itemVersionId) || itemVersionId.startsWith("practice:")) {
    addReason(reasons, `row ${rowNumber}: invalid or practice item version`);
  }
  if (allowedItemVersionIds !== undefined && !allowedItemVersionIds.has(itemVersionId)) {
    addReason(reasons, `row ${rowNumber}: item version is not in the approved catalog`);
  }
  if (!/^\d+$/.test(ordinal) || Number(ordinal) < 1 || !Number.isSafeInteger(Number(ordinal))) {
    addReason(reasons, `row ${rowNumber}: invalid ordinal`);
  }
  if (!IDENTIFIER_PATTERN.test(optionId)) addReason(reasons, `row ${rowNumber}: invalid submitted option`);
  if (scoredCorrect !== "0" && scoredCorrect !== "1") addReason(reasons, `row ${rowNumber}: invalid correctness flag`);
  const parsedSubmittedAt = Date.parse(submittedAt);
  if (submittedAt === "" || !Number.isFinite(parsedSubmittedAt)) addReason(reasons, `row ${rowNumber}: invalid submitted timestamp`);
  if (!approvedConsentVersions.has(consentVersion)) addReason(reasons, `row ${rowNumber}: unapproved consent version`);
  if (deviceEligibility !== "eligible") addReason(reasons, `row ${rowNumber}: ineligible device row`);
  if (!(COGNITIVE_EXPORT_SPLITS as readonly string[]).includes(split)) addReason(reasons, `row ${rowNumber}: invalid split`);

  const ageBand = valueOf(row, "age_band");
  if (ageBand !== "" && !AGE_BANDS.has(ageBand)) addReason(reasons, `row ${rowNumber}: invalid age band`);

  for (const optionalColumn of ["education_band", "region_class", "recontact_token"] as const) {
    const optionalValue = valueOf(row, optionalColumn);
    if (optionalValue !== "" && optionalValue.length > 128) {
      addReason(reasons, `row ${rowNumber}: ${optionalColumn} is too long`);
    }
  }
}

function validateRunOrdering(runs: ReadonlyMap<string, RunState>, reasons: string[]): void {
  for (const [runId, state] of runs) {
    const ordered = [...state.rows].sort((left, right) => left.ordinal - right.ordinal);
    ordered.forEach((row, index) => {
      const expectedOrdinal = index + 1;
      if (row.ordinal !== expectedOrdinal) {
        addReason(reasons, `run ${runId}: ordinals must start at one and be contiguous`);
      }
      const previous = ordered[index - 1];
      if (previous !== undefined && row.submittedAt < previous.submittedAt) {
        addReason(reasons, `run ${runId}: submitted timestamps are out of order`);
      }
    });

    const itemIds = ordered.map((row) => row.itemVersionId);
    if (new Set(itemIds).size !== itemIds.length) addReason(reasons, `run ${runId}: item version is answered more than once`);
  }
}

function readVersions(rows: readonly CognitiveExportRow[], column: string): readonly string[] {
  return [...new Set(rows.map((row) => valueOf(row, column)))].filter((value) => value !== "");
}

/**
 * Validate a restricted cognitive research export without returning any raw
 * participant value. Error messages contain only row numbers and rule names.
 */
export function validateCognitiveExport(
  columns: readonly string[],
  rows: readonly CognitiveExportRow[],
  config: CognitiveExportValidationConfig = DEFAULT_CONFIG,
): CognitiveExportValidationSummary {
  const reasons: string[] = [];
  const dictionary = new Set(config.dictionaryColumns);
  const columnSet = new Set(columns);

  if (columns.length === 0) addReason(reasons, "export has no columns");
  if (columnSet.size !== columns.length) addReason(reasons, "export contains duplicate columns");

  const missing = REQUIRED_COGNITIVE_EXPORT_COLUMNS.filter((column) => !columnSet.has(column));
  if (missing.length > 0) addReason(reasons, `missing required columns: ${missing.join(", ")}`);

  const forbidden = columns.filter((column) => (FORBIDDEN_COGNITIVE_EXPORT_COLUMNS as readonly string[]).includes(column));
  if (forbidden.length > 0) addReason(reasons, `forbidden columns: ${forbidden.join(", ")}`);

  const unknown = columns.filter((column) => !dictionary.has(column));
  if (unknown.length > 0) addReason(reasons, `columns are not in the data dictionary: ${unknown.join(", ")}`);

  if (rows.length === 0) addReason(reasons, "export contains no rows");

  const approvedConsentVersions = new Set(config.approvedConsentVersions ?? DEFAULT_CONFIG.approvedConsentVersions);
  const runs = new Map<string, RunState>();
  const assignmentKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    for (const requiredColumn of REQUIRED_COGNITIVE_EXPORT_COLUMNS) {
      if (!(requiredColumn in row)) addReason(reasons, `row ${rowNumber}: missing ${requiredColumn}`);
    }
    validateRowShape(row, rowNumber, approvedConsentVersions, config.allowedItemVersionIds, reasons);

    const runId = valueOf(row, "run_id");
    const itemVersionId = valueOf(row, "item_version_id");
    const ordinal = Number(valueOf(row, "ordinal"));
    const submittedAt = Date.parse(valueOf(row, "submitted_at"));
    const splitValue = valueOf(row, "split");
    const assignmentKey = `${runId}|${itemVersionId}|${ordinal}`;
    if (assignmentKeys.has(assignmentKey)) addReason(reasons, "duplicate answered assignment");
    assignmentKeys.add(assignmentKey);

    if ((COGNITIVE_EXPORT_SPLITS as readonly string[]).includes(splitValue)) {
      const split = splitValue as CognitiveExportSplit;
      const existing = runs.get(runId);
      if (existing === undefined) runs.set(runId, { split, rows: [{ ordinal, itemVersionId, submittedAt }] });
      else if (existing.split !== split) addReason(reasons, `run ${runId}: split must be assigned at participant level`);
      else existing.rows.push({ ordinal, itemVersionId, submittedAt });
    }
  });

  const itemBankVersions = readVersions(rows, "item_bank_version");
  const algorithmVersions = readVersions(rows, "algorithm_version");
  if (itemBankVersions.length !== 1) addReason(reasons, "mixed or missing item-bank version");
  if (algorithmVersions.length !== 1) addReason(reasons, "mixed or missing algorithm version");
  if (config.expectedItemBankVersion !== undefined && itemBankVersions[0] !== config.expectedItemBankVersion) {
    addReason(reasons, "item-bank version does not match the preregistered version");
  }
  if (config.expectedAlgorithmVersion !== undefined && algorithmVersions[0] !== config.expectedAlgorithmVersion) {
    addReason(reasons, "algorithm version does not match the preregistered version");
  }

  validateRunOrdering(runs, reasons);
  const splitRuns = new Set([...runs.values()].map((state) => state.split));
  if (!splitRuns.has("development")) addReason(reasons, "development split is required");
  if (!splitRuns.has("holdout")) addReason(reasons, "holdout split is required");

  if (reasons.length > 0) throw new CognitiveExportValidationError(reasons);

  const runsBySplit: Record<CognitiveExportSplit, number> = { development: 0, holdout: 0, retest: 0 };
  for (const state of runs.values()) runsBySplit[state.split] += 1;
  return Object.freeze({
    status: "valid",
    rowCount: rows.length,
    runCount: runs.size,
    uniqueItemCount: new Set(rows.map((row) => valueOf(row, "item_version_id"))).size,
    itemBankVersion: itemBankVersions[0]!,
    algorithmVersion: algorithmVersions[0]!,
    splits: Object.freeze([...splitRuns].sort() as CognitiveExportSplit[]),
    runsBySplit: Object.freeze(runsBySplit),
  });
}

export function isRequiredCognitiveExportColumn(column: string): boolean {
  return isRequiredColumn(column);
}
