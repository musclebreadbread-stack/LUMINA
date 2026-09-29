import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const hoisted = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireCognitiveSubject: vi.fn(),
}));

vi.mock("@/lib/neon/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/neon/server")>("@/lib/neon/server");
  const sql = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join("?").replace(/\s+/g, " "), values }),
    { transaction: hoisted.transaction },
  );
  return { ...actual, createNeonSql: () => sql };
});
vi.mock("../auth", () => ({ requireCognitiveSubject: hoisted.requireCognitiveSubject }));

import { getOwnedRun, getPresentationForOwner, submitOwnedResponse } from "../repository";

const SUBJECT_ID = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "22222222-2222-4222-8222-222222222222";

const runRow = {
  id: RUN_ID,
  status: "active",
  item_bank_version: "ib",
  algorithm_version: "alg",
  blueprint_version: "bp",
  target_item_count: 20,
  answered_count: 3,
};

const textPresentation = {
  stimulus: { kind: "text", textKo: "k", textEn: "e" },
  options: [
    { id: "a", labelKo: "A", labelEn: "A" },
    { id: "b", labelKo: "B", labelEn: "B" },
  ],
};

function assignmentRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { assignment_id: "as-1", ordinal: 2, domain: "gv", presentation: textPresentation, ...overrides };
}

beforeEach(() => {
  hoisted.transaction.mockReset();
  hoisted.requireCognitiveSubject.mockReset();
  hoisted.requireCognitiveSubject.mockResolvedValue({ id: SUBJECT_ID, isAnonymous: true });
});

describe("getOwnedRun", () => {
  it("scopes the query to the subject and maps the row", async () => {
    hoisted.transaction.mockResolvedValue([[], [runRow]]);

    const run = await getOwnedRun(RUN_ID);

    expect(run).toEqual({
      id: RUN_ID,
      status: "active",
      itemBankVersion: "ib",
      algorithmVersion: "alg",
      blueprintVersion: "bp",
      targetItemCount: 20,
      answeredCount: 3,
    });
    const queries = hoisted.transaction.mock.calls[0]?.[0] as { values: unknown[] }[];
    expect(queries[0]?.values).toEqual([SUBJECT_ID]);
    expect(queries[1]?.values).toEqual([RUN_ID, SUBJECT_ID]);
  });

  it("returns null when no owned run exists", async () => {
    hoisted.transaction.mockResolvedValue([[], []]);
    await expect(getOwnedRun(RUN_ID)).resolves.toBeNull();
  });

  it.each([
    ["unknown status", { status: "weird" }],
    ["non-string id", { id: 1 }],
    ["non-numeric count", { answered_count: "3" }],
    ["missing version", { item_bank_version: undefined }],
  ])("wraps a malformed row (%s)", async (_label, patch) => {
    hoisted.transaction.mockResolvedValue([[], [{ ...runRow, ...patch }]]);
    await expect(getOwnedRun(RUN_ID)).rejects.toThrow("failed to load cognitive run: invalid cognitive run row");
  });

  it.each(["paused", "completed", "invalid"])("accepts status %s", async (status) => {
    hoisted.transaction.mockResolvedValue([[], [{ ...runRow, status }]]);
    await expect(getOwnedRun(RUN_ID)).resolves.toMatchObject({ status });
  });

  it("wraps database failures, including non-Error throwables", async () => {
    hoisted.transaction.mockRejectedValueOnce(new Error("db down"));
    await expect(getOwnedRun(RUN_ID)).rejects.toThrow("failed to load cognitive run: db down");
    hoisted.transaction.mockRejectedValueOnce("oops");
    await expect(getOwnedRun(RUN_ID)).rejects.toThrow("unknown Neon database error");
  });
});

