import { describe, expect, it, vi } from "vitest";
import { resolveAnalyticsDateRange } from "@/lib/adminAnalytics";
import type { EventMetric, EventTrendPoint } from "./types";

vi.mock("server-only", () => ({}));
vi.mock("../authorization", () => ({ getAdminAccess: vi.fn() }));
vi.mock("./repository", () => ({ readAnalyticsRollups: vi.fn(), writeAnalyticsAudit: vi.fn() }));
import { getAdminAccess } from "../authorization";
import { readAnalyticsRollups, writeAnalyticsAudit } from "./repository";
import { buildSolutionMetrics, loadAdminAnalytics } from "./service";

describe("admin analytics funnel semantics", () => {
  it("uses solution_entry as the denominator and keeps test_start separate", () => {
    const range = resolveAnalyticsDateRange(
      { preset: "custom", from: "2026-08-10", to: "2026-08-10" },
      new Date("2026-08-10T03:00:00.000Z"),
    );
    const metrics: readonly EventMetric[] = [
      { analysis: "saju", eventName: "solution_entry", count: 4, visitors: 3 },
      { analysis: "saju", eventName: "test_start", count: 4, visitors: 3 },
      { analysis: "saju", eventName: "test_complete", count: 2, visitors: 2 },
      { analysis: "saju", eventName: "result_view", count: 1, visitors: 1 },
    ];
    const events: readonly EventTrendPoint[] = [
      { date: "2026-08-10", eventName: "solution_entry", analysis: "saju", count: 4, visitors: 3 },
      { date: "2026-08-10", eventName: "test_start", analysis: "saju", count: 4, visitors: 3 },
    ];

    const saju = buildSolutionMetrics(metrics, events, range).find((solution) => solution.analysis === "saju");

    expect(saju).toMatchObject({
      entryCount: 4,
      entryVisitors: 3,
      startCount: 4,
      completionCount: 2,
      completionRate: 50,
      resultRate: 25,
      trend: [4],
    });
  });

  it("reports an unavailable Neon rollup without claiming the migration is missing", async () => {
    vi.stubEnv("UMAMI_API_URL", "http://umami.railway.internal:3000/api");
    vi.stubEnv("UMAMI_WEBSITE_ID", "123e4567-e89b-42d3-a456-426614174000");
    vi.stubEnv("UMAMI_API_KEY", "test-api-key-that-is-at-least-24-characters");
    vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", role: "owner", userId: "admin-1" });
    vi.mocked(writeAnalyticsAudit).mockResolvedValue(undefined);
    vi.mocked(readAnalyticsRollups).mockRejectedValue(new Error("database unavailable"));

    try {
      const snapshot = await loadAdminAnalytics({ preset: "7d", from: null, to: null, solution: "all" });

      expect(snapshot.source).toBe("unavailable");
      expect(snapshot.health.sourceConfigured).toBe(true);
      expect(snapshot.health.rollupAvailable).toBe(false);
      expect(snapshot.health.message).toContain("could not be loaded from Neon");
    } finally {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    }
  });

  it("reports an unavailable Neon rollup when Umami is not configured", async () => {
    vi.stubEnv("UMAMI_API_URL", "");
    vi.stubEnv("UMAMI_WEBSITE_ID", "");
    vi.stubEnv("UMAMI_API_KEY", "");
    vi.mocked(getAdminAccess).mockResolvedValue({ status: "authorized", role: "owner", userId: "admin-1" });
    vi.mocked(writeAnalyticsAudit).mockResolvedValue(undefined);
    vi.mocked(readAnalyticsRollups).mockRejectedValue(new Error("database unavailable"));

    try {
      const snapshot = await loadAdminAnalytics({ preset: "7d", from: null, to: null, solution: "all" });

      expect(snapshot.source).toBe("unavailable");
      expect(snapshot.health.sourceConfigured).toBe(false);
      expect(snapshot.health.rollupAvailable).toBe(false);
      expect(snapshot.health.message).toBe("Analytics rollups could not be loaded from Neon.");
    } finally {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    }
  });
});
