import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RunSnapshot, StartRunInput } from "@engine/cognitive-standardized/types";
import type { CognitiveSubject } from "../auth";

vi.mock("server-only", () => ({}));

interface FakeQuery {
  readonly text: string;
  readonly values: readonly unknown[];
}

type Handler = (query: FakeQuery) => unknown;

const hoisted = vi.hoisted(() => ({
  handlers: new Map<string, (query: { text: string; values: readonly unknown[] }) => unknown>(),
  executed: [] as { text: string; values: readonly unknown[] }[],
  transactionSizes: [] as number[],
  getOwnedRun: vi.fn(),
  submitOwnedResponse: vi.fn(),
  requireCognitiveSubject: vi.fn(),
}));

function classify(text: string): string {
  if (text.includes("from private_cognitive.item_versions")) return "items";
  if (text.includes("select assignment_id, item_version_id")) return "assignments";
  if (text.includes("from private_cognitive.raw_responses")) return "responses";
  if (text.includes("select server_seed")) return "scoringSelect";
  if (text.includes("update private_cognitive.scoring_state")) return "scoringUpdate";
  if (text.includes("insert into private_cognitive.run_assignments")) return "insertAssignment";
  if (text.includes("update public.assessment_runs")) return "markInvalid";
  if (text.includes("insert into public.cognitive_subjects")) return "startTx";
  return "unknown";
}

vi.mock("@/lib/neon/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/neon/server")>("@/lib/neon/server");
  const sql = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      text: strings.join("?").replace(/\s+/g, " ").trim(),
      values,
    }),
    {
      transaction: async (queries: readonly { text: string; values: readonly unknown[] }[]) => {
        hoisted.transactionSizes.push(queries.length);
        const last = queries[queries.length - 1] as { text: string; values: readonly unknown[] };
        hoisted.executed.push(last);
        const kind = classify(queries[1]?.text ?? last.text);
        const handler = hoisted.handlers.get(kind);
        const result = handler === undefined ? [] : handler(last);
        return [[], result];
      },
    },
  );
  return { ...actual, createNeonSql: () => sql };
});

vi.mock("../repository", () => ({
  getOwnedRun: hoisted.getOwnedRun,
  submitOwnedResponse: hoisted.submitOwnedResponse,
}));

vi.mock("../auth", () => ({ requireCognitiveSubject: hoisted.requireCognitiveSubject }));

import {
  CognitiveEligibilityError,
  CognitiveRunConfigurationError,
  NeonCognitiveRunStore,
  computeFinalEstimateForRun,
  resumeCognitiveRun,
  startCognitiveRun,
  submitCognitiveResponse,
  type CognitiveRunStore,
} from "../runs";

const subject: CognitiveSubject = { id: "11111111-1111-4111-8111-111111111111", isAnonymous: true };
const RUN_ID = "22222222-2222-4222-8222-222222222222";
const DOMAINS = ["gf", "gc", "gv", "gwm", "gs"] as const;

function textPresentation(index: number): Record<string, unknown> {
  return {
    stimulus: { kind: "text", textKo: `q${index}`, textEn: `q${index}` },
    options: [
      { id: "a", labelKo: "A", labelEn: "A" },
      { id: "b", labelKo: "B", labelEn: "B" },
    ],
  };
}

function itemRow(index: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version_id: `item-${index}`,
    item_bank_version: "cognitive-pilot-v1",
    calibration_version: "ko-adult-pilot-2026-08",
    domain: DOMAINS[index % DOMAINS.length],
    status: "pilot",
    presentation: textPresentation(index),
    parameters: { discrimination: 1.2, difficulty: (index % 7) / 3 - 1, guessing: 0.2 },
    exposure_rate: 0.1,
    correct_option_id: "a",
    ...overrides,
  };
}

function itemBank(count = 25): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => itemRow(index));
}

function ownedRun(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    status: "active",
    itemBankVersion: "cognitive-pilot-v1",
    algorithmVersion: "cat-v1",
    blueprintVersion: "blueprint-v1",
    targetItemCount: 20,
    answeredCount: 0,
    ...overrides,
  };
}

