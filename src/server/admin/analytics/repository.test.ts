import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAnalyticsDateRange } from "@/lib/adminAnalytics";

vi.mock("server-only", () => ({}));

const hoisted = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/neon/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/neon/server")>("@/lib/neon/server");
  const sql = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join("?"), values }),
    { transaction: hoisted.transaction },
  );
  return { ...actual, createNeonSql: () => sql };
});

import { readAnalyticsRollups, writeAnalyticsAudit } from "./repository";

beforeEach(() => {
  hoisted.transaction.mockReset();
});

describe("readAnalyticsRollups", () => {
  it("scopes the transaction to the admin and maps rows defensively", async () => {
    hoisted.transaction.mockResolvedValue([
      [],
      [
        { metric_date: "2026-08-10", pageviews: 12, visitors: "7" },
        { metric_date: "2026-08-11", pageviews: -3, visitors: "abc" },
        { metric_date: "not-a-date", pageviews: 1, visitors: 1 },
        { metric_date: 20260812, pageviews: 1, visitors: 1 },
        "junk",
      ],
      [
        { metric_date: "2026-08-10", analysis_key: "saju", event_name: "test_start", event_count: "4", visitors: 3 },
        { metric_date: "2026-08-10", analysis_key: "integrated-report", event_name: "result_view", event_count: 1.6, visitors: 1 },
        { metric_date: "2026-08-10", analysis_key: "bogus", event_name: "test_start", event_count: 1, visitors: 1 },
        { metric_date: "2026-08-10", analysis_key: 5, event_name: "test_start", event_count: 1, visitors: 1 },
        { metric_date: "2026-08-10", analysis_key: "saju", event_name: "bogus", event_count: 1, visitors: 1 },
        { metric_date: "2026-08-10", analysis_key: "saju", event_name: 3, event_count: 1, visitors: 1 },
        { metric_date: "bad", analysis_key: "saju", event_name: "test_start", event_count: 1, visitors: 1 },
      ],
      [{ finished_at: "2026-08-11T01:00:00.000Z", requested_since: "2026-08-01", requested_until: "2026-08-10" }],
      [{ source_change_date: "2026-07-15" }],
    ]);

    const data = await readAnalyticsRollups("admin-1", "2026-08-01", "2026-08-11");

    expect(data.traffic).toEqual([
      { date: "2026-08-10", pageviews: 12, visitors: 7 },
      { date: "2026-08-11", pageviews: 0, visitors: 0 },
    ]);
    expect(data.events).toEqual([
      { date: "2026-08-10", analysis: "saju", eventName: "test_start", count: 4, visitors: 3 },
      { date: "2026-08-10", analysis: "integrated-report", eventName: "result_view", count: 2, visitors: 1 },
    ]);
    expect(data).toMatchObject({
      lastSyncAt: "2026-08-11T01:00:00.000Z",
      coverageStart: "2026-08-01",
      coverageEnd: "2026-08-10",
      sourceChangeDate: "2026-07-15",
    });
    expect(Object.isFrozen(data)).toBe(true);
    expect(Object.isFrozen(data.traffic)).toBe(true);

    const queries = hoisted.transaction.mock.calls[0]?.[0] as { text: string; values: unknown[] }[];
    expect(queries).toHaveLength(5);
    expect(queries[0]?.values).toEqual(["admin-1"]);
    expect(queries[1]?.values).toEqual(["2026-08-01", "2026-08-11", "production"]);
    expect(queries[2]?.values).toEqual(["2026-08-01", "2026-08-11", "production"]);
  });

  it("returns null metadata when no sync has run or values are malformed", async () => {
    hoisted.transaction.mockResolvedValue([[], [], [], [], []]);
    const empty = await readAnalyticsRollups("admin-1", "2026-08-01", "2026-08-11");
    expect(empty).toMatchObject({ traffic: [], events: [], lastSyncAt: null, coverageStart: null, coverageEnd: null, sourceChangeDate: null });

    hoisted.transaction.mockResolvedValue([
      [],
      [],
      [],
      [{ finished_at: "yesterday", requested_since: "2026-13-45", requested_until: 5 }],
      [{ source_change_date: null }],
    ]);
    const malformed = await readAnalyticsRollups("admin-1", "2026-08-01", "2026-08-11");
    expect(malformed).toMatchObject({ lastSyncAt: null, coverageStart: null, coverageEnd: null, sourceChangeDate: null });
  });

  it("propagates database failures", async () => {
    hoisted.transaction.mockRejectedValue(new Error("db down"));
    await expect(readAnalyticsRollups("admin-1", "2026-08-01", "2026-08-11")).rejects.toThrow("db down");
  });
});

describe("writeAnalyticsAudit", () => {
  it("writes the audit row under the admin's RLS context", async () => {
    hoisted.transaction.mockResolvedValue([[], []]);
    const range = resolveAnalyticsDateRange(
      { preset: "custom", from: "2026-08-10", to: "2026-08-11" },
      new Date("2026-08-12T03:00:00.000Z"),
    );

    await writeAnalyticsAudit("admin-1", "export_analytics", range);

    const queries = hoisted.transaction.mock.calls[0]?.[0] as { values: unknown[] }[];
    expect(queries).toHaveLength(2);
    expect(queries[0]?.values).toEqual(["admin-1"]);
    expect(queries[1]?.values).toEqual(["admin-1", "export_analytics", "2026-08-10", "2026-08-11"]);
  });

  it("propagates failures so callers can decide how to handle them", async () => {
    hoisted.transaction.mockRejectedValue(new Error("write failed"));
    const range = resolveAnalyticsDateRange({ preset: "7d", from: null, to: null });
    await expect(writeAnalyticsAudit("admin-1", "run_sync", range)).rejects.toThrow("write failed");
  });
});
