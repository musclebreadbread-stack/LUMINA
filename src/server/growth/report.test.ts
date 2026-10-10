import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAnalyticsDateRange } from "@/lib/adminAnalytics";

vi.mock("server-only", () => ({}));

import {
  buildGrowthReport,
  isAuthorizedGrowthReport,
  resolveGrowthReportRange,
  sanitizeReferrer,
  sanitizeReportPath,
  summarizeGrowthReport,
} from "./report";

const SECRET = "growth-report-secret-with-32-chars!";
const WEBSITE_ID = "123e4567-e89b-42d3-a456-426614174000";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(authorization?: string): Request {
  return new Request("https://lumina.example.test/api/internal/growth-report", {
    headers: authorization === undefined ? {} : { authorization },
  });
}

describe("isAuthorizedGrowthReport", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedGrowthReport(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
    expect(isAuthorizedGrowthReport(request(`bearer ${SECRET}`), SECRET)).toBe(true);
    expect(isAuthorizedGrowthReport(request(`Basic ${SECRET}`), SECRET)).toBe(false);
    expect(isAuthorizedGrowthReport(request(`Bearer ${SECRET}x`), SECRET)).toBe(false);
    expect(isAuthorizedGrowthReport(request(SECRET), SECRET)).toBe(false);
    expect(isAuthorizedGrowthReport(request(), SECRET)).toBe(false);
  });

  it("stays closed when the secret is missing or too short", () => {
    expect(isAuthorizedGrowthReport(request("Bearer short"), "short")).toBe(false);
    expect(isAuthorizedGrowthReport(request("Bearer "), undefined)).toBe(false);
  });
});

describe("resolveGrowthReportRange", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("supports 1 and 7 days and caps everything else at 7", () => {
    expect(resolveGrowthReportRange("1", now).days).toBe(1);
    expect(resolveGrowthReportRange("30", now).days).toBe(7);
    expect(resolveGrowthReportRange("365", now).days).toBe(7);
    expect(resolveGrowthReportRange(null, now)).toMatchObject({ days: 7, endDate: "2026-10-10" });
  });
});

describe("sanitizeReportPath", () => {
  it.each([
    ["/saju/2027/horse", "/saju/2027/horse"],
    ["/en/saju/ilju/jia-zi?utm_source=threads", "/en/saju/ilju/jia-zi"],
    ["/r/N4IgdghgtgpiBcIDKBjA", "/r/*"],
    ["/en/s/saju/abc123", "/en/s/*"],
    ["/p/7f3c2a", "/p/*"],
    ["/premium/saju-2027", "/premium/saju-2027"],
    ["/", "/"],
    ["/en", "/en"],
    ["/tarot/celtic-cross/839201", "/tarot/celtic-cross/[seed]"],
    ["/compatibility/N4Igd/N4Ige", "/compatibility/[left]/[right]"],
    ["/cognitive/result/7c2f1e", "/cognitive/result/[runId]"],
    ["/compatibility/[left]/[right]", "/compatibility/[left]/[right]"],
    ["/saju/ilju/Jia-Zi", "(other)"],
    ["/future-private/abc123def", "(other)"],
    ["/account/library", "/account/*"],
    ["/a/b/c/d/e", "(other)"],
  ])("%s -> %s", (input, expected) => {
    expect(sanitizeReportPath(input)).toBe(expected);
  });
});

describe("sanitizeReferrer", () => {
  it.each([
    ["", "(direct)"],
    ["www.google.com", "google.com"],
    ["https://l.threads.net/?u=abc", "l.threads.net"],
    ["m.search.naver.com", "m.search.naver.com"],
    ["not a host", "(other)"],
    ["localhost", "(other)"],
    ["203.0.113.7", "(other)"],
  ])("%j -> %s", (input, expected) => {
    expect(sanitizeReferrer(input)).toBe(expected);
  });
});

