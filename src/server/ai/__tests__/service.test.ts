import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const db = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../database", () => ({
  withAITransaction: async (fn: (client: { query: typeof db.query }) => Promise<unknown>) => fn({ query: db.query }),
}));

import {
  AIQuotaError,
  claimYearForecastNarrative,
  completeYearForecastNarrative,
  enqueueYearForecastNarrative,
  getAIUsageCostSummary,
  getOwnYearForecastNarrative,
  listYearForecastNarrativesForSweep,
  markYearForecastNarrativeFallback,
  recordAIBudgetUsage,
  releaseAIBudgetReservation,
  reserveAIDailyBudget,
} from "../service";
import { narrativeSectionIds, type AIFacts, type NarrativeJob } from "../types";

const HMAC_KEY = "k".repeat(32);

const FACTS: AIFacts = ["a", "b", "c", "d"].map((id) => ({
  id: `fact.${id}`,
  lane: "annual" as const,
  tier: "core" as const,
  value: "sample value",
  evidenceRef: "annual-pillar" as const,
}));

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const OUTPUT = {
  sections: narrativeSectionIds.map((id) => ({
    id,
    paragraphs: (id === "monthly" ? MONTHS : [1]).map(() => ({
      text: "A calm and steady paragraph for the period ahead.",
      citedFactIds: ["fact.a"],
    })),
  })),
};

type Rows = { rows: unknown[]; rowCount?: number };
type Handler = [needle: string, result: Rows | (() => Rows)];

/** Routes fake SQL by substring; the first matching handler wins. */
function route(...handlers: Handler[]) {
  db.query.mockImplementation(async (sql: string) => {
    for (const [needle, result] of handlers) {
      if (sql.includes(needle)) return typeof result === "function" ? result() : result;
    }
    return { rows: [], rowCount: 0 };
  });
}

function sqlCalls(needle: string) {
  return db.query.mock.calls.filter((call) => (call[0] as string).includes(needle));
}

