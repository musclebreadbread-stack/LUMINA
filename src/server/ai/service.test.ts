import type { PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIFacts } from "./types";

type AIQueryResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  rowCount: number | null;
}>;

const { aiQueryMock, withAITransactionMock } = vi.hoisted(() => ({
  aiQueryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<AIQueryResult>>(),
  withAITransactionMock: vi.fn<
    <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>
  >(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./database", () => ({ withAITransaction: withAITransactionMock }));

import {
  enqueueYearForecastNarrative,
  getAIUsageCostSummary,
  recordAIBudgetUsage,
  releaseAIBudgetReservation,
  reserveAIDailyBudget,
} from "./service";
import { withAITransaction } from "./database";

const aiClient = { query: aiQueryMock } as unknown as PoolClient;
const validFacts: AIFacts = [
  { id: "annual.pillar", lane: "annual", tier: "core", value: "wood", evidenceRef: "annual-pillar" },
  { id: "work.ten-gods", lane: "work", tier: "supporting", value: "fire", evidenceRef: "annual-ten-gods" },
  { id: "growth.stage", lane: "growth", tier: "supporting", value: "earth", evidenceRef: "annual-stage" },
  { id: "monthly.pillar", lane: "monthly", tier: "core", value: "water", evidenceRef: "monthly-pillar" },
];

function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

function statements(): string[] {
  return aiQueryMock.mock.calls.map(([statement]) => normalize(statement));
}

function callParameters(prefix: string): readonly unknown[] | undefined {
  return aiQueryMock.mock.calls.find(([statement]) => normalize(statement).startsWith(prefix))?.[1];
}

beforeEach(() => {
  aiQueryMock.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
  vi.mocked(withAITransaction).mockReset().mockImplementation(async (operation) => operation(aiClient));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI generation cost controls", () => {
  it("queues an uncached narrative only after reserving the user's daily and monthly quotas", async () => {
    vi.stubEnv("AI_USER_REF_HMAC_KEY", "synthetic-ai-reference-key-with-more-than-32-bytes");
    aiQueryMock.mockImplementation(async (statement, parameters) => {
      const sql = normalize(statement);
      if (sql.startsWith("select id::text, status from ai.user_narratives")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select payload from ai.narrative_cache")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select count(*)::int as count from ai.user_narratives")) return { rows: [{ count: 0 }], rowCount: 1 };
      if (sql.startsWith("insert into ai.quota_counters")) return { rows: [{ user_id: parameters?.[0] }], rowCount: 1 };
      if (sql.startsWith("insert into ai.user_narratives")) return { rows: [{ id: parameters?.[0], status: "queued" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    await expect(enqueueYearForecastNarrative({
      userId: "member-ai-1",
      entitlementId: "entitlement-ai-1",
      locale: "ko",
      facts: validFacts,
    })).resolves.toEqual({ id: expect.any(String), status: "queued" });

    expect(callParameters("select pg_advisory_xact_lock")).toEqual(["entitlement-ai-1"]);
    const quotaCalls = aiQueryMock.mock.calls.filter(([statement]) => normalize(statement).startsWith("insert into ai.quota_counters"));
    expect(quotaCalls.map(([, parameters]) => parameters?.[1])).toEqual(["day", "month"]);
    expect(quotaCalls.map(([, parameters]) => parameters?.[3])).toEqual([3, 10]);
    const narrativeParameters = callParameters("insert into ai.user_narratives");
    expect(narrativeParameters?.[1]).toBe("member-ai-1");
    expect(narrativeParameters?.[2]).toBeInstanceOf(Buffer);
    expect(narrativeParameters?.[2]).not.toBe("member-ai-1");
    expect(narrativeParameters?.[10]).toBe(JSON.stringify(validFacts));
    expect(narrativeParameters?.[11]).toBe("queued");
  });

  it("returns an existing entitlement narrative without reserving quota again", async () => {
    vi.stubEnv("AI_USER_REF_HMAC_KEY", "synthetic-ai-reference-key-with-more-than-32-bytes");
    let otherEntitlementCacheKey: Buffer | null = null;
    aiQueryMock.mockImplementation(async (statement, parameters) => {
      const sql = normalize(statement);
      if (sql.startsWith("select id::text, status from ai.user_narratives")) {
        const entitlementId = parameters?.[0];
        const key = parameters?.[1];
        if (entitlementId === "entitlement-ai-other" && Buffer.isBuffer(key)) {
          otherEntitlementCacheKey = key;
          return { rows: [], rowCount: 0 };
        }
        if (entitlementId === "entitlement-ai-2" && Buffer.isBuffer(key) && otherEntitlementCacheKey?.equals(key)) {
          return { rows: [{ id: "narrative-existing", status: "queued" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith("select payload from ai.narrative_cache")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select count(*)::int as count from ai.user_narratives")) return { rows: [{ count: 0 }], rowCount: 1 };
      if (sql.startsWith("insert into ai.quota_counters")) return { rows: [{ user_id: parameters?.[0] }], rowCount: 1 };
      if (sql.startsWith("insert into ai.user_narratives")) return { rows: [{ id: parameters?.[0], status: "queued" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    await expect(enqueueYearForecastNarrative({
      userId: "member-ai-2",
      entitlementId: "entitlement-ai-other",
      locale: "ko",
      facts: validFacts,
    })).resolves.toEqual({ id: expect.any(String), status: "queued" });

    await expect(enqueueYearForecastNarrative({
      userId: "member-ai-2",
      entitlementId: "entitlement-ai-2",
      locale: "ko",
      facts: validFacts,
    })).resolves.toEqual({ id: "narrative-existing", status: "queued" });

    const lookups = aiQueryMock.mock.calls.filter(([statement]) => normalize(statement).startsWith("select id::text, status from ai.user_narratives"));
    expect(lookups.map(([, parameters]) => parameters?.[0])).toEqual(["entitlement-ai-other", "entitlement-ai-2"]);
    expect(lookups.every(([statement]) => normalize(statement).includes("where entitlement_id = $1 and cache_key = $2"))).toBe(true);
    const otherEntitlementKey = lookups[0]?.[1]?.[1];
    const existingEntitlementKey = lookups[1]?.[1]?.[1];
    expect(Buffer.isBuffer(otherEntitlementKey)).toBe(true);
    expect(Buffer.isBuffer(existingEntitlementKey)).toBe(true);
    if (Buffer.isBuffer(otherEntitlementKey) && Buffer.isBuffer(existingEntitlementKey)) {
      expect(existingEntitlementKey.equals(otherEntitlementKey)).toBe(true);
    }
    expect(callParameters("insert into ai.user_narratives")?.[3]).toBe("entitlement-ai-other");
    expect(statements().filter((statement) => statement.startsWith("insert into ai.quota_counters"))).toHaveLength(2);
  });

  it("rejects an entitlement at its generation cap before consuming user quota", async () => {
    vi.stubEnv("AI_USER_REF_HMAC_KEY", "synthetic-ai-reference-key-with-more-than-32-bytes");
    aiQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select id::text, status from ai.user_narratives")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select payload from ai.narrative_cache")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select count(*)::int as count from ai.user_narratives")) return { rows: [{ count: 3 }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    await expect(enqueueYearForecastNarrative({
      userId: "member-ai-3",
      entitlementId: "entitlement-ai-3",
      locale: "ko",
      facts: validFacts,
    })).rejects.toMatchObject({ name: "AIQuotaError", reason: "entitlement_limit" });

    expect(statements().some((statement) => statement.startsWith("insert into ai.quota_counters"))).toBe(false);
    expect(statements().some((statement) => statement.startsWith("insert into ai.user_narratives"))).toBe(false);
  });

  it("fails closed when the daily quota is exhausted", async () => {
    vi.stubEnv("AI_USER_REF_HMAC_KEY", "synthetic-ai-reference-key-with-more-than-32-bytes");
    aiQueryMock.mockImplementation(async (statement) => {
      const sql = normalize(statement);
      if (sql.startsWith("select id::text, status from ai.user_narratives")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select payload from ai.narrative_cache")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select count(*)::int as count from ai.user_narratives")) return { rows: [{ count: 1 }], rowCount: 1 };
      if (sql.startsWith("insert into ai.quota_counters")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });

    await expect(enqueueYearForecastNarrative({
      userId: "member-ai-5",
      entitlementId: "entitlement-ai-5",
      locale: "ko",
      facts: validFacts,
    })).rejects.toMatchObject({ reason: "daily_limit" });

    expect(statements().filter((statement) => statement.startsWith("insert into ai.quota_counters"))).toHaveLength(1);
    expect(statements().some((statement) => statement.startsWith("insert into ai.user_narratives"))).toBe(false);
  });

  it("rejects monthly quota exhaustion before inserting a narrative", async () => {
    vi.stubEnv("AI_USER_REF_HMAC_KEY", "synthetic-ai-reference-key-with-more-than-32-bytes");
    aiQueryMock.mockImplementation(async (statement, parameters) => {
      const sql = normalize(statement);
      if (sql.startsWith("select id::text, status from ai.user_narratives")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select payload from ai.narrative_cache")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("select count(*)::int as count from ai.user_narratives")) return { rows: [{ count: 0 }], rowCount: 1 };
      if (sql.startsWith("insert into ai.quota_counters")) {
        return parameters?.[1] === "day"
          ? { rows: [{ user_id: parameters[0] }], rowCount: 1 }
          : { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(enqueueYearForecastNarrative({
      userId: "member-ai-monthly",
      entitlementId: "entitlement-ai-monthly",
      locale: "ko",
      facts: validFacts,
    })).rejects.toMatchObject({ name: "AIQuotaError", reason: "monthly_limit" });

    const quotaCalls = aiQueryMock.mock.calls.filter(([statement]) => normalize(statement).startsWith("insert into ai.quota_counters"));
    expect(quotaCalls.map(([, parameters]) => parameters?.[1])).toEqual(["day", "month"]);
    expect(statements().some((statement) => statement.startsWith("insert into ai.user_narratives"))).toBe(false);
  });

  it("reserves an exact remaining daily budget after expired reservations are released", async () => {
    aiQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select budget_limit_microusd::text")) {
        return {
          rows: [{ budget_limit_microusd: "100", spent_microusd: "30", reserved_microusd: "20" }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(reserveAIDailyBudget({
      reservationId: "reservation-1",
      narrativeId: "narrative-1",
      requestLimitMicrousd: 50,
      dailyBudgetMicrousd: 100,
    })).resolves.toBe(true);

    const date = callParameters("select budget_limit_microusd::text")?.[0];
    expect(statements()[0]).toContain("delete from ai.budget_reservations where expires_at <= now()");
    expect(callParameters("insert into ai.daily_budgets")).toEqual([date, 100]);
    expect(callParameters("insert into ai.budget_reservations")).toEqual([
      "reservation-1", "narrative-1", date, 50,
    ]);
    expect(callParameters("update ai.daily_budgets set reserved_microusd = reserved_microusd + $2")).toEqual([date, 50]);
    expect(statements()[2]).toContain("for update");
  });

  it.each([
    { spentMicrousd: "60", reservedMicrousd: "30", requestLimitMicrousd: 11 },
    { spentMicrousd: "90", reservedMicrousd: "10", requestLimitMicrousd: 1 },
  ])("does not reserve a request that would exceed the remaining daily budget", async ({ spentMicrousd, reservedMicrousd, requestLimitMicrousd }) => {
    aiQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select budget_limit_microusd::text")) {
        return { rows: [{ budget_limit_microusd: "100", spent_microusd: spentMicrousd, reserved_microusd: reservedMicrousd }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(reserveAIDailyBudget({
      reservationId: "reservation-over-limit",
      narrativeId: "narrative-2",
      requestLimitMicrousd,
      dailyBudgetMicrousd: 100,
    })).resolves.toBe(false);

    expect(statements().some((statement) => statement.startsWith("insert into ai.budget_reservations"))).toBe(false);
    expect(statements().some((statement) => statement.startsWith("update ai.daily_budgets set reserved_microusd = reserved_microusd +"))).toBe(false);
  });

  it("settles actual provider usage and bounds ledger fields before writing", async () => {
    aiQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select budget_date::text, amount_microusd::text")) {
        return { rows: [{ budget_date: "2026-10-01", amount_microusd: "50000" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const userRefHmac = Buffer.alloc(32, 7);

    await recordAIBudgetUsage({
      reservationId: "reservation-usage",
      usage: {
        narrativeId: "narrative-3",
        requestId: "narrative-3:1:report",
        userRefHmac,
        tier: "report",
        model: "m".repeat(205),
        inputTokens: 2_147_483_649,
        outputTokens: -9,
        costMicrousd: 24_500,
        costIsEstimate: true,
      },
    });

    expect(callParameters("update ai.daily_budgets")).toEqual(["2026-10-01", "50000", 24_500]);
    expect(callParameters("insert into ai.usage_ledger")).toEqual([
      "narrative-3:1:report", "narrative-3", userRefHmac, "report", "m".repeat(200),
      2_147_483_647, 0, 24_500, true,
    ]);
    expect(statements().find((statement) => statement.startsWith("insert into ai.usage_ledger"))).toContain("on conflict (request_id) do nothing");
    expect(callParameters("delete from ai.budget_reservations")).toEqual(["reservation-usage"]);
  });

  it("never decrements daily spend when a negative usage amount crosses the service boundary", async () => {
    aiQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select budget_date::text, amount_microusd::text")) {
        return { rows: [{ budget_date: "2026-10-01", amount_microusd: "50000" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    await recordAIBudgetUsage({
      reservationId: "reservation-negative-cost",
      usage: {
        narrativeId: "narrative-4",
        requestId: "narrative-4:1:report",
        userRefHmac: Buffer.alloc(32, 8),
        tier: "report",
        model: "provider/test-model",
        inputTokens: 1,
        outputTokens: 1,
        costMicrousd: -1,
        costIsEstimate: false,
      },
    });

    expect(callParameters("update ai.daily_budgets")).toEqual(["2026-10-01", "50000", 0]);
    expect(callParameters("insert into ai.usage_ledger")?.[7]).toBe(0);
  });

  it("releases a held amount without counting it as spend, and safely ignores a missing reservation", async () => {
    aiQueryMock.mockResolvedValueOnce({ rows: [{ budget_date: "2026-10-01", amount_microusd: "800" }], rowCount: 1 });

    await releaseAIBudgetReservation("reservation-release");

    expect(callParameters("update ai.daily_budgets")).toEqual(["2026-10-01", "800", 0]);
    expect(callParameters("delete from ai.budget_reservations")).toEqual(["reservation-release"]);
    expect(statements().some((statement) => statement.startsWith("insert into ai.usage_ledger"))).toBe(false);

    aiQueryMock.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
    await releaseAIBudgetReservation("reservation-missing");
    expect(statements()).toEqual([expect.stringContaining("from ai.budget_reservations where id = $1 for update")]);
  });

  it.each([
    { days: -20, expectedDays: 1 },
    { days: 14.8, expectedDays: 14 },
    { days: 500, expectedDays: 90 },
  ])("bounds cost-summary history to $expectedDays days", async ({ days, expectedDays }) => {
    aiQueryMock.mockResolvedValue({
      rows: [{ cost_microusd: "125000", estimated_requests: 2, requests: 4 }],
      rowCount: 1,
    });

    await expect(getAIUsageCostSummary(days)).resolves.toEqual({
      costMicrousd: 125_000,
      estimatedRequests: 2,
      requests: 4,
    });

    expect(callParameters("select coalesce(sum(cost_microusd)")).toEqual([expectedDays]);
  });

  it.each(["-1", "9007199254740992"])("reports unsafe or negative aggregate cost as zero (%s)", async (costMicrousd) => {
    aiQueryMock.mockResolvedValue({
      rows: [{ cost_microusd: costMicrousd, estimated_requests: 0, requests: 0 }],
      rowCount: 1,
    });

    await expect(getAIUsageCostSummary()).resolves.toEqual({ costMicrousd: 0, estimatedRequests: 0, requests: 0 });
  });
});
