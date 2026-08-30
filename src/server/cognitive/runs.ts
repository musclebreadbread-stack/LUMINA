import "server-only";

import { rngFromSeed } from "@engine/shared/random";
import { itemInformation, probabilityCorrect } from "@engine/cognitive-standardized/irt";
import { selectNextItem } from "@engine/cognitive-standardized/selection";
import type {
  Blueprint,
  CognitiveStimulus,
  InternalItem,
  IrtParameters,
  ItemPresentation,
  MatrixCell,
  PresentationOption,
  RunSnapshot,
  SelectionState,
  StandardizedDomain,
  StartRunInput,
  SubmissionResult,
  Voxel,
} from "@engine/cognitive-standardized/types";

import { createNeonSql, isNeonUniqueViolation, neonErrorMessage, neonRows, type NeonSql } from "@/lib/neon/server";
import type { CognitiveSubject } from "./auth";
import {
  getOwnedRun,
  submitOwnedResponse,
  type OwnedRun,
  type SubmitOwnedResponseInput,
} from "./repository";
import { evaluateEligibility } from "@/lib/cognitiveEligibility";

export interface CognitiveRunStore {
  start(subject: CognitiveSubject, input: StartRunInput): Promise<RunSnapshot>;
  submit(subject: CognitiveSubject, input: SubmitOwnedResponseInput): Promise<SubmissionResult>;
  resume(subject: CognitiveSubject, runId: string): Promise<RunSnapshot | null>;
}

export class CognitiveRunConfigurationError extends Error {
  constructor(message = "cognitive run store is not configured") {
    super(message);
    this.name = "CognitiveRunConfigurationError";
  }
}

export class CognitiveEligibilityError extends Error {
  constructor(readonly reason: string) {
    super(`cognitive device is not eligible: ${reason}`);
    this.name = "CognitiveEligibilityError";
  }
}

export const COGNITIVE_PILOT_VERSIONS = Object.freeze({
  itemBank: "cognitive-pilot-v1",
  calibration: "ko-adult-pilot-2026-08",
  algorithm: "cat-v1",
  blueprint: "blueprint-v1",
  consent: "cognitive-pilot-consent-v1",
});

export const COGNITIVE_PILOT_BLUEPRINT: Blueprint = Object.freeze({
  minimumByDomain: Object.freeze({ gf: 2, gc: 2, gv: 2, gwm: 2, gs: 2 }),
  maximumByDomain: Object.freeze({ gf: 4, gc: 4, gv: 4, gwm: 4, gs: 4 }),
  maxExposureRate: 0.2,
  targetStandardError: 0.3,
  maximumItems: 20,
});

interface CognitiveAssignmentRow {
  readonly assignment_id: string;
  readonly item_version_id: string;
  readonly ordinal: number;
  readonly state: "current" | "answered" | "expired";
}

interface CognitiveResponseRow {
  readonly assignment_id: string;
  readonly option_id: string;
}

