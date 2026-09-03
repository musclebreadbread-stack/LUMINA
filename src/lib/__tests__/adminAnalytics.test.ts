import { describe, expect, it } from "vitest";
import {
  resolveAnalyticsRollupEnvironment,
  parseAnalyticsQuery,
  previousAnalyticsDateRange,
  resolveAnalyticsDateRange,
} from "../adminAnalytics";

describe("admin analytics date contract", () => {
  it("resolves the current day in Asia/Seoul", () => {
    const range = resolveAnalyticsDateRange(
      { preset: "today", from: null, to: null },
      new Date("2026-08-30T14:30:00.000Z"),
    );

    expect(range.startDate).toBe("2026-08-30");
    expect(range.endDate).toBe("2026-08-30");
    expect(range.days).toBe(1);
    expect(range.startIso).toBe("2026-08-29T15:00:00.000Z");
    expect(range.endIso).toBe("2026-08-30T14:59:59.999Z");
  });

  it("accepts a bounded custom range and creates an equal previous range", () => {
    const query = parseAnalyticsQuery({ preset: "custom", from: "2026-08-10", to: "2026-08-12", solution: "darktriad" });
    const range = resolveAnalyticsDateRange(query, new Date("2026-08-30T00:00:00.000Z"));
    const previous = previousAnalyticsDateRange(range);

    expect(range.startDate).toBe("2026-08-10");
    expect(range.endDate).toBe("2026-08-12");
    expect(range.days).toBe(3);
    expect(previous.startDate).toBe("2026-08-07");
    expect(previous.endDate).toBe("2026-08-09");
    expect(query.solution).toBe("darktriad");
  });

  it("falls back to a safe default for invalid filters", () => {
    const query = parseAnalyticsQuery({ preset: "custom", from: "not-a-date", to: "2026-08-12", solution: "private-data" });
    const range = resolveAnalyticsDateRange(query, new Date("2026-08-30T00:00:00.000Z"));

    expect(query.solution).toBe("all");
    expect(query.from).toBeNull();
    expect(query.to).toBe("2026-08-12");
    expect(range.preset).toBe("7d");
    expect(range.days).toBe(7);
  });

  it("allows only the production rollup environment used by the reader", () => {
    expect(resolveAnalyticsRollupEnvironment(undefined)).toBe("production");
    expect(resolveAnalyticsRollupEnvironment("  ")).toBe("production");
    expect(resolveAnalyticsRollupEnvironment("production")).toBe("production");
    expect(resolveAnalyticsRollupEnvironment("preview")).toBeNull();
    expect(resolveAnalyticsRollupEnvironment("staging")).toBeNull();
  });
});
