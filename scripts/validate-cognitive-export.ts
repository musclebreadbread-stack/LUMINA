import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Node's native strip-types runner requires the explicit `.ts` extension here;
// the script is not bundled into the client.
// @ts-expect-error TS5097 is intentional for the Node strip-types entrypoint.
import { CognitiveExportValidationError, validateCognitiveExport, type CognitiveExportRow } from "../src/lib/cognitiveResearch/exportValidation.ts";

interface CsvDocument {
  readonly columns: readonly string[];
  readonly rows: readonly CognitiveExportRow[];
}

interface ExportValidationManifest {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly validationStatus: "valid" | "blocked";
  readonly contentSha256: string;
  readonly rowCount: number;
  readonly runCount: number;
  readonly uniqueItemCount: number;
  readonly itemBankVersion: string | null;
  readonly algorithmVersion: string | null;
  readonly splits: readonly string[];
  readonly reasons: readonly string[];
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function parseCsv(text: string): CsvDocument {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(cell);
      cell = "";
    } else if (character === "\n") {
      record.push(cell.endsWith("\r") ? cell.slice(0, -1) : cell);
      records.push(record);
      record = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (cell.length > 0 || record.length > 0) {
    record.push(cell.endsWith("\r") ? cell.slice(0, -1) : cell);
    records.push(record);
  }

  const first = records[0];
  if (first === undefined || first.every((value) => value.trim() === "")) throw new Error("CSV has no header");
  const columns = Object.freeze(first.map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim()));
  if (columns.some((column) => column === "")) throw new Error("CSV header contains an empty column");

  const rows = records.slice(1).flatMap((values, index): CognitiveExportRow[] => {
    if (values.every((value) => value.trim() === "")) return [];
    if (values.length !== columns.length) throw new Error(`CSV row ${index + 2} has a different column count`);
    const row: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      row[column] = values[columnIndex] ?? "";
    });
    return [row];
  });
  return { columns, rows: Object.freeze(rows) };
}

function readCsv(path: string): CsvDocument {
  return parseCsv(readFileSync(resolve(path), "utf8"));
}

function readDictionaryColumns(path: string): readonly string[] {
  const dictionary = readCsv(path);
  if (!dictionary.columns.includes("column_name")) throw new Error("data dictionary is missing column_name");
  return Object.freeze(dictionary.rows.map((row) => row.column_name?.trim() ?? "").filter((column) => column !== ""));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAllowedItemVersionIds(path: string, expectedItemBankVersion: string): ReadonlySet<string> {
  const parsed: unknown = JSON.parse(readFileSync(resolve(path), "utf8"));
  if (!Array.isArray(parsed)) throw new Error("item catalog must be an array");
  const allowed = parsed.flatMap((entry): string[] => {
    if (!isRecord(entry) || typeof entry.version_id !== "string" || typeof entry.status !== "string") return [];
    if (entry.status !== "pilot" && entry.status !== "active") return [];
    if (entry.item_bank_version !== undefined && entry.item_bank_version !== expectedItemBankVersion) return [];
    return [entry.version_id];
  });
  if (allowed.length === 0) throw new Error("item catalog has no pilot or active item versions");
  return new Set(allowed);
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function canonicalCsv(document: CsvDocument): string {
  const header = document.columns.map(csvEscape).join(",");
  const body = document.rows.map((row) => document.columns.map((column) => csvEscape(row[column] ?? "")).join(","));
  return `${[header, ...body].join("\n")}\n`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function manifestPath(inputPath: string): string {
  const explicit = argument("--manifest");
  if (explicit !== undefined) return resolve(explicit);
  return resolve(`${inputPath}.manifest.json`);
}

function writeManifest(path: string, manifest: ExportValidationManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function main(): void {
  const inputPath = argument("--input");
  if (inputPath === undefined) {
    throw new Error("Usage: node --experimental-strip-types scripts/validate-cognitive-export.ts --input <restricted-export.csv> [--manifest <manifest.json>] [--item-catalog <catalog.json>]");
  }

  const dictionaryPath = argument("--dictionary") ?? "research/cognitive/v1/data-dictionary.csv";
  const expectedItemBankVersion = argument("--item-bank-version") ?? "cognitive-pilot-v1";
  const expectedAlgorithmVersion = argument("--algorithm-version") ?? "cat-v1";
  const document = readCsv(inputPath);
  const digest = sha256(canonicalCsv(document));
  const allowedItemVersionIds = argument("--item-catalog");
  const base = {
    schemaVersion: 1 as const,
    generatedAt: new Date().toISOString(),
    contentSha256: digest,
    rowCount: document.rows.length,
  };
  const outputPath = manifestPath(inputPath);

  try {
    const summary = validateCognitiveExport(document.columns, document.rows, {
      dictionaryColumns: readDictionaryColumns(dictionaryPath),
      expectedItemBankVersion,
      expectedAlgorithmVersion,
      ...(allowedItemVersionIds === undefined ? {} : { allowedItemVersionIds: readAllowedItemVersionIds(allowedItemVersionIds, expectedItemBankVersion) }),
    });
    writeManifest(outputPath, {
      ...base,
      validationStatus: "valid",
      runCount: summary.runCount,
      uniqueItemCount: summary.uniqueItemCount,
      itemBankVersion: summary.itemBankVersion,
      algorithmVersion: summary.algorithmVersion,
      splits: summary.splits,
      reasons: [],
    });
    process.stdout.write("Cognitive export validation: valid (manifest written).\n");
  } catch (error) {
    const reasons = error instanceof CognitiveExportValidationError ? error.reasons : ["validator could not complete"];
    writeManifest(outputPath, {
      ...base,
      validationStatus: "blocked",
      runCount: 0,
      uniqueItemCount: 0,
      itemBankVersion: null,
      algorithmVersion: null,
      splits: [],
      reasons,
    });
    process.stderr.write("Cognitive export validation: blocked (manifest written).\n");
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "cognitive export validation failed"}\n`);
  process.exitCode = 1;
}
