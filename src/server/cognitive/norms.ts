import "server-only";

import type { EstimatedDomainAccuracy, ScoredRun, StandardizedDomain } from "@engine/cognitive-standardized/types";
import {
  thetaToStandardizedScore,
  type AgeNormRow,
  type ApprovedNormVersion,
} from "@engine/cognitive-standardized/norming";
import { estimateFromTheta } from "@engine/cognitive-standardized/estimate";
import { createNeonSql, neonRows, type NeonSql } from "@/lib/neon/server";

import { requireCognitiveSubject } from "./auth";
import { getOwnedRun, type OwnedRun } from "./repository";
import { computeFinalEstimateForRun } from "./runs";

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

function isStandardizedDomain(value: unknown): value is StandardizedDomain {
  return value === "gf" || value === "gc" || value === "gv" || value === "gwm" || value === "gs";
}

/**
 * 도메인별 정답 수를 집계만 해서 반환한다 — 정답 옵션 id 자체는 어떤 형태로도
 * 클라이언트로 나가지 않는다(join에 answer_keys를 쓰지만 select 목록에는 없음).
 */
async function loadDomainAccuracies(subjectId: string, runId: string): Promise<readonly EstimatedDomainAccuracy[] | null> {
  const sql = createNeonSql();
  try {
    const rows = await queryAsSubject(subjectId, sql`
      select iv.domain,
             count(*)::int as answered,
             count(*) filter (where rr.option_id = ak.correct_option_id)::int as correct
        from private_cognitive.raw_responses rr
        join private_cognitive.run_assignments ra on ra.assignment_id = rr.assignment_id
        join private_cognitive.item_versions iv on iv.version_id = ra.item_version_id
        join private_cognitive.answer_keys ak on ak.version_id = iv.version_id
       where rr.run_id = ${runId}::uuid
       group by iv.domain
    `);
    const domains = rows.flatMap((row): readonly EstimatedDomainAccuracy[] => {
      if (!isStandardizedDomain(row.domain) || typeof row.answered !== "number" || typeof row.correct !== "number") return [];
      return [{ domain: row.domain, correctCount: row.correct, itemCount: row.answered }];
    });
    return domains.length === rows.length ? domains : null;
  } catch {
    return null;
  }
}

function tryStandardizedScore(
  norm: ApprovedNormVersion | null,
  scoringState: ScoringState | null,
  ownedRun: OwnedRun,
): ScoredRun | null {
  if (
    norm === null ||
    scoringState === null ||
    scoringState.standard_error === null ||
    scoringState.age_years === null ||
    scoringState.answered_count < ownedRun.targetItemCount
  ) {
    return null;
  }
  try {
    const score = thetaToStandardizedScore(
      {
        theta: scoringState.theta,
        sem: scoringState.standard_error,
        age: scoringState.age_years,
        itemBankVersion: ownedRun.itemBankVersion,
        algorithmVersion: ownedRun.algorithmVersion,
      },
      norm,
    );
    return Object.freeze({ status: "standardized_scored", score });
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

  // 승인된 규준 트랙이 항상 우선한다 — 이 분기는 기존 동작 그대로다.
  const standardized = tryStandardizedScore(norm, scoringState, ownedRun);
  if (standardized !== null) return standardized;

  // 승인 규준이 없거나 아직 적용 대상이 아니면, θ~N(0,1) 이론 분포 기반 추정치로
  // 대체한다. 연령 동의 여부와 무관하게 계산 가능하다.
  const finalized =
    scoringState !== null && scoringState.standard_error !== null && scoringState.answered_count >= ownedRun.targetItemCount
      ? { theta: scoringState.theta, sem: scoringState.standard_error, answeredCount: scoringState.answered_count }
      : await computeFinalEstimateForRun(subject.id, runId).then((estimate) =>
          estimate === null || estimate.sem === null ? null : { theta: estimate.theta, sem: estimate.sem, answeredCount: estimate.answeredCount },
        );
  if (finalized === null) return pilot;

  const domains = await loadDomainAccuracies(subject.id, runId);
  if (domains === null) return pilot;

  try {
    const score = estimateFromTheta({ theta: finalized.theta, sem: finalized.sem, answeredCount: finalized.answeredCount, domains });
    return Object.freeze({ status: "estimated_scored", score });
  } catch {
    return pilot;
  }
}