interface CognitiveScoringStateRow {
  readonly server_seed: string;
  readonly theta: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDomain(value: unknown): value is StandardizedDomain {
  return value === "gf" || value === "gc" || value === "gv" || value === "gwm" || value === "gs";
}

function parseStimulus(value: unknown): CognitiveStimulus | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  if (value.kind === "text" && typeof value.textKo === "string" && typeof value.textEn === "string") {
    return { kind: "text", textKo: value.textKo, textEn: value.textEn };
  }
  if (value.kind === "matrix" && Array.isArray(value.cells)) {
    if (value.cells.length !== 9) return null;
    const cells = value.cells.flatMap((cell): ReadonlyArray<MatrixCell> => {
      if (!isRecord(cell)) return [];
      const shape = cell.shape;
      const fill = cell.fill;
      const rotationDegrees = cell.rotationDegrees;
      const validShape = shape === null || shape === "circle" || shape === "square" || shape === "triangle" || shape === "diamond" || shape === "arrow";
      const validFill = fill === null || fill === "none" || fill === "hatch" || fill === "solid";
      const validRotation = rotationDegrees === null || (typeof rotationDegrees === "number" && Number.isFinite(rotationDegrees));
      if ((cell.kind !== "figure" && cell.kind !== "blank") || !validShape || !validFill || !validRotation) return [];
      if (cell.kind === "blank" && (shape !== null || fill !== null)) return [];
      if (cell.kind === "figure" && (shape === null || fill === null)) return [];
      return [{ kind: cell.kind as MatrixCell["kind"], shape: shape as MatrixCell["shape"], fill: fill as MatrixCell["fill"], rotationDegrees: rotationDegrees as number | null }];
    });
    if (cells.length !== value.cells.length) return null;
    return { kind: "matrix", cells };
  }
  if (value.kind === "spatial" && Array.isArray(value.cubes)) {
    if (value.cubes.length === 0) return null;
    const cubes = value.cubes.flatMap((cube): ReadonlyArray<Voxel> => {
      if (!isRecord(cube) || typeof cube.x !== "number" || typeof cube.y !== "number" || typeof cube.z !== "number") return [];
      if (![cube.x, cube.y, cube.z].every(Number.isFinite)) return [];
      if (![cube.x, cube.y, cube.z].every(Number.isInteger) || [cube.x, cube.y, cube.z].some((coordinate) => Math.abs(coordinate) > 20)) return [];
      return [{ x: cube.x, y: cube.y, z: cube.z }];
    });
    if (cubes.length !== value.cubes.length) return null;
    return { kind: "spatial", cubes };
  }
  return null;
}

function parsePresentation(value: unknown, domain: StandardizedDomain): InternalItem["presentation"] | null {
  if (!isRecord(value) || !Array.isArray(value.options)) return null;
  const stimulus = parseStimulus(value.stimulus);
  if (stimulus === null) return null;
  const options = value.options.flatMap((option): ReadonlyArray<PresentationOption> => {
    if (!isRecord(option) || typeof option.id !== "string" || typeof option.labelKo !== "string" || typeof option.labelEn !== "string") return [];
    const figure = option.figure === null || option.figure === undefined ? null : parseStimulus(option.figure);
    if (option.figure !== null && option.figure !== undefined && figure === null) return [];
    return [{ id: option.id, labelKo: option.labelKo, labelEn: option.labelEn, figure }];
  });
  if (options.length < 2 || options.length !== value.options.length || new Set(options.map((option) => option.id)).size !== options.length) return null;
  return { domain, stimulus, options };
}

function parseParameters(value: unknown): IrtParameters | null {
  if (!isRecord(value)) return null;
  const discrimination = value.discrimination;
  const difficulty = value.difficulty;
  const guessing = value.guessing;
  if (typeof discrimination !== "number" || typeof difficulty !== "number" || typeof guessing !== "number") return null;
  if (!Number.isFinite(discrimination) || discrimination <= 0 || !Number.isFinite(difficulty) || !Number.isFinite(guessing) || guessing < 0 || guessing > 0.5) return null;
  return { discrimination, difficulty, guessing };
}

function parseItemRows(rows: readonly unknown[], answerKeys: ReadonlyMap<string, string>): InternalItem[] {
  const items: InternalItem[] = [];
  for (const row of rows) {
    if (!isRecord(row) || typeof row.version_id !== "string" || typeof row.item_bank_version !== "string" || typeof row.calibration_version !== "string" || typeof row.domain !== "string" || typeof row.status !== "string" || typeof row.exposure_rate !== "number") continue;
    if ((row.status !== "pilot" && row.status !== "active") || row.item_bank_version !== COGNITIVE_PILOT_VERSIONS.itemBank || row.calibration_version !== COGNITIVE_PILOT_VERSIONS.calibration || !isDomain(row.domain)) continue;
    const parameters = parseParameters(row.parameters);
    const presentation = parsePresentation(row.presentation, row.domain);
    const correctOptionId = answerKeys.get(row.version_id);
    if (parameters === null || presentation === null || correctOptionId === undefined || !presentation.options.some((option) => option.id === correctOptionId) || !Number.isFinite(row.exposure_rate) || row.exposure_rate < 0 || row.exposure_rate > 1) continue;
    items.push({ versionId: row.version_id, domain: row.domain, presentation, correctOptionId, parameters, exposureRate: row.exposure_rate });
  }
  return items;
}

