import "server-only";

import type {
  CognitiveStimulus,
  ItemPresentation,
  PresentationOption,
  RunSnapshot,
  StandardizedDomain,
} from "@engine/cognitive-standardized/types";
import { createNeonSql, neonErrorMessage, neonRows } from "@/lib/neon/server";

import { requireCognitiveSubject } from "./auth";

export interface PrivateAssignment {
  readonly assignmentId: string;
  readonly ordinal: number;
  readonly domain: StandardizedDomain;
  readonly stimulus: CognitiveStimulus;
  readonly options: readonly PresentationOption[];
  readonly correctOptionId: string;
  readonly parameters: Readonly<{ discrimination: number; difficulty: number; guessing: number }>;
  readonly serverSeed: string;
}

/** Private row에서 public presentation DTO만 복사한다. */
export function toItemPresentation(assignment: PrivateAssignment): ItemPresentation {
  return Object.freeze({
    assignmentId: assignment.assignmentId,
    ordinal: assignment.ordinal,
    domain: assignment.domain,
    stimulus: assignment.stimulus,
    options: Object.freeze(
      assignment.options.map((option) =>
        Object.freeze({
          id: option.id,
          labelKo: option.labelKo,
          labelEn: option.labelEn,
          figure: option.figure,
        }),
      ),
    ),
  });
}

export interface OwnedRun {
  readonly id: string;
  readonly status: RunSnapshot["status"];
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
  readonly blueprintVersion: string;
  readonly targetItemCount: number;
  readonly answeredCount: number;
}

function isRunStatus(value: string): value is OwnedRun["status"] {
  return value === "active" || value === "paused" || value === "completed" || value === "invalid";
}

function toOwnedRun(row: Readonly<Record<string, unknown>>): OwnedRun {
  const status = row.status;
  if (
    typeof row.id !== "string" ||
    typeof status !== "string" ||
    !isRunStatus(status) ||
    typeof row.item_bank_version !== "string" ||
    typeof row.algorithm_version !== "string" ||
    typeof row.blueprint_version !== "string" ||
    typeof row.target_item_count !== "number" ||
    typeof row.answered_count !== "number"
  ) {
    throw new Error("invalid cognitive run row");
  }
  return {
    id: row.id,
    status,
    itemBankVersion: row.item_bank_version,
    algorithmVersion: row.algorithm_version,
    blueprintVersion: row.blueprint_version,
    targetItemCount: row.target_item_count,
    answeredCount: row.answered_count,
  };
}

export async function getOwnedRun(runId: string): Promise<OwnedRun | null> {
  const subject = await requireCognitiveSubject();
  const sql = createNeonSql();
  try {
    const results = await sql.transaction([
      sql`select set_config('app.current_subject_id', ${subject.id}, true)`,
      sql`
        select id, status, item_bank_version, algorithm_version, blueprint_version,
               target_item_count, answered_count
          from public.assessment_runs
         where id = ${runId}::uuid
           and owner_id = ${subject.id}::uuid
         limit 1
      `,
    ]);
    const row = neonRows(results[1])[0];
    return row === undefined ? null : toOwnedRun(row);
  } catch (error) {
    throw new Error(`failed to load cognitive run: ${neonErrorMessage(error)}`);
  }
}