beforeEach(() => {
  db.query.mockReset();
  vi.stubEnv("AI_USER_REF_HMAC_KEY", HMAC_KEY);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2027-03-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("AIQuotaError", () => {
  it("exposes its reason", () => {
    const error = new AIQuotaError("daily_limit");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AIQuotaError");
    expect(error.reason).toBe("daily_limit");
    expect(error.message).toBe("daily_limit");
  });
});

describe("enqueueYearForecastNarrative", () => {
  const input = { userId: "user-1", entitlementId: "ent-1", locale: "ko" as const, facts: FACTS };

  it("rejects invalid facts before touching the database", async () => {
    await expect(enqueueYearForecastNarrative({ ...input, facts: FACTS.slice(0, 2) })).rejects.toThrow();
    expect(db.query).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["too short", "short"],
    ["containing a newline", `${"k".repeat(40)}\n`],
  ])("throws when the HMAC key is %s", async (_label, key) => {
    if (key === undefined) vi.stubEnv("AI_USER_REF_HMAC_KEY", "");
    else vi.stubEnv("AI_USER_REF_HMAC_KEY", key);
    await expect(enqueueYearForecastNarrative(input)).rejects.toThrow("AI_USER_REF_HMAC_KEY is not configured");
    expect(db.query).not.toHaveBeenCalled();
  });

  it("returns the existing narrative for the same entitlement and facts", async () => {
    route(["from ai.user_narratives\n        where entitlement_id = $1 and cache_key", { rows: [{ id: "old", status: "queued" }] }]);
    await expect(enqueueYearForecastNarrative(input)).resolves.toEqual({ id: "old", status: "queued" });
    expect(sqlCalls("insert into ai.user_narratives")).toHaveLength(0);
    expect(sqlCalls("pg_advisory_xact_lock")[0]![1]).toEqual(["ent-1"]);
  });

  it("queues a new narrative and reserves day and month quota on a cache miss", async () => {
    route(
      ["select count(*)", { rows: [{ count: 1 }] }],
      ["ai.quota_counters", { rows: [{ user_id: "user-1" }], rowCount: 1 }],
      ["insert into ai.user_narratives", { rows: [{ id: "new", status: "queued" }] }],
    );
    await expect(enqueueYearForecastNarrative(input)).resolves.toEqual({ id: "new", status: "queued" });

    const quotaCalls = sqlCalls("ai.quota_counters");
    expect(quotaCalls.map((c) => c[1])).toEqual([
      ["user-1", "day", "2027-03-15", 3],
      ["user-1", "month", "2027-03-01", 10],
    ]);
    const insert = sqlCalls("insert into ai.user_narratives")[0]![1] as unknown[];
    expect(insert[1]).toBe("user-1");
    expect(Buffer.isBuffer(insert[2])).toBe(true);
    expect(insert[3]).toBe("ent-1");
    expect(insert[4]).toBe("saju-2027");
    expect(insert[7]).toBe("ko");
    expect(JSON.parse(insert[10] as string)).toEqual(FACTS);
    expect(insert[11]).toBe("queued");
    expect(insert[12]).toBeNull();
  });

  it("produces a cache key independent of fact order", async () => {
    route(
      ["select count(*)", { rows: [{ count: 0 }] }],
      ["ai.quota_counters", { rows: [{}], rowCount: 1 }],
      ["insert into ai.user_narratives", { rows: [{ id: "n", status: "queued" }] }],
    );
    await enqueueYearForecastNarrative(input);
    await enqueueYearForecastNarrative({ ...input, facts: [...FACTS].reverse() });
    const [first, second] = sqlCalls("insert into ai.user_narratives");
    expect((first![1] as Buffer[])[5]!.equals((second![1] as Buffer[])[5]!)).toBe(true);
  });

  it("serves a valid cache hit as succeeded without consuming quota", async () => {
    route(
      ["from ai.narrative_cache", { rows: [{ payload: OUTPUT }] }],
      ["insert into ai.user_narratives", { rows: [{ id: "hit", status: "succeeded" }] }],
    );
    await expect(enqueueYearForecastNarrative(input)).resolves.toEqual({ id: "hit", status: "succeeded" });
    expect(sqlCalls("ai.quota_counters")).toHaveLength(0);
    expect(sqlCalls("select count(*)")).toHaveLength(0);
    const insert = sqlCalls("insert into ai.user_narratives")[0]![1] as unknown[];
    expect(insert[11]).toBe("succeeded");
    expect(JSON.parse(insert[12] as string)).toEqual(OUTPUT);
  });

  it("ignores an invalid cached payload and enforces quotas", async () => {
    route(
      ["from ai.narrative_cache", { rows: [{ payload: { sections: [] } }] }],
      ["select count(*)", { rows: [{ count: 3 }] }],
    );
    await expect(enqueueYearForecastNarrative(input)).rejects.toMatchObject({ reason: "entitlement_limit" });
  });

  it("throws entitlement_limit at three prior generations", async () => {
    route(["select count(*)", { rows: [{ count: 3 }] }]);
    await expect(enqueueYearForecastNarrative(input)).rejects.toBeInstanceOf(AIQuotaError);
    expect(sqlCalls("ai.quota_counters")).toHaveLength(0);
  });

  it("throws daily_limit when the day counter is exhausted", async () => {
    route(
      ["select count(*)", { rows: [{ count: 0 }] }],
      ["ai.quota_counters", { rows: [], rowCount: 0 }],
    );
    await expect(enqueueYearForecastNarrative(input)).rejects.toMatchObject({ reason: "daily_limit" });
    expect(sqlCalls("ai.quota_counters")).toHaveLength(1);
  });

  it("throws monthly_limit when only the month counter is exhausted", async () => {
    let quotaCall = 0;
    route(
      ["select count(*)", { rows: [{ count: 0 }] }],
      ["ai.quota_counters", () => (++quotaCall === 1 ? { rows: [{}], rowCount: 1 } : { rows: [], rowCount: 0 })],
    );
    await expect(enqueueYearForecastNarrative(input)).rejects.toMatchObject({ reason: "monthly_limit" });
  });

  it("treats a missing count row as zero prior generations", async () => {
    route(
      ["ai.quota_counters", { rows: [{}], rowCount: 1 }],
      ["insert into ai.user_narratives", { rows: [{ id: "n", status: "queued" }] }],
    );
    await expect(enqueueYearForecastNarrative(input)).resolves.toMatchObject({ id: "n" });
  });

  it("throws if the insert returns no row", async () => {
    route(["ai.quota_counters", { rows: [{}], rowCount: 1 }]);
    await expect(enqueueYearForecastNarrative(input)).rejects.toThrow("AI narrative was not created");
  });
});

describe("getOwnYearForecastNarrative", () => {
  it("returns null when the narrative is not found for the user", async () => {
    route();
    await expect(getOwnYearForecastNarrative("u", "n")).resolves.toBeNull();
    expect(db.query.mock.calls[0]![1]).toEqual(["n", "u"]);
  });

  it("returns the parsed output for a succeeded narrative", async () => {
    route(["from ai.user_narratives", { rows: [{ status: "succeeded", payload: OUTPUT }] }]);
    await expect(getOwnYearForecastNarrative("u", "n")).resolves.toEqual({ status: "succeeded", output: OUTPUT });
  });

  it("degrades a succeeded narrative with a corrupt payload to fallback", async () => {
    route(["from ai.user_narratives", { rows: [{ status: "succeeded", payload: { bad: true } }] }]);
    await expect(getOwnYearForecastNarrative("u", "n")).resolves.toEqual({ status: "fallback", output: null });
  });

  it.each(["queued", "processing", "fallback"] as const)("passes through %s status without output", async (status) => {
    route(["from ai.user_narratives", { rows: [{ status, payload: OUTPUT }] }]);
    await expect(getOwnYearForecastNarrative("u", "n")).resolves.toEqual({ status, output: null });
  });
});

describe("claimYearForecastNarrative", () => {
  const row = {
    id: "n1",
    user_id: "u1",
    user_ref_hmac: Buffer.from("ref"),
    cache_key: Buffer.from("key"),
    fact_sheet_version: "fv",
    locale: "ko",
    prompt_version: "pv",
    schema_version: "sv",
    tier: "report",
    facts_json: FACTS,
    attempt_count: 1,
  };

  it("returns null when nothing is claimable", async () => {
    route();
    await expect(claimYearForecastNarrative()).resolves.toBeNull();
    expect(db.query.mock.calls[0]![1]).toEqual([null]);
  });

  it("maps a claimed row into a job", async () => {
    route(["with candidate", { rows: [row] }]);
    const job = await claimYearForecastNarrative("n1");
    expect(db.query.mock.calls[0]![1]).toEqual(["n1"]);
    expect(job).toEqual({
      id: "n1",
      userId: "u1",
      userRefHmac: row.user_ref_hmac,
      cacheKey: row.cache_key,
      factSheetVersion: "fv",
      locale: "ko",
      promptVersion: "pv",
      schemaVersion: "sv",
      tier: "report",
      facts: FACTS,
      attemptCount: 1,
    });
  });

  it("marks the row fallback and returns null when stored facts are invalid", async () => {
    route(["with candidate", { rows: [{ ...row, facts_json: [{ nope: 1 }] }] }]);
    await expect(claimYearForecastNarrative("n1")).resolves.toBeNull();
    const update = sqlCalls("set status = 'fallback'")[0]!;
    expect(update[1]).toEqual(["n1"]);
  });
});

describe("listYearForecastNarrativesForSweep", () => {
  it("expires exhausted rows then lists ids", async () => {
    route(["select id::text", { rows: [{ id: "a" }, { id: "b" }] }]);
    await expect(listYearForecastNarrativesForSweep(4)).resolves.toEqual(["a", "b"]);
    expect(db.query.mock.calls[0]![0]).toContain("attempt_count >= 3");
    expect(db.query.mock.calls[1]![1]).toEqual([4]);
  });

  it.each([
    [0, 1],
    [-5, 1],
    [100, 10],
    [3.9, 3],
  ])("clamps limit %s to %s", async (limit, expected) => {
    route();
    await listYearForecastNarrativesForSweep(limit);
    expect(db.query.mock.calls[1]![1]).toEqual([expected]);
  });

  it("defaults to a limit of 2", async () => {
    route();
    await listYearForecastNarrativesForSweep();
    expect(db.query.mock.calls[1]![1]).toEqual([2]);
  });
});

describe("markYearForecastNarrativeFallback", () => {
  it("updates the processing row to fallback", async () => {
    route();
    await markYearForecastNarrativeFallback("n1");
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0]![0]).toContain("status = 'processing'");
    expect(db.query.mock.calls[0]![1]).toEqual(["n1"]);
  });
});