describe("summarizeGrowthReport", () => {
  const range = resolveAnalyticsDateRange({ preset: "custom", from: "2026-10-08", to: "2026-10-09" }, new Date("2026-10-10T00:00:00Z"));

  it("totals traffic and events and merges sanitized rows", () => {
    const report = summarizeGrowthReport(
      {
        range,
        trafficSeries: [
          { date: "2026-10-08", pageviews: 10, visitors: 4 },
          { date: "2026-10-09", pageviews: 5, visitors: 3 },
        ],
        eventTrend: [
          { date: "2026-10-08", eventName: "result_view", analysis: "saju", count: 3, visitors: 2 },
          { date: "2026-10-09", eventName: "result_view", analysis: "tarot", count: 2, visitors: 2 },
          { date: "2026-10-09", eventName: "premium_report_view", analysis: "saju", count: 1, visitors: 1 },
        ],
      },
      [{ value: "www.google.com", count: 2 }, { value: "google.com", count: 1 }, { value: "", count: 4 }],
      [{ value: "/r/abc", count: 3 }, { value: "/r/def", count: 2 }, { value: "/saju/2027", count: 1 }],
    );

    expect(report.traffic).toMatchObject({ pageviews: 15, dailyVisitorSum: 7 });
    expect(report.events).toEqual({ result_view: 5, premium_report_view: 1 });
    expect(report.eventsByAnalysis.saju).toEqual({ result_view: 3, premium_report_view: 1 });
    expect(report.referrers).toEqual([{ source: "(direct)", visitors: 4 }, { source: "google.com", visitors: 3 }]);
    expect(report.topPaths).toEqual([{ path: "/r/*", pageviews: 5 }, { path: "/saju/2027", pageviews: 1 }]);
    expect(JSON.stringify(report)).not.toMatch(/abc|def/u);
  });

  it("keeps rankings null when Umami could not provide them", () => {
    const report = summarizeGrowthReport({ range, trafficSeries: [], eventTrend: [] }, null, null);
    expect(report.referrers).toBeNull();
    expect(report.topPaths).toBeNull();
    expect(report.warnings).toEqual(["referrers_unavailable", "top_paths_unavailable"]);
  });
});

describe("buildGrowthReport", () => {
  const range = resolveAnalyticsDateRange({ preset: "today", from: null, to: null }, new Date("2026-10-10T03:00:00Z"));

  it("reports a missing Umami configuration instead of throwing", async () => {
    await expect(buildGrowthReport(range)).resolves.toBe("umami_not_configured");
  });

  it("falls back from the v3 `path` metric to the v2 `url` metric", async () => {
    vi.stubEnv("UMAMI_API_URL", "https://umami.example.test");
    vi.stubEnv("UMAMI_WEBSITE_ID", WEBSITE_ID);
    vi.stubEnv("UMAMI_API_KEY", "test-api-key-that-is-at-least-24-characters");
    const requestedTypes: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
      const url = new URL(String(input));
      const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 400, json: async () => body }) as Response;
      if (url.pathname.endsWith("/pageviews")) return json({ pageviews: [{ x: "2026-10-10", y: 9 }] });
      if (url.pathname.endsWith("/events/series")) return json([]);
      if (url.pathname.endsWith("/stats")) return json({ visitors: { value: 4 } });
      if (url.pathname.endsWith("/metrics")) {
        const type = url.searchParams.get("type") ?? "";
        requestedTypes.push(type);
        if (type === "path") return json({ error: "bad type" }, false);
        if (type === "url") return json([{ x: "/saju/2027?x=1", y: 7 }]);
        return json({ data: [{ x: null, y: 2 }] });
      }
      throw new Error(`unexpected ${url.pathname}`);
    }));

    const report = await buildGrowthReport(range);
    expect(report).toMatchObject({
      traffic: { pageviews: 9, dailyVisitorSum: 4 },
      referrers: [{ source: "(direct)", visitors: 2 }],
      topPaths: [{ path: "/saju/2027", pageviews: 7 }],
      warnings: [],
    });
    expect(requestedTypes.sort()).toEqual(["path", "referrer", "url"]);
  });
});