function on(kind: string, handler: Handler | readonly Record<string, unknown>[]): void {
  hoisted.handlers.set(kind, typeof handler === "function" ? handler : () => handler);
}

function baseHandlers(): void {
  on("items", itemBank());
  on("assignments", []);
  on("responses", []);
  on("scoringSelect", [{ server_seed: "seed-1", theta: 0 }]);
  on("insertAssignment", [{ assignment_id: "assign-1" }]);
}

const capability: StartRunInput["capability"] = {
  locale: "ko",
  device: "desktop",
  keyboard: true,
  pointer: true,
  viewportWidth: 1440,
  viewportHeight: 900,
  reducedMotion: false,
};

function startInput(overrides: Partial<StartRunInput> = {}): StartRunInput {
  return { consent: { operationalStorage: true, researchParticipation: false }, capability, ...overrides };
}

function sqlOf(kind: string): FakeQuery[] {
  return hoisted.executed.filter((query) => classify(query.text) === kind);
}

beforeEach(() => {
  hoisted.handlers.clear();
  hoisted.executed.length = 0;
  hoisted.transactionSizes.length = 0;
  hoisted.getOwnedRun.mockReset();
  hoisted.submitOwnedResponse.mockReset();
  hoisted.requireCognitiveSubject.mockReset();
  hoisted.requireCognitiveSubject.mockResolvedValue(subject);
  baseHandlers();
});