describe("completeYearForecastNarrative", () => {
  const job = {
    id: "n1",
    cacheKey: Buffer.from("key"),
    factSheetVersion: "fv",
    locale: "ko",
    promptVersion: "pv",
    schemaVersion: "sv",
    tier: "report",
  } as unknown as NarrativeJob;

  it("upserts the cache and stores the canonical cached payload on the narrative", async () => {
    const canonical = { sections: OUTPUT.sections.map((s) => ({ ...s })) };
    route(["select payload from ai.narrative_cache", { rows: [{ payload: canonical }] }]);
    await completeYearForecastNarrative(job, OUTPUT);

    const upsert = sqlCalls("insert into ai.narrative_cache")[0]![1] as unknown[];
    expect(upsert.slice(0, 7)).toEqual([job.cacheKey, "saju-2027", "fv", "ko", "pv", "sv", "report"]);
    expect(JSON.parse(upsert[7] as string)).toEqual(OUTPUT);
    const update = sqlCalls("set status = 'succeeded'")[0]![1] as unknown[];
    expect(update[0]).toBe("n1");
    expect(JSON.parse(update[1] as string)).toEqual(canonical);
  });

  it("throws and does not update when the cached payload is invalid", async () => {
    route(["select payload from ai.narrative_cache", { rows: [{ payload: { sections: [] } }] }]);
    await expect(completeYearForecastNarrative(job, OUTPUT)).rejects.toThrow("Canonical AI narrative cache is invalid");
    expect(sqlCalls("set status = 'succeeded'")).toHaveLength(0);
  });

  it("throws when no cached row exists", async () => {
    route();
    await expect(completeYearForecastNarrative(job, OUTPUT)).rejects.toThrow("Canonical AI narrative cache is invalid");
  });
});