function assertItemBankCoverage(items: readonly InternalItem[]): void {
  const counts: Record<StandardizedDomain, number> = { gf: 0, gc: 0, gv: 0, gwm: 0, gs: 0 };
  for (const item of items) {
    if (item.exposureRate <= COGNITIVE_PILOT_BLUEPRINT.maxExposureRate) counts[item.domain] += 1;
  }
  if (Object.values(counts).reduce((total, count) => total + count, 0) < COGNITIVE_PILOT_BLUEPRINT.maximumItems) {
    throw new CognitiveRunConfigurationError("pilot cognitive item bank is smaller than the blueprint");
  }
  for (const domain of Object.keys(counts) as StandardizedDomain[]) {
    if (counts[domain] < COGNITIVE_PILOT_BLUEPRINT.minimumByDomain[domain]) {
      throw new CognitiveRunConfigurationError(`pilot cognitive item bank lacks ${domain} coverage`);
    }
  }
}

async function queryAsSubject(subjectId: string, query: ReturnType<NeonSql>): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const sql = createNeonSql();
  const results = await sql.transaction([
    sql`select set_config('app.current_subject_id', ${subjectId}, true)`,
    query,
  ]);
  return neonRows(results[1]);
}

async function loadActiveItems(subjectId: string): Promise<InternalItem[]> {
  const sql = createNeonSql();
  let rows: readonly Readonly<Record<string, unknown>>[];
  try {
    rows = await queryAsSubject(subjectId, sql`
      select iv.version_id, iv.item_bank_version, iv.calibration_version, iv.domain,
             iv.status, iv.presentation, iv.parameters, iv.exposure_rate,
             ak.correct_option_id
        from private_cognitive.item_versions as iv
        join private_cognitive.answer_keys as ak on ak.version_id = iv.version_id
       where iv.item_bank_version = ${COGNITIVE_PILOT_VERSIONS.itemBank}
         and iv.calibration_version = ${COGNITIVE_PILOT_VERSIONS.calibration}
         and iv.status in ('pilot', 'active')
    `);
  } catch (error) {
    throw new CognitiveRunConfigurationError(`failed to load active cognitive item bank: ${neonErrorMessage(error)}`);
  }

  const answerKeys = new Map<string, string>();
  for (const row of rows) {
    if (typeof row.version_id === "string" && typeof row.correct_option_id === "string") {
      answerKeys.set(row.version_id, row.correct_option_id);
    }
  }
  const items = parseItemRows(rows, answerKeys);
  if (items.length === 0) throw new CognitiveRunConfigurationError("no pilot cognitive items are available");
  assertItemBankCoverage(items);
  return items;
}

async function loadAssignments(subjectId: string, runId: string): Promise<CognitiveAssignmentRow[]> {
  const sql = createNeonSql();
  try {
    const rows = await queryAsSubject(subjectId, sql`
      select assignment_id, item_version_id, ordinal, state
        from private_cognitive.run_assignments
       where run_id = ${runId}::uuid
       order by ordinal asc
    `);
    return rows.flatMap((row): CognitiveAssignmentRow[] => {
      if (typeof row.assignment_id !== "string" || typeof row.item_version_id !== "string" || typeof row.ordinal !== "number") return [];
      if (row.state !== "current" && row.state !== "answered" && row.state !== "expired") return [];
      return [{ assignment_id: row.assignment_id, item_version_id: row.item_version_id, ordinal: row.ordinal, state: row.state }];
    });
  } catch (error) {
    throw new CognitiveRunConfigurationError(`failed to load cognitive assignments: ${neonErrorMessage(error)}`);
  }
}

async function loadResponses(subjectId: string, runId: string): Promise<CognitiveResponseRow[]> {
  const sql = createNeonSql();
  try {
    const rows = await queryAsSubject(subjectId, sql`
      select assignment_id, option_id
        from private_cognitive.raw_responses
       where run_id = ${runId}::uuid
    `);
    return rows.flatMap((row): CognitiveResponseRow[] => {
      if (typeof row.assignment_id !== "string" || typeof row.option_id !== "string") return [];
      return [{ assignment_id: row.assignment_id, option_id: row.option_id }];
    });
  } catch (error) {
    throw new CognitiveRunConfigurationError(`failed to load cognitive responses: ${neonErrorMessage(error)}`);
  }
}