describe("NeonCognitiveRunStore.resume", () => {
  const store = new NeonCognitiveRunStore();

  it("returns null when the run is not owned", async () => {
    hoisted.getOwnedRun.mockResolvedValue(null);
    await expect(store.resume(subject, RUN_ID)).resolves.toBeNull();
  });

  it("creates the first assignment, persists scoring state and hides the answer key", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());

    const snapshot = await store.resume(subject, RUN_ID);

    expect(snapshot).toMatchObject({ runId: RUN_ID, status: "active", answeredCount: 0, targetItemCount: 20 });
    expect(snapshot?.nextItem).toMatchObject({ assignmentId: "assign-1", ordinal: 1 });
    expect(JSON.stringify(snapshot)).not.toContain("correct");
    const insert = sqlOf("insertAssignment")[0];
    expect(insert?.values[0]).toBe(RUN_ID);
    expect(insert?.values[2]).toBe(1);
    expect(sqlOf("scoringUpdate")).toHaveLength(1);
  });

  it("re-presents an existing current assignment without inserting a new one", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ answeredCount: 1 }));
    on("assignments", [
      { assignment_id: "old", item_version_id: "item-0", ordinal: 1, state: "answered" },
      { assignment_id: "cur", item_version_id: "item-1", ordinal: 2, state: "current" },
      { assignment_id: "bad-state", item_version_id: "item-2", ordinal: 3, state: "weird" },
      { assignment_id: 5, item_version_id: "item-2", ordinal: 3, state: "current" },
    ]);

    const snapshot = await store.resume(subject, RUN_ID);

    expect(snapshot?.nextItem).toMatchObject({ assignmentId: "cur", ordinal: 2, domain: "gc" });
    expect(sqlOf("insertAssignment")).toHaveLength(0);
  });

  it("fails when the current assignment refers to an unavailable item", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("assignments", [{ assignment_id: "cur", item_version_id: "missing", ordinal: 1, state: "current" }]);
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("current cognitive assignment item is unavailable");
  });

  it.each(["completed", "invalid"] as const)("returns no next item for a %s run", async (status) => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ status }));
    const snapshot = await store.resume(subject, RUN_ID);
    expect(snapshot?.nextItem).toBeNull();
    expect(hoisted.executed).toHaveLength(0);
  });

  it("returns no next item once the target count is answered", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ answeredCount: 20 }));
    const snapshot = await store.resume(subject, RUN_ID);
    expect(snapshot?.nextItem).toBeNull();
    expect(sqlOf("insertAssignment")).toHaveLength(0);
  });

  it("marks the run invalid when the selector has no candidate left", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ answeredCount: 5 }));
    on(
      "assignments",
      itemBank().map((row, index) => ({
        assignment_id: `as-${index}`,
        item_version_id: row.version_id,
        ordinal: index + 1,
        state: "answered",
      })),
    );
    const snapshot = await store.resume(subject, RUN_ID);
    expect(snapshot?.nextItem).toBeNull();
    expect(sqlOf("markInvalid")).toHaveLength(1);
  });

  it("recovers from a unique violation race by returning the raced current assignment", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    let assignmentCalls = 0;
    on("assignments", () => {
      assignmentCalls += 1;
      return assignmentCalls === 1
        ? []
        : [{ assignment_id: "raced", item_version_id: "item-3", ordinal: 1, state: "current" }];
    });
    on("insertAssignment", () => {
      throw Object.assign(new Error("duplicate"), { code: "23505" });
    });

    const snapshot = await store.resume(subject, RUN_ID);
    expect(snapshot?.nextItem).toMatchObject({ assignmentId: "raced" });
  });

  it("throws when a unique violation cannot be resolved to a current assignment", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("insertAssignment", () => {
      throw Object.assign(new Error("duplicate"), { code: "23505" });
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("failed to create cognitive assignment: duplicate");
  });

  it("throws when the assignment insert fails for another reason", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("insertAssignment", () => {
      throw new Error("boom");
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toBeInstanceOf(CognitiveRunConfigurationError);
  });

  it("throws when the inserted assignment id is missing", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("insertAssignment", [{}]);
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("cognitive assignment id is missing");
  });

  it("throws when scoring state cannot be updated", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("scoringUpdate", () => {
      throw new Error("write failed");
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("failed to update cognitive scoring state: write failed");
  });

  it("throws when scoring state is missing or unreadable", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("scoringSelect", []);
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("cognitive scoring state is missing");
    on("scoringSelect", () => {
      throw new Error("db down");
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("failed to load cognitive scoring state: db down");
  });

  it("wraps assignment, response and item bank load failures", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
    on("assignments", () => {
      throw new Error("a");
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("failed to load cognitive assignments: a");
    on("assignments", []);
    on("responses", () => {
      throw new Error("r");
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("failed to load cognitive responses: r");
    on("responses", []);
    on("items", () => {
      throw new Error("i");
    });
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("failed to load active cognitive item bank: i");
  });
});

describe("item bank validation", () => {
  const store = new NeonCognitiveRunStore();

  beforeEach(() => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun());
  });

  it("rejects an empty item bank", async () => {
    on("items", []);
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("no pilot cognitive items are available");
  });

  it("skips rows that fail structural, version, parameter, presentation and key checks", async () => {
    const invalid = [
      "not-a-record",
      itemRow(100, { status: "retired" }),
      itemRow(101, { item_bank_version: "other" }),
      itemRow(102, { calibration_version: "other" }),
      itemRow(103, { domain: "zz" }),
      itemRow(104, { parameters: { discrimination: 0, difficulty: 0, guessing: 0.1 } }),
      itemRow(105, { parameters: { discrimination: 1, difficulty: 0, guessing: 0.9 } }),
      itemRow(106, { parameters: "x" }),
      itemRow(107, { parameters: { discrimination: "1", difficulty: 0, guessing: 0 } }),
      itemRow(108, { presentation: { options: [], stimulus: { kind: "text", textKo: "a", textEn: "a" } } }),
      itemRow(109, { presentation: { ...textPresentation(1), stimulus: { kind: "unknown" } } }),
      itemRow(110, { correct_option_id: "zzz" }),
      itemRow(111, { exposure_rate: 1.5 }),
      itemRow(112, { exposure_rate: "0.1" }),
      itemRow(113, {
        presentation: {
          ...textPresentation(1),
          options: [
            { id: "a", labelKo: "A", labelEn: "A" },
            { id: "a", labelKo: "A", labelEn: "A" },
          ],
        },
      }),
    ];
    on("items", [...invalid, ...itemBank()] as Record<string, unknown>[]);
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ answeredCount: 0 }));
    on("assignments", [{ assignment_id: "cur", item_version_id: "item-100", ordinal: 1, state: "current" }]);
    // item-100 has an invalid status, so it must not be resolvable as current
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("current cognitive assignment item is unavailable");
  });

  it("rejects a bank smaller than the blueprint maximum", async () => {
    on("items", itemBank(15));
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("smaller than the blueprint");
  });

  it("ignores over-exposed items when checking coverage", async () => {
    on(
      "items",
      itemBank(25).map((row, index) => (index < 6 ? { ...row, exposure_rate: 0.9 } : row)),
    );
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("smaller than the blueprint");
  });

  it("rejects a bank that lacks a domain", async () => {
    on(
      "items",
      Array.from({ length: 25 }, (_, index) => itemRow(index, { domain: index < 24 ? "gf" : "gc" })),
    );
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("lacks gc coverage");
  });

  it("accepts matrix, spatial and figure options, and drops malformed variants", async () => {
    const goodCells = Array.from({ length: 9 }, (_, i) =>
      i === 8
        ? { kind: "blank", shape: null, fill: null, rotationDegrees: null }
        : { kind: "figure", shape: "circle", fill: "solid", rotationDegrees: 90 },
    );
    const matrix = { kind: "matrix", cells: goodCells };
    const spatial = { kind: "spatial", cubes: [{ x: 0, y: 1, z: 2 }] };
    const goodRows = [
      itemRow(0, { presentation: { stimulus: matrix, options: [{ id: "a", labelKo: "A", labelEn: "A", figure: spatial }, { id: "b", labelKo: "B", labelEn: "B", figure: null }] } }),
      itemRow(5, { presentation: { stimulus: spatial, options: textPresentation(5).options } }),
    ];
    const badRows = [
      itemRow(200, { presentation: { stimulus: { kind: "matrix", cells: goodCells.slice(0, 8) }, options: textPresentation(1).options } }),
      itemRow(201, { presentation: { stimulus: { kind: "matrix", cells: [...goodCells.slice(0, 8), { kind: "blank", shape: "circle", fill: null, rotationDegrees: null }] }, options: textPresentation(1).options } }),
      itemRow(202, { presentation: { stimulus: { kind: "matrix", cells: [...goodCells.slice(0, 8), { kind: "figure", shape: null, fill: null, rotationDegrees: null }] }, options: textPresentation(1).options } }),
      itemRow(203, { presentation: { stimulus: { kind: "matrix", cells: [...goodCells.slice(0, 8), 7] }, options: textPresentation(1).options } }),
      itemRow(204, { presentation: { stimulus: { kind: "matrix", cells: [...goodCells.slice(0, 8), { kind: "figure", shape: "star", fill: "solid", rotationDegrees: 0 }] }, options: textPresentation(1).options } }),
      itemRow(205, { presentation: { stimulus: { kind: "spatial", cubes: [] }, options: textPresentation(1).options } }),
      itemRow(206, { presentation: { stimulus: { kind: "spatial", cubes: [{ x: 99, y: 0, z: 0 }] }, options: textPresentation(1).options } }),
      itemRow(207, { presentation: { stimulus: { kind: "spatial", cubes: [{ x: 0.5, y: 0, z: 0 }] }, options: textPresentation(1).options } }),
      itemRow(208, { presentation: { stimulus: { kind: "spatial", cubes: [{ x: "0", y: 0, z: 0 }] }, options: textPresentation(1).options } }),
      itemRow(209, { presentation: { stimulus: spatial, options: [{ id: "a", labelKo: "A", labelEn: "A", figure: { kind: "bad" } }, { id: "b", labelKo: "B", labelEn: "B" }] } }),
    ];
    on("items", [...goodRows, ...itemBank().slice(1, 5).map((row) => row), ...itemBank().slice(6), ...badRows]);
    on("assignments", [
      { assignment_id: "m", item_version_id: "item-0", ordinal: 1, state: "current" },
    ]);
    const snapshot = await store.resume(subject, RUN_ID);
    expect(snapshot?.nextItem?.stimulus.kind).toBe("matrix");
    expect(snapshot?.nextItem?.options[0]?.figure).toMatchObject({ kind: "spatial" });

    on("assignments", [{ assignment_id: "bad", item_version_id: "item-200", ordinal: 1, state: "current" }]);
    await expect(store.resume(subject, RUN_ID)).rejects.toThrow("current cognitive assignment item is unavailable");
    for (const id of [201, 202, 203, 204, 205, 206, 207, 208, 209]) {
      on("assignments", [{ assignment_id: "bad", item_version_id: `item-${id}`, ordinal: 1, state: "current" }]);
      await expect(store.resume(subject, RUN_ID)).rejects.toThrow("unavailable");
    }
    on("assignments", [{ assignment_id: "sp", item_version_id: "item-5", ordinal: 1, state: "current" }]);
    expect((await store.resume(subject, RUN_ID))?.nextItem?.stimulus.kind).toBe("spatial");
  });
});