describe("reserveAIDailyBudget", () => {
  const input = { reservationId: "r1", narrativeId: "n1", requestLimitMicrousd: 100, dailyBudgetMicrousd: 1_000 };

  it("reserves budget when within the limit", async () => {
    route(["from ai.daily_budgets where budget_date", {
      rows: [{ budget_limit_microusd: "1000", spent_microusd: "400", reserved_microusd: "500" }],
    }]);
    await expect(reserveAIDailyBudget(input)).resolves.toBe(true);
    expect(sqlCalls("insert into ai.daily_budgets")[0]![1]).toEqual(["2027-03-15", 1_000]);
    expect(sqlCalls("insert into ai.budget_reservations")[0]![1]).toEqual(["r1", "n1", "2027-03-15", 100]);
    expect(sqlCalls("reserved_microusd = reserved_microusd + $2")[0]![1]).toEqual(["2027-03-15", 100]);
  });

  it("refuses when spent + reserved + request exceeds the limit", async () => {
    route(["from ai.daily_budgets where budget_date", {
      rows: [{ budget_limit_microusd: "1000", spent_microusd: "400", reserved_microusd: "501" }],
    }]);
    await expect(reserveAIDailyBudget(input)).resolves.toBe(false);
    expect(sqlCalls("insert into ai.budget_reservations")).toHaveLength(0);
  });

  it("refuses when the budget row is missing", async () => {
    route();
    await expect(reserveAIDailyBudget(input)).resolves.toBe(false);
  });
});

