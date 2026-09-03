import { describe, expect, it, vi } from "vitest";
import { resolveAnalyticsDateRange } from "@/lib/adminAnalytics";
import type { EventMetric, EventTrendPoint } from "./types";

vi.mock("server-only", () => ({}));
vi.mock("../authorization", () => ({ getAdminAccess: vi.fn() }));
vi.mock("./repository", () => ({ readAnalyticsRollups: vi.fn(), writeAnalyticsAudit: vi.fn() }));
vi.mock("./vercel", () => ({ fetchVercelAnalyticsRange: vi.fn(), readVercelAnalyticsConfig: vi.fn() }));

import { buildSolutionMetrics } from "./service";

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
});
