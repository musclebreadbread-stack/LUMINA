import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAnalyticsDateRange } from "@/lib/adminAnalytics";

vi.mock("server-only", () => ({}));

import { UmamiAnalyticsError, fetchUmamiAnalyticsRollup, readUmamiAnalyticsConfig } from "./umami";

const WEBSITE_ID = "123e4567-e89b-42d3-a456-426614174000";
const API_KEY = "test-api-key-that-is-at-least-24-characters";

function configure(overrides: Record<string, string | undefined> = {}): void {
  const values: Record<string, string | undefined> = {
    UMAMI_API_URL: "https://umami.example.test",
    UMAMI_WEBSITE_ID: WEBSITE_ID,
    UMAMI_API_KEY: API_KEY,
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value as string);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("readUmamiAnalyticsConfig", () => {
  it("returns null when any variable is missing or blank", () => {
    configure({ UMAMI_API_URL: "" });
    expect(readUmamiAnalyticsConfig()).toBeNull();
    configure({ UMAMI_WEBSITE_ID: "   " });
    expect(readUmamiAnalyticsConfig()).toBeNull();
    configure({ UMAMI_API_KEY: "" });
    expect(readUmamiAnalyticsConfig()).toBeNull();
  });

  it("normalizes a valid https origin and trims values", () => {
    configure({ UMAMI_API_URL: " https://umami.example.test/api/ ", UMAMI_WEBSITE_ID: ` ${WEBSITE_ID} ` });
    const config = readUmamiAnalyticsConfig();
    expect(config).toEqual({ apiUrl: "https://umami.example.test/api/", websiteId: WEBSITE_ID, apiKey: API_KEY });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("accepts plain http only for private railway hosts", () => {
    configure({ UMAMI_API_URL: "http://umami.railway.internal:3000/api" });
    expect(readUmamiAnalyticsConfig()?.apiUrl).toBe("http://umami.railway.internal:3000/api/");
    configure({ UMAMI_API_URL: "http://umami.example.test" });
    expect(readUmamiAnalyticsConfig()).toBeNull();
  });

  it.each([
    ["credentials", "https://user:pw@umami.example.test"],
    ["query string", "https://umami.example.test/?x=1"],
    ["fragment", "https://umami.example.test/#frag"],
    ["unexpected path", "https://umami.example.test/other"],
    ["not a URL", "not a url"],
    ["ftp scheme", "ftp://umami.example.test"],
  ])("rejects an API URL with %s", (_label, url) => {
    configure({ UMAMI_API_URL: url });
    expect(readUmamiAnalyticsConfig()).toBeNull();
  });

  it("rejects malformed website ids and weak or unsafe API keys", () => {
    configure({ UMAMI_WEBSITE_ID: "not-a-uuid" });
    expect(readUmamiAnalyticsConfig()).toBeNull();
    configure({ UMAMI_API_KEY: "short" });
    expect(readUmamiAnalyticsConfig()).toBeNull();
    configure({ UMAMI_API_KEY: `${API_KEY}\nX-Injected: 1` });
    expect(readUmamiAnalyticsConfig()).toBeNull();
  });
});

describe("fetchUmamiAnalyticsRollup", () => {
  const range = resolveAnalyticsDateRange(
    { preset: "custom", from: "2026-08-10", to: "2026-08-11" },
    new Date("2026-08-12T03:00:00.000Z"),
  );

  interface FakeResponses {
    pageviews?: unknown;
    events?: unknown;
    stats?: (params: URLSearchParams) => unknown;
    status?: Partial<Record<"pageviews" | "events" | "stats", number>>;
    badJson?: Partial<Record<"pageviews" | "events" | "stats", boolean>>;
  }

  function stubFetch(responses: FakeResponses) {
    const fetchMock = vi.fn(async (input: URL | string) => {
      const url = new URL(String(input));
      const kind = url.pathname.endsWith("/events/series")
        ? "events"
        : url.pathname.endsWith("/pageviews")
          ? "pageviews"
          : "stats";
      const status = responses.status?.[kind] ?? 200;
      const body =
        kind === "pageviews" ? responses.pageviews : kind === "events" ? responses.events : responses.stats?.(url.searchParams) ?? { visitors: 0 };
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => {
          if (responses.badJson?.[kind]) throw new SyntaxError("bad json");
          return body;
        },
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  beforeEach(() => configure());

  it("fails with not_configured when the environment is incomplete", async () => {
    configure({ UMAMI_API_KEY: "" });
    await expect(fetchUmamiAnalyticsRollup(range)).rejects.toMatchObject({ name: "UmamiAnalyticsError", code: "not_configured" });
  });

  it("builds traffic and event series, merging duplicates and dropping invalid rows", async () => {
    const fetchMock = stubFetch({
      pageviews: {
        pageviews: [
          { x: "2026-08-10", y: 5 },
          { x: "2026-08-10T00:00:00Z", y: 2 }, // 09:00 KST on the 10th, merges with the row above
          { x: "2026-08-10T16:00:00Z", y: "7" }, // 01:00 KST on the 11th
          { x: "2026-08-09", y: 99 }, // out of range
          { x: "2026-08-12", y: 99 }, // out of range
          { x: "garbage", y: 1 },
          { x: "2026-08-11", y: -1 },
          { x: "2026-08-11", y: "abc" },
          { y: 1 },
          "junk",
        ],
      },
      events: [
        { t: "test_start__saju", x: "2026-08-10", y: 3 },
        { t: "test_start__saju", x: "2026-08-10T05:00:00Z", y: 2 },
        { t: "result_view__integrated-report", x: "2026-08-11", y: 1 },
        { t: "unknown_event__saju", x: "2026-08-10", y: 4 },
        { t: "test_start__nonsense", x: "2026-08-10", y: 4 },
        { t: "nodelimiter", x: "2026-08-10", y: 4 },
        { t: "test_start__saju", x: "2026-08-20", y: 4 },
        { t: "test_start__saju", x: "2026-08-10", y: -4 },
        { t: 5, x: "2026-08-10", y: 1 },
        null,
      ],
      stats: (params) => {
        const event = params.get("event");
        if (event === "test_start__saju") return { data: { visitors: { value: 4 } } };
        if (event === "result_view__integrated-report") return { visitors: "1" };
        return { visitors: params.get("startAt") === String(Date.parse("2026-08-10T00:00:00+09:00")) ? 9 : 6 };
      },
    });

    const result = await fetchUmamiAnalyticsRollup(range);

    expect(result.range).toBe(range);
    expect(result.trafficSeries).toEqual([
      { date: "2026-08-10", pageviews: 7, visitors: 9 },
      { date: "2026-08-11", pageviews: 7, visitors: 6 },
    ]);
    expect(result.eventTrend).toEqual([
      { date: "2026-08-10", eventName: "test_start", analysis: "saju", count: 5, visitors: 4 },
      { date: "2026-08-11", eventName: "result_view", analysis: "integrated-report", count: 1, visitors: 1 },
    ]);

    const calls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    const pageviewsCall = calls.find((url) => url.pathname.endsWith("/pageviews"));
    expect(pageviewsCall?.pathname).toBe(`/api/websites/${WEBSITE_ID}/pageviews`);
    expect(pageviewsCall?.searchParams.get("unit")).toBe("day");
    expect(pageviewsCall?.searchParams.get("timezone")).toBe("Asia/Seoul");
    const seriesCall = calls.find((url) => url.pathname.endsWith("/events/series"));
    expect(seriesCall?.searchParams.get("limit")).toBe("1000");
    expect(seriesCall?.searchParams.get("eventType")).toBe("2");
    const init = (fetchMock.mock.calls as unknown as [unknown, RequestInit][])[0]?.[1];
    expect(init?.headers).toMatchObject({ Authorization: `Bearer ${API_KEY}` });
    expect(init).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
    // 2 traffic days + 2 distinct event points, plus the two list calls.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("returns zero-filled traffic when there is no data", async () => {
    stubFetch({ pageviews: { data: { pageviews: [] } }, events: [], stats: () => ({ visitors: null }) });
    const result = await fetchUmamiAnalyticsRollup(range);
    expect(result.trafficSeries).toEqual([
      { date: "2026-08-10", pageviews: 0, visitors: 0 },
      { date: "2026-08-11", pageviews: 0, visitors: 0 },
    ]);
    expect(result.eventTrend).toEqual([]);
  });

  it("reports HTTP failures with the status code", async () => {
    stubFetch({ pageviews: {}, events: [], status: { pageviews: 503 } });
    await expect(fetchUmamiAnalyticsRollup(range)).rejects.toMatchObject({
      code: "request_failed",
      message: "Umami analytics request returned 503",
    });
  });

  it("reports network failures without leaking the underlying error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret internal host unreachable")));
    const error = await fetchUmamiAnalyticsRollup(range).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UmamiAnalyticsError);
    expect((error as UmamiAnalyticsError).code).toBe("request_failed");
    expect((error as Error).message).not.toContain("secret");
  });

  it("reports invalid JSON bodies", async () => {
    stubFetch({ pageviews: {}, events: [], badJson: { events: true } });
    await expect(fetchUmamiAnalyticsRollup(range)).rejects.toMatchObject({ code: "invalid_response", message: "Umami analytics returned invalid JSON" });
  });

  it.each([
    ["pageview payload that is not an object", { pageviews: null, events: [] }, "invalid pageview data"],
    ["pageview series that is not an array", { pageviews: { pageviews: "x" }, events: [] }, "invalid time series"],
    ["event series that is not an array", { pageviews: { pageviews: [] }, events: { rows: [] } }, "invalid event series"],
  ])("rejects a %s", async (_label, responses, message) => {
    stubFetch(responses as FakeResponses);
    await expect(fetchUmamiAnalyticsRollup(range)).rejects.toMatchObject({ code: "invalid_response", message: expect.stringContaining(message) });
  });

  it("rejects an invalid statistics payload", async () => {
    stubFetch({ pageviews: { pageviews: [] }, events: [], stats: () => "not-an-object" });
    await expect(fetchUmamiAnalyticsRollup(range)).rejects.toMatchObject({ code: "invalid_response", message: "Umami returned invalid statistics" });
  });
});