async function loadScoringState(subjectId: string, runId: string): Promise<CognitiveScoringStateRow> {
  const sql = createNeonSql();
  try {
    const rows = await queryAsSubject(subjectId, sql`
      select server_seed, theta
        from private_cognitive.scoring_state
       where run_id = ${runId}::uuid
       limit 1
    `);
    const row = rows[0];
    if (row === undefined || typeof row.server_seed !== "string" || typeof row.theta !== "number") {
      throw new CognitiveRunConfigurationError("cognitive scoring state is missing");
    }
    return { server_seed: row.server_seed, theta: row.theta };
  } catch (error) {
    if (error instanceof CognitiveRunConfigurationError) throw error;
    throw new CognitiveRunConfigurationError(`failed to load cognitive scoring state: ${neonErrorMessage(error)}`);
  }
}

function estimateTheta(items: readonly InternalItem[], assignments: readonly CognitiveAssignmentRow[], responses: readonly CognitiveResponseRow[], initialTheta: number): { readonly theta: number; readonly information: number } {
  const itemById = new Map(items.map((item) => [item.versionId, item]));
  const responseByAssignment = new Map(responses.map((response) => [response.assignment_id, response.option_id]));
  let theta = Number.isFinite(initialTheta) ? Math.max(-4, Math.min(4, initialTheta)) : 0;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    let score = 0;
    let information = 0;
    for (const assignment of assignments) {
      if (assignment.state !== "answered") continue;
      const item = itemById.get(assignment.item_version_id);
      const optionId = responseByAssignment.get(assignment.assignment_id);
      if (item === undefined || optionId === undefined) continue;
      const probability = probabilityCorrect(theta, item.parameters);
      const derivative = item.parameters.discrimination * (probability - item.parameters.guessing) * (1 - probability) / (1 - item.parameters.guessing);
      const denominator = Math.max(1e-8, probability * (1 - probability));
      const correct = optionId === item.correctOptionId ? 1 : 0;
      score += ((correct - probability) * derivative) / denominator;
      information += (derivative * derivative) / denominator;
    }
    if (information <= 1e-8) break;
    theta = Math.max(-4, Math.min(4, theta + score / information));
  }
  const information = assignments.reduce((total, assignment) => {
    if (assignment.state !== "answered") return total;
    const item = itemById.get(assignment.item_version_id);
    return item === undefined ? total : total + itemInformation(theta, item.parameters);
  }, 0);
  return { theta, information };
}

export interface FinalCognitiveEstimate {
  readonly theta: number;
  readonly information: number;
  readonly sem: number | null;
  readonly answeredCount: number;
}

/**
 * 완료된 run의 theta/SE를 응답 20개 전체로 다시 계산한다. `ensureNextAssignment`의
 * scoring_state 갱신은 "다음 문항을 배정할 때"만 일어나 마지막 응답 이후로는 절대
 * 실행되지 않으므로, 완료 시점에 한 번 더 계산해 확정하는 통로가 필요하다.
 * norms.ts의 resolveScoreForRun이 폴백으로도 재사용한다.
 */
export async function computeFinalEstimateForRun(subjectId: string, runId: string): Promise<FinalCognitiveEstimate | null> {
  try {
    const items = await loadActiveItems(subjectId);
    const assignments = await loadAssignments(subjectId, runId);
    const responses = await loadResponses(subjectId, runId);
    const scoringState = await loadScoringState(subjectId, runId);
    const estimate = estimateTheta(items, assignments, responses, scoringState.theta);
    const answeredCount = assignments.filter((assignment) => assignment.state === "answered").length;
    return {
      theta: estimate.theta,
      information: estimate.information,
      sem: estimate.information > 0 ? 1 / Math.sqrt(estimate.information) : null,
      answeredCount,
    };
  } catch {
    return null;
  }
}

