import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../authorization", () => ({ getAdminAccess: vi.fn() }));
vi.mock("./repository", () => ({ readAnalyticsRollups: vi.fn(), writeAnalyticsAudit: vi.fn() }));

import { getAdminAccess } from "../authorization";
import { readAnalyticsRollups, writeAnalyticsAudit } from "./repository";
import { loadAdminAnalytics } from "./service";
import type { EventTrendPoint, TrafficPoint } from "./types";

type Rollup = Awaited<ReturnType<typeof readAnalyticsRollups>>;

const NOW = new Date("2026-08-10T03:00:00.000Z"); // 12:00 KST on 2026-08-10
const query = { preset: "7d", from: null, to: null, solution: "all" } as const;

function rollup(overrides: Partial<Rollup> = {}): Rollup {
  return {
    traffic: [],
    events: [],
    lastSyncAt: null,
    coverageStart: null,
    coverageEnd: null,
    sourceChangeDate: null,
    ...overrides,
  };
}

function event(date: string, eventName: EventTrendPoint["eventName"], count: number, visitors = count, analysis: EventTrendPoint["analysis"] = "saju"): EventTrendPoint {
  return { date, eventName, analysis, count, visitors };
}

function configureUmami(): void {
  vi.stubEnv("UMAMI_API_URL", "https://umami.example.test");
  vi.stubEnv("UMAMI_WEBSITE_ID", "123e4567-e89b-42d3-a456-426614174000");
  vi.stubEnv("UMAMI_API_KEY", "test-api-key-that-is-at-least-24-characters");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", role: "owner", userId: "admin-1" });
  vi.mocked(writeAnalyticsAudit).mockResolvedValue(undefined);
  vi.mocked(readAnalyticsRollups).mockResolvedValue(rollup());
  for (const name of ["UMAMI_API_URL", "UMAMI_WEBSITE_ID", "UMAMI_API_KEY"]) vi.stubEnv(name, "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("loadAdminAnalytics authorization", () => {
  it("throws when the caller is not an authorized admin", async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({ status: "forbidden" } as never);
    await expect(loadAdminAnalytics(query)).rejects.toThrow("admin authorization required");
    expect(readAnalyticsRollups).not.toHaveBeenCalled();
  });

  it("throws when an authorized access has no user id", async () => {
    vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", role: "owner", userId: null } as never);
    await expect(loadAdminAnalytics(query)).rejects.toThrow("admin authorization required");
  });

  it("audits the view and still loads when the audit write fails", async () => {
    vi.mocked(writeAnalyticsAudit).mockRejectedValue(new Error("audit down"));
    const snapshot = await loadAdminAnalytics(query);
    expect(writeAnalyticsAudit).toHaveBeenCalledWith("admin-1", "view_analytics", snapshot.range);
    expect(snapshot.health.rollupAvailable).toBe(true);
  });
});

