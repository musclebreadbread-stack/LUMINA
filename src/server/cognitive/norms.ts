import "server-only";

import type { ScoredRun } from "@engine/cognitive-standardized/types";
import {
  thetaToStandardizedScore,
  type AgeNormRow,
  type ApprovedNormVersion,
} from "@engine/cognitive-standardized/norming";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

import { getOwnedRun } from "./repository";

interface NormReleasePayload {
  readonly iqPointsPerTheta: unknown;
  readonly byAge: unknown;
  readonly thetaGrid?: unknown;
}

interface ScoringState {
  readonly theta: number;
  readonly standard_error: number | null;
  readonly answered_count: number;
  readonly age_years: number | null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumberArray(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) return null;
  return value;
}

function parseAgeRows(value: unknown): readonly AgeNormRow[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.flatMap((entry): ReadonlyArray<AgeNormRow> => {
    if (!isRecord(entry) || typeof entry.minimumAge !== "number" || typeof entry.maximumAge !== "number") return [];
    const thetaToIq = parseNumberArray(entry.thetaToIq);
    const iqToPercentile = parseNumberArray(entry.iqToPercentile);
    if (thetaToIq === null || iqToPercentile === null || thetaToIq.length < 2 || iqToPercentile.length === 0) return [];
    return [{ minimumAge: entry.minimumAge, maximumAge: entry.maximumAge, thetaToIq, iqToPercentile }];
  });
  return rows.length === value.length ? rows : null;
}

function parseApprovedNorm(row: unknown): ApprovedNormVersion | null {
  if (!isRecord(row) || row.status !== "approved" || row.target_population !== "ko-adults-18-64" || typeof row.id !== "string" || typeof row.item_bank_version !== "string" || typeof row.algorithm_version !== "string" || typeof row.approved_at !== "string" || !isRecord(row.norm_payload)) return null;
  const payload = row.norm_payload as unknown as NormReleasePayload;
  if (typeof payload.iqPointsPerTheta !== "number" || !Number.isFinite(payload.iqPointsPerTheta) || payload.iqPointsPerTheta <= 0) return null;
  const byAge = parseAgeRows(payload.byAge);
  if (byAge === null) return null;
  const thetaGrid = payload.thetaGrid === undefined ? undefined : parseNumberArray(payload.thetaGrid);
  if (payload.thetaGrid !== undefined && thetaGrid === null) return null;
  return {
    id: row.id,
    status: "approved",
    targetPopulation: "ko-adults-18-64",
    itemBankVersion: row.item_bank_version,
    algorithmVersion: row.algorithm_version,
    approvedAt: row.approved_at,
    iqPointsPerTheta: payload.iqPointsPerTheta,
    byAge,
    ...(thetaGrid === undefined || thetaGrid === null ? {} : { thetaGrid }),
  };
}

async function loadScoringState(runId: string): Promise<ScoringState | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .schema("private_cognitive")
    .from("scoring_state")
    .select("theta, standard_error, answered_count, age_years")
    .eq("run_id", runId)
    .maybeSingle();
  if (error || data === null) return null;
  return data;
}

export async function loadApprovedNormForRun(runId: string): Promise<ApprovedNormVersion | null> {
  const ownedRun = await getOwnedRun(runId);
  if (ownedRun === null || ownedRun.status !== "completed") return null;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .schema("private_cognitive")
    .from("norm_releases")
    .select("id, status, target_population, item_bank_version, algorithm_version, norm_payload, approved_at")
    .eq("status", "approved")
    .eq("target_population", "ko-adults-18-64")
    .eq("item_bank_version", ownedRun.itemBankVersion)
    .eq("algorithm_version", ownedRun.algorithmVersion)
    .order("approved_at", { ascending: false })
    .limit(1);
  if (error || data === null || data.length === 0) return null;
  return parseApprovedNorm(data[0]);
}

export async function resolveScoreForRun(runId: string): Promise<ScoredRun> {
  const pilot: ScoredRun = Object.freeze({ status: "pilot_withheld", score: null });
  const ownedRun = await getOwnedRun(runId);
  if (ownedRun === null || ownedRun.status !== "completed" || ownedRun.answeredCount < ownedRun.targetItemCount) return pilot;

  const [norm, scoringState] = await Promise.all([loadApprovedNormForRun(runId), loadScoringState(runId)]);
  if (norm === null || scoringState === null || scoringState.standard_error === null || scoringState.age_years === null || scoringState.answered_count < ownedRun.targetItemCount) return pilot;

  try {
    const score = thetaToStandardizedScore({
      theta: scoringState.theta,
      sem: scoringState.standard_error,
      age: scoringState.age_years,
      itemBankVersion: ownedRun.itemBankVersion,
      algorithmVersion: ownedRun.algorithmVersion,
    }, norm);
    return Object.freeze({ status: "standardized_scored", score });
  } catch {
    return pilot;
  }
}