async function finalizeScoringState(subjectId: string, ownedRun: OwnedRun): Promise<void> {
  const estimate = await computeFinalEstimateForRun(subjectId, ownedRun.id);
  if (estimate === null) return;
  const sql = createNeonSql();
  try {
    await queryAsSubject(subjectId, sql`
      update private_cognitive.scoring_state
         set theta = ${estimate.theta},
             information = ${estimate.information},
             standard_error = ${estimate.sem},
             answered_count = ${estimate.answeredCount},
             updated_at = now()
       where run_id = ${ownedRun.id}::uuid
    `);
  } catch {
    // Best-effort: resolveScoreForRun (norms.ts) recomputes via computeFinalEstimateForRun
    // on demand when this write didn't happen, so a failure here is not fatal.
  }
}

function invalidSnapshot(runId: string, targetItemCount = COGNITIVE_PILOT_BLUEPRINT.maximumItems): RunSnapshot {
  return Object.freeze({ runId, status: "invalid", nextItem: null, answeredCount: 0, targetItemCount });
}

async function markRunInvalid(subjectId: string, runId: string): Promise<void> {
  const sql = createNeonSql();
  await queryAsSubject(subjectId, sql`
    update public.assessment_runs
       set status = 'invalid', updated_at = now()
     where id = ${runId}::uuid
       and owner_id = ${subjectId}::uuid
  `);
}

async function ensureNextAssignment(subjectId: string, ownedRun: OwnedRun): Promise<ItemPresentation | null> {
  if (ownedRun.status === "completed" || ownedRun.status === "invalid") return null;
  const items = await loadActiveItems(subjectId);
  const assignments = await loadAssignments(subjectId, ownedRun.id);
  const current = assignments.find((assignment) => assignment.state === "current");
  if (current !== undefined) {
    const item = items.find((candidate) => candidate.versionId === current.item_version_id);
    if (item === undefined) throw new CognitiveRunConfigurationError("current cognitive assignment item is unavailable");
    return presentationFor(item, current.assignment_id, current.ordinal);
  }
  if (ownedRun.answeredCount >= ownedRun.targetItemCount) return null;

  const responses = await loadResponses(subjectId, ownedRun.id);
  const scoringState = await loadScoringState(subjectId, ownedRun.id);
  const estimate = estimateTheta(items, assignments, responses, scoringState.theta);
  const answeredItemIds = assignments.filter((assignment) => assignment.state === "answered").map((assignment) => assignment.item_version_id);
  const answeredDomainCounts = EMPTY_DOMAIN_COUNTS();
  for (const itemId of answeredItemIds) {
    const item = items.find((candidate) => candidate.versionId === itemId);
    if (item !== undefined) answeredDomainCounts[item.domain] += 1;
  }
  const recentItemIds = assignments.filter((assignment) => assignment.state === "answered").slice(-3).map((assignment) => assignment.item_version_id);
  const selected = selectNextItem({
    items,
    blueprint: COGNITIVE_PILOT_BLUEPRINT,
    theta: estimate.theta,
    answeredItemIds,
    answeredDomainCounts,
    recentItemIds,
    random: rngFromSeed(`${scoringState.server_seed}:${ownedRun.answeredCount}`),
  });
  if (selected === null) {
    await markRunInvalid(subjectId, ownedRun.id);
    return null;
  }

  const ordinal = assignments.length + 1;
  const sql = createNeonSql();
  let assignmentId: string | null = null;
  try {
    const rows = await queryAsSubject(subjectId, sql`
      insert into private_cognitive.run_assignments (run_id, item_version_id, ordinal, state)
      values (${ownedRun.id}::uuid, ${selected.versionId}, ${ordinal}, 'current')
      returning assignment_id
    `);
    assignmentId = typeof rows[0]?.assignment_id === "string" ? rows[0].assignment_id : null;
  } catch (error) {
    if (isNeonUniqueViolation(error)) {
      const racedAssignments = await loadAssignments(subjectId, ownedRun.id);
      const racedCurrent = racedAssignments.find((candidate) => candidate.state === "current");
      if (racedCurrent !== undefined) {
        const racedItem = items.find((candidate) => candidate.versionId === racedCurrent.item_version_id);
        if (racedItem !== undefined) return presentationFor(racedItem, racedCurrent.assignment_id, racedCurrent.ordinal);
      }
    }
    throw new CognitiveRunConfigurationError(`failed to create cognitive assignment: ${neonErrorMessage(error)}`);
  }
  if (assignmentId === null) throw new CognitiveRunConfigurationError("cognitive assignment id is missing");

  try {
    await queryAsSubject(subjectId, sql`
      update private_cognitive.scoring_state
         set theta = ${estimate.theta},
             information = ${estimate.information},
             standard_error = ${estimate.information > 0 ? 1 / Math.sqrt(estimate.information) : null},
             answered_count = ${ownedRun.answeredCount},
             updated_at = now()
       where run_id = ${ownedRun.id}::uuid
    `);
  } catch (error) {
    throw new CognitiveRunConfigurationError(`failed to update cognitive scoring state: ${neonErrorMessage(error)}`);
  }
  return presentationFor(selected, assignmentId, ordinal);
}