describe("computeFinalEstimateForRun", () => {
  function answered(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      assignment_id: `as-${index}`,
      item_version_id: `item-${index}`,
      ordinal: index + 1,
      state: "answered",
    }));
  }

  it("moves theta up for correct answers and down for wrong answers", async () => {
    on("assignments", answered(10));
    on("responses", answered(10).map((row) => ({ assignment_id: row.assignment_id, option_id: "a" })));
    const high = await computeFinalEstimateForRun(subject.id, RUN_ID);

    on("responses", answered(10).map((row) => ({ assignment_id: row.assignment_id, option_id: "b" })));
    const low = await computeFinalEstimateForRun(subject.id, RUN_ID);

    expect(high?.answeredCount).toBe(10);
    expect(high?.theta).toBeGreaterThan(0);
    expect(low?.theta).toBeLessThan(0);
    expect(high?.theta).toBeLessThanOrEqual(4);
    expect(low?.theta).toBeGreaterThanOrEqual(-4);
    expect(high?.information).toBeGreaterThan(0);
    expect(high?.sem).toBeCloseTo(1 / Math.sqrt(high?.information ?? 1), 10);
  });

  it("reports a null SEM when nothing was answered and clamps a non-finite start", async () => {
    on("scoringSelect", [{ server_seed: "s", theta: 99 }]);
    const estimate = await computeFinalEstimateForRun(subject.id, RUN_ID);
    expect(estimate).toEqual({ theta: 4, information: 0, sem: null, answeredCount: 0 });
  });

  it("ignores answered assignments lacking a response or item", async () => {
    on("assignments", [
      { assignment_id: "x", item_version_id: "missing", ordinal: 1, state: "answered" },
      { assignment_id: "y", item_version_id: "item-1", ordinal: 2, state: "answered" },
    ]);
    on("responses", [{ assignment_id: "x", option_id: "a" }, { assignment_id: 3, option_id: "a" }]);
    const estimate = await computeFinalEstimateForRun(subject.id, RUN_ID);
    expect(estimate?.answeredCount).toBe(2);
    expect(estimate?.sem).not.toBeNull();
  });

  it("returns null when any read fails", async () => {
    on("items", () => {
      throw new Error("down");
    });
    await expect(computeFinalEstimateForRun(subject.id, RUN_ID)).resolves.toBeNull();
  });
});

