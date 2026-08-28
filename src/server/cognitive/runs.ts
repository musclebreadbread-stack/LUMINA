import "server-only";

import { rngFromSeed } from "@engine/shared/random";
import { selectNextItem } from "@engine/cognitive-standardized/selection";
import type {
  Blueprint,
  InternalItem,
  ItemPresentation,
  RunSnapshot,
  SelectionState,
  StartRunInput,
  SubmissionResult,
} from "@engine/cognitive-standardized/types";

import type { CognitiveSubject } from "./auth";
import type { SubmitOwnedResponseInput } from "./repository";
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

/**
 * 실제 Supabase 저장소 어댑터가 연결되기 전까지는 의도적으로 실행을 중단한다.
 * 브라우저에서 임의의 localStorage 점수로 대체하지 않아 답안·seed 위조를 막는다.
 */
export class SupabaseCognitiveRunStore implements CognitiveRunStore {
  async start(): Promise<RunSnapshot> {
    throw new CognitiveRunConfigurationError(
      "Supabase cognitive run store requires the reviewed migration and active item bank",
    );
  }

  async submit(): Promise<SubmissionResult> {
    throw new CognitiveRunConfigurationError(
      "Supabase cognitive run store requires the reviewed migration and active item bank",
    );
  }

  async resume(): Promise<RunSnapshot | null> {
    throw new CognitiveRunConfigurationError(
      "Supabase cognitive run store requires the reviewed migration and active item bank",
    );
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

/** 테스트와 로컬 계약 검증 전용 메모리 저장소. 운영 경로는 Supabase 어댑터를 사용한다. */
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

const defaultStore: CognitiveRunStore = new SupabaseCognitiveRunStore();

export async function startCognitiveRun(input: StartRunInput, store: CognitiveRunStore = defaultStore): Promise<RunSnapshot> {
  const { requireCognitiveSubject } = await import("./auth");
  const subject = await requireCognitiveSubject();
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