/** 소유권 확인 후에만 assignment의 public presentation을 반환한다. */
export async function getPresentationForOwner(
  runId: string,
  assignmentId: string,
): Promise<ItemPresentation | null> {
  const ownedRun = await getOwnedRun(runId);
  if (ownedRun === null) return null;

  const subject = await requireCognitiveSubject();
  const sql = createNeonSql();
  try {
    const results = await sql.transaction([
      sql`select set_config('app.current_subject_id', ${subject.id}, true)`,
      sql`
        select ra.assignment_id, ra.ordinal, iv.domain, iv.presentation
          from private_cognitive.run_assignments as ra
          join private_cognitive.item_versions as iv
            on iv.version_id = ra.item_version_id
         where ra.run_id = ${ownedRun.id}::uuid
           and ra.assignment_id = ${assignmentId}::uuid
           and iv.status in ('pilot', 'active')
         limit 1
      `,
    ]);
    const row = neonRows(results[1])[0];
    if (row === undefined || typeof row.assignment_id !== "string" || typeof row.ordinal !== "number") return null;
    const domain = row.domain;
    if (domain !== "gf" && domain !== "gc" && domain !== "gv" && domain !== "gwm" && domain !== "gs") return null;
    const presentation = row.presentation;
    if (!isRecord(presentation)) return null;
    const stimulus = presentation.stimulus;
    const options = presentation.options;
    if (!isCognitiveStimulus(stimulus) || !isPresentationOptions(options)) return null;

    return toItemPresentation({
      assignmentId: row.assignment_id,
      ordinal: row.ordinal,
      domain,
      stimulus,
      options,
      correctOptionId: "private",
      parameters: { discrimination: 1, difficulty: 0, guessing: 0 },
      serverSeed: "private",
    });
  } catch (error) {
    throw new Error(`failed to load cognitive assignment: ${neonErrorMessage(error)}`);
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCognitiveStimulus(value: unknown): value is CognitiveStimulus {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "text") return typeof value.textKo === "string" && typeof value.textEn === "string";
  if (value.kind === "matrix") return Array.isArray(value.cells) && value.cells.length === 9;
  if (value.kind === "spatial") return Array.isArray(value.cubes) && value.cubes.length > 0;
  return false;
}

function isPresentationOptions(value: unknown): value is readonly PresentationOption[] {
  if (!Array.isArray(value)) return false;
  return value.every((option) => {
    if (!isRecord(option)) return false;
    return typeof option.id === "string" && typeof option.labelKo === "string" && typeof option.labelEn === "string";
  });
}

export interface SubmitOwnedResponseInput {
  readonly runId: string;
  readonly assignmentId: string;
  readonly optionId: string;
  readonly elapsedMs: number | null;
}

export type SubmitOwnedResponseResult =
  | { readonly ok: true; readonly runId: string; readonly status: "active" | "completed"; readonly nextAssignmentId: string | null }
  | { readonly ok: false; readonly error: "invalid_run" | "stale_assignment" | "invalid_option" };

/** RLS subject context를 설정한 같은 transaction에서 owner-bound SQL function을 호출한다. */
export async function submitOwnedResponse(input: SubmitOwnedResponseInput): Promise<SubmitOwnedResponseResult> {
  const ownedRun = await getOwnedRun(input.runId);
  if (ownedRun === null) return { ok: false, error: "invalid_run" };

  const subject = await requireCognitiveSubject();
  const sql = createNeonSql();
  try {
    const results = await sql.transaction([
      sql`select set_config('app.current_subject_id', ${subject.id}, true)`,
      sql`
        select returned_run_id, returned_status, next_assignment_id
          from private_cognitive.submit_response(
            ${input.runId}::uuid,
            ${input.assignmentId}::uuid,
            ${input.optionId},
            ${input.elapsedMs}
          )
      `,
    ]);
    const row = neonRows(results[1])[0];
    if (row === undefined || typeof row.returned_run_id !== "string" || typeof row.returned_status !== "string") {
      return { ok: false, error: "stale_assignment" };
    }
    const status = row.returned_status === "completed" ? "completed" : "active";
    const nextAssignmentId = row.next_assignment_id === null || row.next_assignment_id === undefined
      ? null
      : typeof row.next_assignment_id === "string" ? row.next_assignment_id : null;
    return { ok: true, runId: row.returned_run_id, status, nextAssignmentId };
  } catch (error) {
    const message = neonErrorMessage(error).toLowerCase();
    if (message.includes("stale") || message.includes("answered")) {
      return { ok: false, error: "stale_assignment" };
    }
    if (message.includes("invalid cognitive option") || message.includes("invalid option")) {
      return { ok: false, error: "invalid_option" };
    }
    throw new Error(`failed to submit cognitive response: ${neonErrorMessage(error)}`);
  }
}