describe("NeonCognitiveRunStore.start", () => {
  const store = new NeonCognitiveRunStore();

  it("requires operational storage consent", async () => {
    const input = { ...startInput(), consent: { operationalStorage: false as unknown as true, researchParticipation: false } };
    await expect(store.start(subject, input)).rejects.toThrow("operational storage consent is required");
    expect(hoisted.executed).toHaveLength(0);
  });

  it("creates the run transactionally and returns the first item", async () => {
    hoisted.getOwnedRun
      .mockResolvedValueOnce(ownedRun())
      .mockResolvedValueOnce(ownedRun());
    const snapshot = await store.start(subject, startInput({ ageYears: 30, genderBand: undefined }));

    expect(hoisted.transactionSizes[0]).toBe(5);
    expect(snapshot.status).toBe("active");
    expect(snapshot.nextItem?.assignmentId).toBe("assign-1");
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(sqlOf("markInvalid")).toHaveLength(0);
  });

  it("marks the run invalid and reports a configuration error when read-back fails", async () => {
    hoisted.getOwnedRun.mockResolvedValueOnce(null);
    await expect(store.start(subject, startInput())).rejects.toThrow("could not be read back");
    expect(sqlOf("markInvalid")).toHaveLength(1);
  });

  it("reports a disappearing run after assignment", async () => {
    hoisted.getOwnedRun.mockResolvedValueOnce(ownedRun()).mockResolvedValueOnce(null);
    await expect(store.start(subject, startInput())).rejects.toThrow("disappeared after assignment");
  });

  it("wraps unexpected failures and tolerates a failing invalidation", async () => {
    on("startTx", () => {
      throw new Error("insert failed");
    });
    on("markInvalid", () => {
      throw new Error("also failed");
    });
    await expect(store.start(subject, startInput())).rejects.toThrow("failed to initialize cognitive run: insert failed");
  });
});

