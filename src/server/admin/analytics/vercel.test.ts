import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAnalyticsDateRange } from "@/lib/adminAnalytics";

vi.mock("server-only", () => ({}));

import { fetchVercelAnalyticsRange, splitAnalyticsRange } from "./vercel";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Vercel Analytics aggregate windows", () => {
  const requestUrls: string[] = [];

  beforeEach(() => {
    process.env.VERCEL_PROJECT_ID = "test-project";
    process.env.VERCEL_ANALYTICS_READ_TOKEN = "test-token";
    requestUrls.length = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const url = new URL(String(input));
      requestUrls.push(url.toString());
      const resource = url.pathname.split("/").at(-2);
      if (resource === "visits" && url.pathname.endsWith("/count")) {
        return jsonResponse({ data: { pageviews: 10, visitors: 5 } });
      }
      if (resource === "visits") return jsonResponse({ data: [] });

      const dimensions = url.searchParams.getAll("by");
      if (dimensions.includes("eventName")) {
        return jsonResponse({
          data: [{ eventName: "solution_entry", "eventData/analysis": "saju", count: 1, visitors: 1 }],
        });
      }

      const seoulDate = (value: string | null): string => {
        if (value === null) return "2026-01-01";
        return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(value));
      };
      const since = seoulDate(url.searchParams.get("since"));
      const until = seoulDate(url.searchParams.get("until"));
      const rows: Array<Record<string, unknown>> = [];
      const start = new Date(`${since}T00:00:00.000Z`);
      const end = new Date(`${until}T00:00:00.000Z`);
      for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
        const day = date.toISOString().slice(0, 10);
        for (const analysis of ["saju", "astro"] as const) {
          rows.push({ day, "eventData/analysis": analysis, count: 1, visitors: 1 });
        }
      }
      return jsonResponse({ data: rows });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_ANALYTICS_READ_TOKEN;
  });

  it("splits long day-by-analysis trends and preserves more than 100 rows", async () => {
    const range = resolveAnalyticsDateRange(
      { preset: "custom", from: "2026-01-01", to: "2026-03-06" },
      new Date("2026-03-06T03:00:00.000Z"),
    );

    expect(splitAnalyticsRange(range).map((part) => part.days)).toEqual([30, 30, 5]);

    const result = await fetchVercelAnalyticsRange(range, "all");

    expect(result.entryTrend).toHaveLength(130);
    expect(new Set(result.entryTrend.map((point) => `${point.date}:${point.analysis}`)).size).toBe(130);
    const eventAggregateUrls = requestUrls.filter((url) => url.includes("/events/aggregate"));
    expect(eventAggregateUrls).toHaveLength(4);
    expect(eventAggregateUrls.every((url) => new URL(url).searchParams.get("limit") === "1000")).toBe(true);
    const trendUrls = eventAggregateUrls.filter((url) => !new URL(url).searchParams.getAll("by").includes("eventName"));
    expect(trendUrls.every((url) => !new URL(url).searchParams.get("filter")?.includes("test_start"))).toBe(true);
  });
});
