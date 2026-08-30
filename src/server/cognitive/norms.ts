import "server-only";

import type { ScoredRun } from "@engine/cognitive-standardized/types";
import {
  thetaToStandardizedScore,
  type AgeNormRow,
  type ApprovedNormVersion,
} from "@engine/cognitive-standardized/norming";
import { createNeonSql, neonRows, type NeonSql } from "@/lib/neon/server";

import { requireCognitiveSubject } from "./auth";
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

async function queryAsSubject(subjectId: string, query: ReturnType<NeonSql>): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const sql = createNeonSql();
  const results = await sql.transaction([
    sql`select set_config('app.current_subject_id', ${subjectId}, true)`,
    query,
  ]);
  return neonRows(results[1]);
}

async function loadScoringState(subjectId: string, runId: string): Promise<ScoringState | null> {
  const sql = createNeonSql();
  try {
    const rows = await queryAsSubject(subjectId, sql`
      select theta, standard_error, answered_count, age_years
        from private_cognitive.scoring_state
       where run_id = ${runId}::uuid
       limit 1
    `);
    const row = rows[0];
    if (
      row === undefined ||
      typeof row.theta !== "number" ||
      (row.standard_error !== null && typeof row.standard_error !== "number") ||
      typeof row.answered_count !== "number" ||
      (row.age_years !== null && typeof row.age_years !== "number")
    ) return null;
    return {
      theta: row.theta,
      standard_error: row.standard_error,
      answered_count: row.answered_count,
      age_years: row.age_years,
    };
  } catch {
    return null;
  }
}

export async function loadApprovedNormForRun(runId: string): Promise<ApprovedNormVersion | null> {
  const ownedRun = await getOwnedRun(runId);
  if (ownedRun === null || ownedRun.status !== "completed") return null;

  const subject = await requireCognitiveSubject().catch(() => null);
  if (subject === null) return null;
  const sql = createNeonSql();
  try {
    const rows = await queryAsSubject(subject.id, sql`
      select id, status, target_population, item_bank_version, algorithm_version,
             norm_payload, approved_at
        from private_cognitive.norm_releases
       where status = 'approved'
         and target_population = 'ko-adults-18-64'
         and item_bank_version = ${ownedRun.itemBankVersion}
         and algorithm_version = ${ownedRun.algorithmVersion}
       order by approved_at desc
       limit 1
    `);
    return rows.length === 0 ? null : parseApprovedNorm(rows[0]);
  } catch {
    return null;
  }
}

export async function resolveScoreForRun(runId: string): Promise<ScoredRun> {
  const pilot: ScoredRun = Object.freeze({ status: "pilot_withheld", score: null });
  const ownedRun = await getOwnedRun(runId);
  if (ownedRun === null || ownedRun.status !== "completed" || ownedRun.answeredCount < ownedRun.targetItemCount) return pilot;

  const subject = await requireCognitiveSubject().catch(() => null);
  if (subject === null) return pilot;
  const [norm, scoringState] = await Promise.all([loadApprovedNormForRun(runId), loadScoringState(subject.id, runId)]);
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