describe("NeonCognitiveRunStore.submit", () => {
  const store = new NeonCognitiveRunStore();
  const input = { runId: RUN_ID, assignmentId: "assign-1", optionId: "a", elapsedMs: 1200 };

  it("returns invalid_run when the run is not owned", async () => {
    hoisted.getOwnedRun.mockResolvedValue(null);
    const result = await store.submit(subject, input);
    expect(result.error).toBe("invalid_run");
    expect(result.run.status).toBe("invalid");
    expect(hoisted.submitOwnedResponse).not.toHaveBeenCalled();
  });

  it("re-presents the current item and forwards the error when the submission is rejected", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ answeredCount: 1 }));
    hoisted.submitOwnedResponse.mockResolvedValue({ ok: false, error: "stale_assignment" });
    on("assignments", [{ assignment_id: "cur", item_version_id: "item-1", ordinal: 2, state: "current" }]);

    const result = await store.submit(subject, input);

    expect(result.error).toBe("stale_assignment");
    expect(result.run.nextItem?.assignmentId).toBe("cur");
    expect(result.run.answeredCount).toBe(1);
  });

  it("returns invalid_run when the run disappears after a rejected submission", async () => {
    hoisted.getOwnedRun.mockResolvedValueOnce(ownedRun()).mockResolvedValueOnce(null);
    hoisted.submitOwnedResponse.mockResolvedValue({ ok: false, error: "invalid_option" });
    const result = await store.submit(subject, input);
    expect(result.error).toBe("invalid_run");
  });

  it("advances to the next item after an accepted answer", async () => {
    hoisted.getOwnedRun
      .mockResolvedValueOnce(ownedRun())
      .mockResolvedValueOnce(ownedRun({ answeredCount: 1 }))
      .mockResolvedValueOnce(ownedRun({ answeredCount: 1 }));
    hoisted.submitOwnedResponse.mockResolvedValue({ ok: true, runId: RUN_ID, status: "active", nextAssignmentId: null });

    const result = await store.submit(subject, input);

    expect(result.error).toBeNull();
    expect(result.run.answeredCount).toBe(1);
    expect(result.run.nextItem).toMatchObject({ assignmentId: "assign-1" });
    expect(sqlOf("scoringUpdate")).toHaveLength(1);
  });

  it("returns invalid_run when the run vanishes after an accepted answer", async () => {
    hoisted.getOwnedRun.mockResolvedValueOnce(ownedRun()).mockResolvedValueOnce(null);
    hoisted.submitOwnedResponse.mockResolvedValue({ ok: true, runId: RUN_ID, status: "active", nextAssignmentId: null });
    const result = await store.submit(subject, input);
    expect(result.error).toBe("invalid_run");
  });

  it("finalizes scoring state when the last answer completes the run", async () => {
    const completed = ownedRun({ status: "completed", answeredCount: 20 });
    hoisted.getOwnedRun.mockResolvedValue(completed);
    hoisted.submitOwnedResponse.mockResolvedValue({ ok: true, runId: RUN_ID, status: "completed", nextAssignmentId: null });
    on("assignments", [{ assignment_id: "as-0", item_version_id: "item-0", ordinal: 1, state: "answered" }]);
    on("responses", [{ assignment_id: "as-0", option_id: "a" }]);

    const result = await store.submit(subject, input);

    expect(result.run.status).toBe("completed");
    expect(result.run.nextItem).toBeNull();
    const update = sqlOf("scoringUpdate");
    expect(update).toHaveLength(1);
    expect(update[0]?.values[3]).toBe(1);
    expect(update[0]?.values[4]).toBe(RUN_ID);
  });

  it("does not fail when finalizing scoring state cannot be written or computed", async () => {
    hoisted.getOwnedRun.mockResolvedValue(ownedRun({ status: "completed", answeredCount: 20 }));
    hoisted.submitOwnedResponse.mockResolvedValue({ ok: true, runId: RUN_ID, status: "completed", nextAssignmentId: null });
    on("scoringUpdate", () => {
      throw new Error("write failed");
    });
    await expect(store.submit(subject, input)).resolves.toMatchObject({ error: null });

    on("items", () => {
      throw new Error("read failed");
    });
    await expect(store.submit(subject, input)).resolves.toMatchObject({ error: null });
  });
});

