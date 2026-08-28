import "server-only";

import type {
  CognitiveStimulus,
  ItemPresentation,
  PresentationOption,
  RunSnapshot,
  StandardizedDomain,
} from "@engine/cognitive-standardized/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

/** 비공개 assignment에서 브라우저로 전달할 발표 DTO만 명시적으로 복사한다. */
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

function toOwnedRun(row: {
  readonly id: string;
  readonly status: string;
  readonly item_bank_version: string;
  readonly algorithm_version: string;
  readonly blueprint_version: string;
  readonly target_item_count: number;
  readonly answered_count: number;
}): OwnedRun {
  if (!isRunStatus(row.status)) throw new Error("invalid cognitive run status");
  return {
    id: row.id,
    status: row.status,
    itemBankVersion: row.item_bank_version,
    algorithmVersion: row.algorithm_version,
    blueprintVersion: row.blueprint_version,
    targetItemCount: row.target_item_count,
    answeredCount: row.answered_count,
  };
}

export async function getOwnedRun(runId: string): Promise<OwnedRun | null> {
  const subject = await requireCognitiveSubject();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assessment_runs")
    .select("id, status, item_bank_version, algorithm_version, blueprint_version, target_item_count, answered_count")
    .eq("id", runId)
    .eq("owner_id", subject.id)
    .maybeSingle();

  if (error) throw new Error(`failed to load cognitive run: ${error.message}`);
  return data === null ? null : toOwnedRun(data);
}

/**
 * 소유권을 먼저 확인한 뒤에만 service-role client로 private assignment를 읽는다.
 * DB row 전체를 그대로 반환하지 않고 ItemPresentation만 반환한다.
 */
export async function getPresentationForOwner(
  runId: string,
  assignmentId: string,
): Promise<ItemPresentation | null> {
  const ownedRun = await getOwnedRun(runId);
  if (ownedRun === null) return null;

  const admin = createAdminSupabaseClient();
  const { data: assignment, error: assignmentError } = await admin
    .schema("private_cognitive")
    .from("run_assignments")
    .select("assignment_id, ordinal, item_version_id")
    .eq("run_id", runId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (assignmentError) throw new Error(`failed to load cognitive assignment: ${assignmentError.message}`);
  if (assignment === null) return null;

  const { data: item, error: itemError } = await admin
    .schema("private_cognitive")
    .from("item_versions")
    .select("domain, presentation")
    .eq("version_id", assignment.item_version_id)
    .eq("status", "active")
    .maybeSingle();
  if (itemError) throw new Error(`failed to load cognitive item: ${itemError.message}`);
  if (item === null) return null;

  const presentation = item.presentation;
  if (typeof presentation !== "object" || presentation === null || Array.isArray(presentation)) return null;
  const domain = item.domain;
  if (domain !== "gf" && domain !== "gc" && domain !== "gv" && domain !== "gwm" && domain !== "gs") return null;
  const stimulus = presentation.stimulus;
  const options = presentation.options;
  if (!isCognitiveStimulus(stimulus) || !isPresentationOptions(options)) return null;

  return toItemPresentation({
    assignmentId: assignment.assignment_id,
    ordinal: assignment.ordinal,
    domain,
    stimulus,
    options,
    correctOptionId: "private",
    parameters: { discrimination: 1, difficulty: 0, guessing: 0 },
    serverSeed: "private",
  });
}

function isCognitiveStimulus(value: unknown): value is CognitiveStimulus {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const kind = (value as { readonly kind?: unknown }).kind;
  return kind === "text" || kind === "matrix" || kind === "spatial";
}

function isPresentationOptions(value: unknown): value is readonly PresentationOption[] {
  if (!Array.isArray(value)) return false;
  return value.every((option) => {
    if (typeof option !== "object" || option === null || Array.isArray(option)) return false;
    const record = option as { readonly id?: unknown; readonly labelKo?: unknown; readonly labelEn?: unknown };
    return typeof record.id === "string" && typeof record.labelKo === "string" && typeof record.labelEn === "string";
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

/** RLS가 적용된 사용자 client로 owner-bound RPC를 호출한다. */
export async function submitOwnedResponse(input: SubmitOwnedResponseInput): Promise<SubmitOwnedResponseResult> {
  const ownedRun = await getOwnedRun(input.runId);
  if (ownedRun === null) return { ok: false, error: "invalid_run" };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.schema("private_cognitive").rpc("submit_response", {
    p_run_id: input.runId,
    p_assignment_id: input.assignmentId,
    p_option_id: input.optionId,
    p_elapsed_ms: input.elapsedMs,
  });
  if (error) {
    if (error.message.includes("stale") || error.message.includes("answered")) {
      return { ok: false, error: "stale_assignment" };
    }
    return { ok: false, error: "invalid_option" };
  }
  const row = data?.[0];
  if (row === undefined) return { ok: false, error: "stale_assignment" };
  const status = row.returned_status === "completed" ? "completed" : "active";
  return { ok: true, runId: row.returned_run_id, status, nextAssignmentId: row.next_assignment_id };
}