/**
 * Neon 저장소 어댑터는 서버 전용 SQL 경계에서만 실행한다.
 * 브라우저에서 임의의 localStorage 점수로 대체하지 않아 답안·seed 위조를 막는다.
 */
export class NeonCognitiveRunStore implements CognitiveRunStore {
  async start(subject: CognitiveSubject, input: StartRunInput): Promise<RunSnapshot> {
    if (input.consent.operationalStorage !== true) {
      throw new CognitiveRunConfigurationError("operational storage consent is required");
    }

    const runId = crypto.randomUUID();
    const serverSeed = crypto.randomUUID();
    const sql = createNeonSql();
    try {
      await sql.transaction([
        sql`select set_config('app.current_subject_id', ${subject.id}, true)`,
        sql`
          insert into public.cognitive_subjects (id, kind)
          values (${subject.id}::uuid, 'guest')
          on conflict (id) do nothing
        `,
        sql`
          insert into public.research_consents
            (owner_id, consent_version, operational_storage, research_participation)
          values
            (${subject.id}::uuid, ${COGNITIVE_PILOT_VERSIONS.consent}, true, ${input.consent.researchParticipation})
          on conflict (owner_id, consent_version) do nothing
        `,
        sql`
          insert into public.assessment_runs
            (id, owner_id, assessment_key, status, item_bank_version, algorithm_version,
             blueprint_version, target_item_count, answered_count)
          values
            (${runId}::uuid, ${subject.id}::uuid, 'cognitive_v1', 'active',
             ${COGNITIVE_PILOT_VERSIONS.itemBank}, ${COGNITIVE_PILOT_VERSIONS.algorithm},
             ${COGNITIVE_PILOT_VERSIONS.blueprint}, ${COGNITIVE_PILOT_BLUEPRINT.maximumItems}, 0)
        `,
        sql`
          insert into private_cognitive.scoring_state
            (run_id, server_seed, theta, information, standard_error, answered_count,
             age_years, gender_band, education_band, region_class)
          values (${runId}::uuid, ${serverSeed}, 0, 0, null, 0,
                  ${input.ageYears ?? null}, ${input.genderBand ?? null},
                  ${input.educationBand ?? null}, ${input.regionClass ?? null})
        `,
      ]);

      const ownedRun = await getOwnedRun(runId);
      if (ownedRun === null) throw new CognitiveRunConfigurationError("created cognitive run could not be read back");
      const nextItem = await ensureNextAssignment(subject.id, ownedRun);
      const refreshed = await getOwnedRun(runId);
      if (refreshed === null) throw new CognitiveRunConfigurationError("cognitive run disappeared after assignment");
      return Object.freeze({ runId, status: refreshed.status, nextItem, answeredCount: refreshed.answeredCount, targetItemCount: refreshed.targetItemCount });
    } catch (error) {
      await markRunInvalid(subject.id, runId).catch(() => undefined);
      if (error instanceof CognitiveRunConfigurationError) throw error;
      throw new CognitiveRunConfigurationError(`failed to initialize cognitive run: ${neonErrorMessage(error)}`);
    }
  }