describe("run entry points", () => {
  const snapshot: RunSnapshot = { runId: RUN_ID, status: "active", nextItem: null, answeredCount: 0, targetItemCount: 20 };

  function fakeStore(): CognitiveRunStore & { start: ReturnType<typeof vi.fn>; submit: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn> } {
    return {
      start: vi.fn().mockResolvedValue(snapshot),
      submit: vi.fn().mockResolvedValue({ run: snapshot, error: null }),
      resume: vi.fn().mockResolvedValue(snapshot),
    };
  }

  it("starts a run for an eligible device with a created-if-missing subject", async () => {
    const store = fakeStore();
    await expect(startCognitiveRun(startInput(), store)).resolves.toBe(snapshot);
    expect(hoisted.requireCognitiveSubject).toHaveBeenCalledWith({ createIfMissing: true });
    expect(store.start).toHaveBeenCalledWith(subject, expect.objectContaining({ capability }));
  });

  it("requires research consent when norming demographics are provided", async () => {
    const store = fakeStore();
    await expect(startCognitiveRun(startInput({ ageYears: 40 }), store)).rejects.toThrow("norming demographics require research consent");
    await expect(
      startCognitiveRun(startInput({ regionClass: "metro" as never, consent: { operationalStorage: true, researchParticipation: true } }), store),
    ).resolves.toBe(snapshot);
  });

  it("rejects ineligible devices with the eligibility reason", async () => {
    const store = fakeStore();
    const mobile = startInput({ capability: { ...capability, device: "mobile" } });
    await expect(startCognitiveRun(mobile, store)).rejects.toMatchObject({
      name: "CognitiveEligibilityError",
      reason: "unsupported_input_device",
    });
    await expect(startCognitiveRun(mobile, store)).rejects.toBeInstanceOf(CognitiveEligibilityError);
    expect(store.start).not.toHaveBeenCalled();
  });

  it("delegates submit and resume to the store with the resolved subject", async () => {
    const store = fakeStore();
    const submitInput = { runId: RUN_ID, assignmentId: "a", optionId: "b", elapsedMs: null };
    await submitCognitiveResponse(submitInput, store);
    expect(store.submit).toHaveBeenCalledWith(subject, submitInput);
    await expect(resumeCognitiveRun(RUN_ID, store)).resolves.toBe(snapshot);
    expect(store.resume).toHaveBeenCalledWith(subject, RUN_ID);
  });
});
