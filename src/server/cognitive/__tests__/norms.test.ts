import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const RUN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SUBJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const ownedRun = {
  id: RUN_ID,
  status: "completed",
  itemBankVersion: "pilot-v1",
  algorithmVersion: "cat-v1",
  blueprintVersion: "blueprint-v1",
  targetItemCount: 20,
  answeredCount: 20,
};

vi.mock("../repository", () => ({
  getOwnedRun: vi.fn(async () => ownedRun),
}));

vi.mock("../auth", () => ({
  requireCognitiveSubject: vi.fn(async () => ({ id: SUBJECT_ID, isAnonymous: true })),
}));

interface FinalEstimateFixture {
  readonly theta: number;
  readonly information: number;
  readonly sem: number | null;
  readonly answeredCount: number;
}

const computeFinalEstimateForRun = vi.fn(async (): Promise<FinalEstimateFixture | null> => null);
vi.mock("../runs", () => ({ computeFinalEstimateForRun }));

interface SqlFixture {
  readonly scoring?: readonly Record<string, unknown>[];
  readonly norm?: readonly Record<string, unknown>[];
  readonly domains?: readonly Record<string, unknown>[];
}

let fixture: SqlFixture = {};

vi.mock("@/lib/neon/server", () => ({
  createNeonSql: () => {
    function sql(strings: TemplateStringsArray) {
      return { text: strings.join("") };
    }
    sql.transaction = async (queries: ReadonlyArray<{ readonly text: string }>) => {
      const query = queries[1];
      if (query === undefined) return [null, []];
      if (query.text.includes("private_cognitive.scoring_state")) return [null, fixture.scoring ?? []];
      if (query.text.includes("private_cognitive.norm_releases")) return [null, fixture.norm ?? []];
      if (query.text.includes("private_cognitive.raw_responses")) return [null, fixture.domains ?? []];
      return [null, []];
    };
    return sql;
  },
  neonRows: (value: unknown) => (Array.isArray(value) ? value : []),
}));

const DOMAIN_ROWS = [
  { domain: "gf", answered: 4, correct: 3 },
  { domain: "gc", answered: 4, correct: 2 },
  { domain: "gv", answered: 4, correct: 4 },
  { domain: "gwm", answered: 4, correct: 1 },
  { domain: "gs", answered: 4, correct: 2 },
];

function approvedNormRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "norm-v1",
    status: "approved",
    target_population: "ko-adults-18-64",
    item_bank_version: ownedRun.itemBankVersion,
    algorithm_version: ownedRun.algorithmVersion,
    approved_at: "2026-08-29T00:00:00.000Z",
    norm_payload: {
      iqPointsPerTheta: 15,
      byAge: [
        { minimumAge: 18, maximumAge: 64, thetaToIq: [70, 85, 100, 115, 130], iqToPercentile: [2, 16, 50, 84, 98] },
      ],
    },
    ...overrides,
  };
}

// resolveScoreForRun is imported after the module mocks above are hoisted.
const { resolveScoreForRun } = await import("../norms");

describe("cognitive score resolution", () => {
  beforeEach(() => {
    fixture = {};
    computeFinalEstimateForRun.mockReset();
    computeFinalEstimateForRun.mockResolvedValue(null);
  });

  it("withholds a result when neither an approved norm nor scoring state is available", async () => {
    fixture = { scoring: [], norm: [], domains: DOMAIN_ROWS };
    await expect(resolveScoreForRun(RUN_ID)).resolves.toEqual({ status: "pilot_withheld", score: null });
  });

  it("returns a theoretical-prior estimate when scoring state is complete but no approved norm exists", async () => {
    fixture = {
      scoring: [{ theta: 1, standard_error: 0.3, answered_count: 20, age_years: null }],
      norm: [],
      domains: DOMAIN_ROWS,
    };
    const result = await resolveScoreForRun(RUN_ID);
    expect(result.status).toBe("estimated_scored");
    if (result.status !== "estimated_scored") throw new Error("unreachable");
    expect(result.score.fullScaleIq).toBe(115);
    expect(result.score.basis).toBe("theoretical-prior");
    expect(result.score.domains).toHaveLength(5);
    expect(computeFinalEstimateForRun).not.toHaveBeenCalled();
  });

  it("prefers the approved standardized norm over the theoretical estimate when both are available", async () => {
    fixture = {
      scoring: [{ theta: 0, standard_error: 0.3, answered_count: 20, age_years: 30 }],
      norm: [approvedNormRow()],
      domains: DOMAIN_ROWS,
    };
    const result = await resolveScoreForRun(RUN_ID);
    expect(result.status).toBe("standardized_scored");
    if (result.status !== "standardized_scored") throw new Error("unreachable");
    expect(result.score.fullScaleIq).toBe(100);
  });

  it("falls back to a recomputed estimate when scoring_state is stale", async () => {
    fixture = {
      scoring: [{ theta: 0, standard_error: null, answered_count: 19, age_years: null }],
      norm: [],
      domains: DOMAIN_ROWS,
    };
    computeFinalEstimateForRun.mockResolvedValue({ theta: 0.5, information: 25, sem: 0.2, answeredCount: 20 });
    const result = await resolveScoreForRun(RUN_ID);
    expect(result.status).toBe("estimated_scored");
    if (result.status !== "estimated_scored") throw new Error("unreachable");
    expect(result.score.fullScaleIq).toBe(108);
    expect(computeFinalEstimateForRun).toHaveBeenCalledWith(SUBJECT_ID, RUN_ID);
  });

  it("withholds a result when domain accuracy cannot be loaded", async () => {
    fixture = {
      scoring: [{ theta: 0, standard_error: 0.3, answered_count: 20, age_years: null }],
      norm: [],
      domains: [{ domain: "not-a-real-domain", answered: 4, correct: 2 }],
    };
    await expect(resolveScoreForRun(RUN_ID)).resolves.toEqual({ status: "pilot_withheld", score: null });
  });
});