  async submit(subject: CognitiveSubject, input: SubmitOwnedResponseInput): Promise<SubmissionResult> {
    const ownedRun = await getOwnedRun(input.runId);
    if (ownedRun === null) return { run: invalidSnapshot(input.runId), error: "invalid_run" };

    const submitted = await submitOwnedResponse(input);
    if (!submitted.ok) {
      const current = await getOwnedRun(input.runId);
      if (current === null) return { run: invalidSnapshot(input.runId), error: "invalid_run" };
      const nextItem = await ensureNextAssignment(subject.id, current);
      const refreshed = await getOwnedRun(input.runId);
      const run = refreshed ?? current;
      return { run: Object.freeze({ runId: run.id, status: run.status, nextItem, answeredCount: run.answeredCount, targetItemCount: run.targetItemCount }), error: submitted.error };
    }

    const current = await getOwnedRun(input.runId);
    if (current === null) return { run: invalidSnapshot(input.runId), error: "invalid_run" };
    if (current.status === "completed") {
      await finalizeScoringState(subject.id, current);
    }
    const nextItem = await ensureNextAssignment(subject.id, current);
    const refreshed = await getOwnedRun(input.runId);
    const run = refreshed ?? current;
    return { run: Object.freeze({ runId: run.id, status: run.status, nextItem, answeredCount: run.answeredCount, targetItemCount: run.targetItemCount }), error: null };
  }

  async resume(subject: CognitiveSubject, runId: string): Promise<RunSnapshot | null> {
    const ownedRun = await getOwnedRun(runId);
    if (ownedRun === null) return null;
    const nextItem = await ensureNextAssignment(subject.id, ownedRun);
    const refreshed = await getOwnedRun(runId);
    const run = refreshed ?? ownedRun;
    return Object.freeze({ runId: run.id, status: run.status, nextItem, answeredCount: run.answeredCount, targetItemCount: run.targetItemCount });
  }
}

interface MemoryRun {
  readonly runId: string;
  readonly ownerId: string;
  readonly targetItemCount: number;
  readonly blueprint: Blueprint;
  readonly items: readonly InternalItem[];
  readonly answeredItemIds: string[];
  readonly answeredDomainCounts: Record<InternalItem["domain"], number>;
  readonly recentItemIds: string[];
  readonly random: () => number;
  status: RunSnapshot["status"];
  nextItem: ItemPresentation | null;
  currentAssignmentId: string | null;
  currentItemVersionId: string | null;
}

export interface MemoryStoreOptions {
  readonly items: readonly InternalItem[];
  readonly blueprint: Blueprint;
  readonly seed?: string;
}

const EMPTY_DOMAIN_COUNTS = (): Record<InternalItem["domain"], number> => ({
  gf: 0,
  gc: 0,
  gv: 0,
  gwm: 0,
  gs: 0,
});

function presentationFor(item: InternalItem, assignmentId: string, ordinal: number): ItemPresentation {
  return Object.freeze({
    assignmentId,
    ordinal,
    domain: item.domain,
    stimulus: item.presentation.stimulus,
    options: item.presentation.options,
  });
}

function snapshot(run: MemoryRun): RunSnapshot {
  return Object.freeze({
    runId: run.runId,
    status: run.status,
    nextItem: run.nextItem,
    answeredCount: run.answeredItemIds.length,
    targetItemCount: run.targetItemCount,
  });
}

function currentSelection(run: MemoryRun): InternalItem | null {
  const state: SelectionState = {
    items: run.items,
    blueprint: run.blueprint,
    theta: 0,
    answeredItemIds: run.answeredItemIds,
    answeredDomainCounts: run.answeredDomainCounts,
    recentItemIds: run.recentItemIds.slice(-3),
    random: run.random,
  };
  return selectNextItem(state);
}