describe("recordAIBudgetUsage / releaseAIBudgetReservation", () => {
  const usage = {
    narrativeId: "n1",
    requestId: "req",
    userRefHmac: Buffer.from("ref"),
    tier: "report" as const,
    model: "m".repeat(300),
    inputTokens: 5_000_000_000.7,
    outputTokens: -3,
    costMicrousd: 42,
    costIsEstimate: true,
  };
  const reservationRow = { rows: [{ budget_date: "2027-03-15", amount_microusd: "100" }] };

  it("settles the reservation, sanitizes and logs usage, then deletes the reservation", async () => {
    route(["from ai.budget_reservations where id", reservationRow]);
    await recordAIBudgetUsage({ reservationId: "r1", usage });

    expect(sqlCalls("update ai.daily_budgets")[0]![1]).toEqual(["2027-03-15", "100", 42]);
    const ledger = sqlCalls("insert into ai.usage_ledger")[0]![1] as unknown[];
    expect(ledger[0]).toBe("req");
    expect((ledger[4] as string).length).toBe(200);
    expect(ledger[5]).toBe(2_147_483_647);
    expect(ledger[6]).toBe(0);
    expect(ledger[7]).toBe(42);
    expect(ledger[8]).toBe(true);
    expect(sqlCalls("delete from ai.budget_reservations where id")[0]![1]).toEqual(["r1"]);
  });

  it("clamps a negative cost to zero in the ledger", async () => {
    route(["from ai.budget_reservations where id", reservationRow]);
    await recordAIBudgetUsage({ reservationId: "r1", usage: { ...usage, costMicrousd: -9 } });
    expect((sqlCalls("insert into ai.usage_ledger")[0]![1] as unknown[])[7]).toBe(0);
  });

  it("is a no-op when the reservation no longer exists", async () => {
    route();
    await recordAIBudgetUsage({ reservationId: "gone", usage });
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("releases a reservation without logging usage or spending", async () => {
    route(["from ai.budget_reservations where id", reservationRow]);
    await releaseAIBudgetReservation("r1");
    expect(sqlCalls("update ai.daily_budgets")[0]![1]).toEqual(["2027-03-15", "100", 0]);
    expect(sqlCalls("insert into ai.usage_ledger")).toHaveLength(0);
    expect(sqlCalls("delete from ai.budget_reservations where id")).toHaveLength(1);
  });
});

describe("getAIUsageCostSummary", () => {
  it("returns the aggregated summary", async () => {
    route(["from ai.usage_ledger", { rows: [{ cost_microusd: "1234", estimated_requests: 2, requests: 5 }] }]);
    await expect(getAIUsageCostSummary(7)).resolves.toEqual({ costMicrousd: 1234, estimatedRequests: 2, requests: 5 });
    expect(db.query.mock.calls[0]![1]).toEqual([7]);
  });

  it.each([
    [0, 1],
    [1000, 90],
    [12.9, 12],
  ])("clamps days %s to %s", async (days, expected) => {
    route();
    await getAIUsageCostSummary(days);
    expect(db.query.mock.calls[0]![1]).toEqual([expected]);
  });

  it("defaults to 30 days and zeroes when no row is returned", async () => {
    route();
    await expect(getAIUsageCostSummary()).resolves.toEqual({ costMicrousd: 0, estimatedRequests: 0, requests: 0 });
    expect(db.query.mock.calls[0]![1]).toEqual([30]);
  });

  it.each(["-5", "abc", "1e400"])("sanitizes an unsafe cost value %s to zero", async (cost) => {
    route(["from ai.usage_ledger", { rows: [{ cost_microusd: cost, estimated_requests: 0, requests: 1 }] }]);
    await expect(getAIUsageCostSummary()).resolves.toMatchObject({ costMicrousd: 0, requests: 1 });
  });
});
