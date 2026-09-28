import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/server", () => ({
  createNeonSql: vi.fn(),
}));

import { createNeonSql } from "@/lib/neon/server";
import { GET } from "./route";

describe("GET /api/health/ready", () => {
  it("reports ok when the database ping succeeds", async () => {
    vi.mocked(createNeonSql).mockReturnValue(vi.fn(async () => [{ "?column?": 1 }]) as never);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports 503 without leaking the underlying error when the database ping fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createNeonSql).mockReturnValue(
      vi.fn(async () => {
        throw new Error("connection refused at 10.0.0.5:5432");
      }) as never,
    );

    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ ok: false });
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
    consoleError.mockRestore();
  });
});