describe("loadAdminAnalytics snapshots", () => {
  it("reads the previous and current range in a single rollup query", async () => {
    const snapshot = await loadAdminAnalytics(query);
    expect(readAnalyticsRollups).toHaveBeenCalledWith("admin-1", snapshot.previousRange.startDate, snapshot.range.endDate);
    expect(snapshot.range.startDate).toBe("2026-08-04");
    expect(snapshot.previousRange.endDate).toBe("2026-08-03");
  });

  it("returns an unavailable snapshot when the rollup cannot be read", async () => {
    vi.mocked(readAnalyticsRollups).mockRejectedValue(new Error("db down"));
    const snapshot = await loadAdminAnalytics({ ...query, solution: "tarot" });
    expect(snapshot.source).toBe("unavailable");
    expect(snapshot.freshness).toBe("unavailable");
    expect(snapshot.health.sourceConfigured).toBe(false);
    expect(snapshot.health.message).toContain("could not be loaded from Neon");
    expect(snapshot.trafficSeries).toHaveLength(7);
    expect(snapshot.selectedSolution).toBe("tarot");
    expect(snapshot.solutions.every((solution) => solution.entryCount === 0 && solution.completionRate === null)).toBe(true);
    expect(snapshot.summary.visitors).toEqual({ value: 0, previousValue: null, changePercent: null });
    expect(JSON.stringify(snapshot)).not.toContain("db down");
  });

  it("marks an empty rollup as empty and points to the Umami configuration", async () => {
    const snapshot = await loadAdminAnalytics(query);
    expect(snapshot.source).toBe("empty");
    expect(snapshot.freshness).toBe("unavailable");
    expect(snapshot.health.message).toContain("Configure Umami");
  });

  it("builds summaries, period-over-period change and funnel rates from rollup rows", async () => {
    const traffic: TrafficPoint[] = [
      { date: "2026-08-10", pageviews: 30, visitors: 20 },
      { date: "2026-08-04", pageviews: 10, visitors: 5 },
      { date: "2026-07-30", pageviews: 20, visitors: 10 }, // previous period
    ];
    const events: EventTrendPoint[] = [
      event("2026-08-10", "solution_entry", 10, 8),
      event("2026-08-10", "test_start", 6, 5),
      event("2026-08-10", "test_complete", 4, 3),
      event("2026-08-09", "result_view", 2, 2),
      event("2026-08-09", "share_open", 1, 1),
      event("2026-08-09", "solution_entry", 5, 4, "tarot"),
      event("2026-07-30", "solution_entry", 4, 4), // previous period
      event("2026-07-30", "test_complete", 0, 0),
      event("2026-01-01", "solution_entry", 99, 99), // outside both ranges
    ];
    vi.mocked(readAnalyticsRollups).mockResolvedValue(rollup({ traffic, events, lastSyncAt: "2026-08-10T00:00:00.000Z" }));

    const snapshot = await loadAdminAnalytics({ ...query, solution: "saju" });

    expect(snapshot.source).toBe("neon-rollup");
    expect(snapshot.freshness).toBe("fresh");
    expect(snapshot.summary.visitors).toEqual({ value: 25, previousValue: 10, changePercent: 150 });
    expect(snapshot.summary.pageviews).toEqual({ value: 40, previousValue: 20, changePercent: 100 });
    expect(snapshot.summary.entries).toEqual({ value: 15, previousValue: 4, changePercent: 275 });
    expect(snapshot.summary.completions).toMatchObject({ value: 4, previousValue: 0, changePercent: null });
    expect(snapshot.summary.shares).toMatchObject({ value: 1, previousValue: 0, changePercent: null });
    const saju = snapshot.solutions.find((solution) => solution.analysis === "saju");
    expect(saju).toMatchObject({ entryCount: 10, startCount: 6, completionCount: 4, resultCount: 2, shareCount: 1, completionRate: 40, resultRate: 20 });
    expect(saju?.trend).toEqual([0, 0, 0, 0, 0, 0, 10]);
    expect(snapshot.selectedSolutionSeries.every((metric) => metric.analysis === "saju")).toBe(true);
    expect(snapshot.eventTrend).toHaveLength(6);
    expect(snapshot.generatedAt).toBe(NOW.toISOString());
  });

  it("reports zero change when both periods are empty and marks stale syncs", async () => {
    vi.mocked(readAnalyticsRollups).mockResolvedValue(rollup({
      traffic: [{ date: "2026-08-10", pageviews: 1, visitors: 1 }],
      lastSyncAt: "2026-08-01T00:00:00.000Z",
    }));
    const snapshot = await loadAdminAnalytics(query);
    expect(snapshot.freshness).toBe("stale");
    expect(snapshot.summary.entries).toEqual({ value: 0, previousValue: 0, changePercent: 0 });
    expect(snapshot.summary.visitors.changePercent).toBeNull();
  });

  it("labels the source as umami-rollup when Umami is configured", async () => {
    configureUmami();
    vi.mocked(readAnalyticsRollups).mockResolvedValue(rollup({
      traffic: [{ date: "2026-08-10", pageviews: 2, visitors: 2 }],
      coverageStart: "2026-08-01",
      coverageEnd: "2026-08-10",
      sourceChangeDate: "2026-07-01",
    }));
    const snapshot = await loadAdminAnalytics(query);
    expect(snapshot.source).toBe("umami-rollup");
    expect(snapshot.health).toMatchObject({
      sourceConfigured: true,
      rollupAvailable: true,
      coverageStart: "2026-08-01",
      coverageEnd: "2026-08-10",
      sourceChangeDate: "2026-07-01",
    });
    expect(snapshot.health.message).toContain("stored in Neon");
  });

  it("uses a custom range and ignores events with a null analysis", async () => {
    vi.mocked(readAnalyticsRollups).mockResolvedValue(rollup({
      events: [
        { date: "2026-08-10", eventName: "solution_entry", analysis: null, count: 3, visitors: 3 } as unknown as EventTrendPoint,
        event("2026-08-10", "solution_entry", 2),
      ],
    }));
    const snapshot = await loadAdminAnalytics({ preset: "custom", from: "2026-08-10", to: "2026-08-10", solution: "all" });
    expect(snapshot.range.days).toBe(1);
    expect(snapshot.summary.entries.value).toBe(2);
  });
});