describe("getPresentationForOwner", () => {
  function mockRunThen(assignment: Record<string, unknown> | null): void {
    hoisted.transaction
      .mockResolvedValueOnce([[], [runRow]])
      .mockResolvedValueOnce([[], assignment === null ? [] : [assignment]]);
  }

  it("returns null when the run is not owned", async () => {
    hoisted.transaction.mockResolvedValueOnce([[], []]);
    await expect(getPresentationForOwner(RUN_ID, "as-1")).resolves.toBeNull();
    expect(hoisted.transaction).toHaveBeenCalledTimes(1);
  });

  it("returns the public presentation without private fields", async () => {
    mockRunThen(assignmentRow());
    const presentation = await getPresentationForOwner(RUN_ID, "as-1");
    expect(presentation).toMatchObject({ assignmentId: "as-1", ordinal: 2, domain: "gv" });
    expect(presentation?.options.map((option) => option.id)).toEqual(["a", "b"]);
    expect(JSON.stringify(presentation)).not.toContain("private");
    expect(presentation).not.toHaveProperty("correctOptionId");
  });

  it.each([
    ["no row", null],
    ["bad assignment id", assignmentRow({ assignment_id: 1 })],
    ["bad ordinal", assignmentRow({ ordinal: "2" })],
    ["unknown domain", assignmentRow({ domain: "zz" })],
    ["presentation not an object", assignmentRow({ presentation: [] })],
    ["unknown stimulus kind", assignmentRow({ presentation: { ...textPresentation, stimulus: { kind: "audio" } } })],
    ["text stimulus missing text", assignmentRow({ presentation: { ...textPresentation, stimulus: { kind: "text", textKo: "k" } } })],
    ["matrix with wrong cell count", assignmentRow({ presentation: { ...textPresentation, stimulus: { kind: "matrix", cells: [1] } } })],
    ["spatial without cubes", assignmentRow({ presentation: { ...textPresentation, stimulus: { kind: "spatial", cubes: [] } } })],
    ["options not an array", assignmentRow({ presentation: { ...textPresentation, options: "x" } })],
    ["option not an object", assignmentRow({ presentation: { ...textPresentation, options: [1] } })],
    ["option missing label", assignmentRow({ presentation: { ...textPresentation, options: [{ id: "a", labelKo: "A" }] } })],
  ])("returns null for %s", async (_label, row) => {
    mockRunThen(row);
    await expect(getPresentationForOwner(RUN_ID, "as-1")).resolves.toBeNull();
  });

  it("accepts matrix and spatial stimuli", async () => {
    mockRunThen(assignmentRow({ presentation: { ...textPresentation, stimulus: { kind: "matrix", cells: new Array(9).fill({}) } } }));
    await expect(getPresentationForOwner(RUN_ID, "as-1")).resolves.toMatchObject({ stimulus: { kind: "matrix" } });
    mockRunThen(assignmentRow({ presentation: { ...textPresentation, stimulus: { kind: "spatial", cubes: [{ x: 0, y: 0, z: 0 }] } } }));
    await expect(getPresentationForOwner(RUN_ID, "as-1")).resolves.toMatchObject({ stimulus: { kind: "spatial" } });
  });

  it("wraps assignment query failures", async () => {
    hoisted.transaction.mockResolvedValueOnce([[], [runRow]]).mockRejectedValueOnce(new Error("boom"));
    await expect(getPresentationForOwner(RUN_ID, "as-1")).rejects.toThrow("failed to load cognitive assignment: boom");
  });
});

describe("submitOwnedResponse", () => {
  const input = { runId: RUN_ID, assignmentId: "as-1", optionId: "a", elapsedMs: 900 };

  it("returns invalid_run when the run is not owned", async () => {
    hoisted.transaction.mockResolvedValueOnce([[], []]);
    await expect(submitOwnedResponse(input)).resolves.toEqual({ ok: false, error: "invalid_run" });
  });

  function mockRunThen(result: unknown): void {
    hoisted.transaction.mockResolvedValueOnce([[], [runRow]]);
    if (result instanceof Error || typeof result === "string") hoisted.transaction.mockRejectedValueOnce(result);
    else hoisted.transaction.mockResolvedValueOnce([[], result]);
  }

  it("passes the response to the owner-bound SQL function", async () => {
    mockRunThen([{ returned_run_id: RUN_ID, returned_status: "active", next_assignment_id: "as-2" }]);
    await expect(submitOwnedResponse(input)).resolves.toEqual({ ok: true, runId: RUN_ID, status: "active", nextAssignmentId: "as-2" });
    const queries = hoisted.transaction.mock.calls[1]?.[0] as { values: unknown[] }[];
    expect(queries[1]?.values).toEqual([RUN_ID, "as-1", "a", 900]);
  });

  it("reports completion and tolerates absent or non-string next ids", async () => {
    mockRunThen([{ returned_run_id: RUN_ID, returned_status: "completed", next_assignment_id: null }]);
    await expect(submitOwnedResponse(input)).resolves.toMatchObject({ status: "completed", nextAssignmentId: null });
    mockRunThen([{ returned_run_id: RUN_ID, returned_status: "active" }]);
    await expect(submitOwnedResponse(input)).resolves.toMatchObject({ nextAssignmentId: null });
    mockRunThen([{ returned_run_id: RUN_ID, returned_status: "active", next_assignment_id: 7 }]);
    await expect(submitOwnedResponse(input)).resolves.toMatchObject({ nextAssignmentId: null });
  });

  it("treats an empty or malformed result as a stale assignment", async () => {
    mockRunThen([]);
    await expect(submitOwnedResponse(input)).resolves.toEqual({ ok: false, error: "stale_assignment" });
    mockRunThen([{ returned_run_id: 1, returned_status: "active" }]);
    await expect(submitOwnedResponse(input)).resolves.toEqual({ ok: false, error: "stale_assignment" });
  });

  it.each([
    ["Assignment is STALE", "stale_assignment"],
    ["already answered", "stale_assignment"],
    ["invalid cognitive option x", "invalid_option"],
    ["Invalid option", "invalid_option"],
  ])("maps the database error %j to %s", async (message, error) => {
    mockRunThen(new Error(message));
    await expect(submitOwnedResponse(input)).resolves.toEqual({ ok: false, error });
  });

  it("rethrows unexpected database errors", async () => {
    mockRunThen(new Error("connection reset"));
    await expect(submitOwnedResponse(input)).rejects.toThrow("failed to submit cognitive response: connection reset");
  });
});