function nextAssignment(run: MemoryRun): void {
  const selected = currentSelection(run);
  if (selected === null || run.answeredItemIds.length >= run.targetItemCount) {
    run.nextItem = null;
    run.currentAssignmentId = null;
    run.currentItemVersionId = null;
    run.status = "completed";
    return;
  }

  const assignmentId = crypto.randomUUID();
  run.currentAssignmentId = assignmentId;
  run.currentItemVersionId = selected.versionId;
  run.nextItem = presentationFor(selected, assignmentId, run.answeredItemIds.length + 1);
  run.status = "active";
}

/** 테스트와 로컬 계약 검증 전용 메모리 저장소. 운영 경로는 Neon 어댑터를 사용한다. */
export function createMemoryCognitiveRunStore(options: MemoryStoreOptions): CognitiveRunStore {
  const runs = new Map<string, MemoryRun>();

  return {
    async start(subject) {
      const run: MemoryRun = {
        runId: crypto.randomUUID(),
        ownerId: subject.id,
        targetItemCount: options.blueprint.maximumItems,
        blueprint: options.blueprint,
        items: options.items,
        answeredItemIds: [],
        answeredDomainCounts: EMPTY_DOMAIN_COUNTS(),
        recentItemIds: [],
        random: rngFromSeed(options.seed ?? crypto.randomUUID()),
        status: "active",
        nextItem: null,
        currentAssignmentId: null,
        currentItemVersionId: null,
      };
      runs.set(run.runId, run);
      nextAssignment(run);
      return snapshot(run);
    },

    async submit(subject, input) {
      const run = runs.get(input.runId);
      if (run === undefined || run.ownerId !== subject.id || run.status === "invalid") {
        return {
          run: Object.freeze({
            runId: input.runId,
            status: "invalid" as const,
            nextItem: null,
            answeredCount: 0,
            targetItemCount: options.blueprint.maximumItems,
          }),
          error: "invalid_run" as const,
        };
      }
      if (run.currentAssignmentId !== input.assignmentId || run.nextItem === null) {
        return { run: snapshot(run), error: "stale_assignment" as const };
      }
      if (!run.nextItem.options.some((option) => option.id === input.optionId)) {
        return { run: snapshot(run), error: "invalid_option" as const };
      }

      const resolved = run.items.find((candidate) => candidate.versionId === run.currentItemVersionId);
      if (resolved === undefined) return { run: snapshot(run), error: "invalid_option" as const };

      run.answeredItemIds.push(resolved.versionId);
      run.answeredDomainCounts[resolved.domain] += 1;
      run.recentItemIds.push(resolved.versionId);
      nextAssignment(run);
      return { run: snapshot(run), error: null };
    },

    async resume(subject, runId) {
      const run = runs.get(runId);
      if (run === undefined || run.ownerId !== subject.id) return null;
      return snapshot(run);
    },
  };
}

const defaultStore: CognitiveRunStore = new NeonCognitiveRunStore();

export async function startCognitiveRun(input: StartRunInput, store: CognitiveRunStore = defaultStore): Promise<RunSnapshot> {
  const { requireCognitiveSubject } = await import("./auth");
  const demographicsProvided =
    input.ageYears !== undefined || input.genderBand !== undefined || input.educationBand !== undefined || input.regionClass !== undefined;
  if (demographicsProvided && input.consent.researchParticipation !== true) {
    throw new CognitiveRunConfigurationError("norming demographics require research consent");
  }
  const subject = await requireCognitiveSubject({ createIfMissing: true });
  const eligibility = evaluateEligibility(input.capability);
  if (!eligibility.eligibleForComposite && eligibility.reason !== null) {
    throw new CognitiveEligibilityError(eligibility.reason);
  }
  return store.start(subject, input);
}

export async function submitCognitiveResponse(
  input: SubmitOwnedResponseInput,
  store: CognitiveRunStore = defaultStore,
): Promise<SubmissionResult> {
  const { requireCognitiveSubject } = await import("./auth");
  const subject = await requireCognitiveSubject();
  return store.submit(subject, input);
}

export async function resumeCognitiveRun(
  runId: string,
  store: CognitiveRunStore = defaultStore,
): Promise<RunSnapshot | null> {
  const { requireCognitiveSubject } = await import("./auth");
  const subject = await requireCognitiveSubject();
  return store.resume(subject, runId);
}
