import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const query = vi.hoisted(() => vi.fn());
vi.mock("./database", () => ({
  withGrowthTransaction: vi.fn(async (operation: (client: { query: typeof query }) => Promise<unknown>) => operation({ query })),
}));
vi.mock("@/server/member/database", () => ({ withMemberTransaction: vi.fn() }));

import { getMarketingSubscriberCounts } from "./marketingPreference";

beforeEach(() => query.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe("getMarketingSubscriberCounts", () => {
  it("is null — not an error — when the growth worker database is not configured", async () => {
    vi.stubEnv("GROWTH_DATABASE_URL", "");
    expect(await getMarketingSubscriberCounts()).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("returns aggregate counts only", async () => {
    vi.stubEnv("GROWTH_DATABASE_URL", "postgresql://lumina_growth_worker@example/db");
    query.mockResolvedValue({ rows: [{ subscribed: 12, unsubscribed: 3 }] });
    expect(await getMarketingSubscriberCounts()).toEqual({ subscribed: 12, unsubscribed: 3 });
    const [sql] = query.mock.calls[0] ?? [];
    expect(String(sql)).not.toMatch(/user_id|email/u);
  });

  it("treats an empty table as zero", async () => {
    vi.stubEnv("GROWTH_DATABASE_URL", "postgresql://lumina_growth_worker@example/db");
    query.mockResolvedValue({ rows: [] });
    expect(await getMarketingSubscriberCounts()).toEqual({ subscribed: 0, unsubscribed: 0 });
  });
});
