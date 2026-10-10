import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNeonSql } from "@/lib/neon/server";
import { canReadAnalytics, getAdminAccess } from "./authorization";

const { createNeonSqlMock, getSessionMock, neonRowsMock, transactionMock } = vi.hoisted(() => ({
  createNeonSqlMock: vi.fn(),
  getSessionMock: vi.fn(),
  neonRowsMock: vi.fn<(value: unknown) => readonly Readonly<Record<string, unknown>>[]>((value) =>
    Array.isArray(value)
      ? value.filter((row): row is Readonly<Record<string, unknown>> =>
          typeof row === "object" && row !== null && !Array.isArray(row))
      : []),
  transactionMock: vi.fn<(queries: readonly unknown[]) => Promise<unknown>>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/neon/auth", () => ({
  getNeonAuth: () => ({ getSession: getSessionMock }),
}));
vi.mock("@/lib/neon/server", () => ({
  createNeonSql: createNeonSqlMock,
  neonRows: neonRowsMock,
}));

type SqlCall = Readonly<{ template: string; values: readonly unknown[] }>;

const sqlCalls: SqlCall[] = [];
const sqlClient = Object.assign(
  (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
    const call = { template: Array.from(strings).join(" ? "), values };
    sqlCalls.push(call);
    return call;
  },
  { transaction: transactionMock },
) as unknown as ReturnType<typeof createNeonSql>;

const deniedMembershipCases: readonly Readonly<{
  name: string;
  rows: readonly Readonly<Record<string, unknown>>[];
}>[] = [
  { name: "no matching row", rows: [] },
  { name: "unknown role", rows: [{ role: "super_admin" }] },
  { name: "malformed role", rows: [{ role: " owner" }] },
  { name: "non-string role", rows: [{ role: 1 }] },
];

describe("admin authorization boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "https://auth.example.test");
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "test-cookie-secret-that-is-long-enough");
    vi.stubEnv("DATABASE_URL", "postgres://lumina_test:test@db.example.test/lumina");
    getSessionMock.mockReset().mockResolvedValue({ data: { user: { id: "admin-user-1" } } });
    transactionMock.mockReset().mockResolvedValue([[], []]);
    neonRowsMock.mockClear();
    sqlCalls.length = 0;
    vi.mocked(createNeonSql).mockReset().mockReturnValue(sqlClient);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET", "DATABASE_URL"])(
    "fails closed without %s and avoids auth and database calls",
    async (key) => {
      vi.stubEnv(key, "");

      await expect(getAdminAccess()).resolves.toEqual({
        status: "unavailable",
        role: null,
        userId: null,
      });

      expect(getSessionMock).not.toHaveBeenCalled();
      expect(createNeonSql).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    },
  );

  it("fails closed when the auth provider cannot verify the session", async () => {
    getSessionMock.mockRejectedValue(new Error("provider failure"));

    await expect(getAdminAccess()).resolves.toEqual({
      status: "unavailable",
      role: null,
      userId: null,
    });

    expect(createNeonSql).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it.each([null, { id: "" }, { id: 42 }])(
    "does not query admin membership for an absent or malformed session user",
    async (user) => {
      getSessionMock.mockResolvedValue({ data: { user } });

      await expect(getAdminAccess()).resolves.toEqual({
        status: "unauthenticated",
        role: null,
        userId: null,
      });

      expect(createNeonSql).not.toHaveBeenCalled();
      expect(transactionMock).not.toHaveBeenCalled();
    },
  );

  it.each(["viewer", "analyst", "owner"] as const)(
    "authorizes the allowlisted %s role using the authenticated user inside one RLS transaction",
    async (role) => {
      transactionMock.mockResolvedValue([[], [{ role }]]);

      await expect(getAdminAccess()).resolves.toEqual({
        status: "authorized",
        role,
        userId: "admin-user-1",
      });

      expect(transactionMock).toHaveBeenCalledOnce();
      expect(transactionMock.mock.calls[0]?.[0]).toHaveLength(2);
      expect(transactionMock.mock.calls[0]?.[0]).toEqual(sqlCalls);
      expect(sqlCalls).toHaveLength(2);
      expect(sqlCalls[0]?.template).toContain("set_config('app.current_auth_user_id'");
      expect(sqlCalls[0]?.template).toContain(", true)");
      expect(sqlCalls[0]?.values).toEqual(["admin-user-1"]);
      expect(sqlCalls[1]?.template).toContain("from ops.admin_members");
      expect(sqlCalls[1]?.template).toContain("and active = true");
      expect(sqlCalls[1]?.template).toContain("limit 1");
      expect(sqlCalls[1]?.values).toEqual(["admin-user-1"]);
      expect(sqlCalls.every(({ template }) => !template.includes("admin-user-1"))).toBe(true);
    },
  );

  it.each(deniedMembershipCases)("denies membership results with $name", async ({ rows }) => {
    transactionMock.mockResolvedValue([[], rows]);

    await expect(getAdminAccess()).resolves.toEqual({
      status: "forbidden",
      role: null,
      userId: "admin-user-1",
    });
  });

  it("does not expose session identity when the membership database is unavailable", async () => {
    transactionMock.mockRejectedValue(new Error("database failure"));

    await expect(getAdminAccess()).resolves.toEqual({
      status: "unavailable",
      role: null,
      userId: null,
    });
  });

  it.each([
    [{ status: "authorized", role: "viewer", userId: "viewer-1" }, true],
    [{ status: "authorized", role: "analyst", userId: "analyst-1" }, true],
    [{ status: "authorized", role: "owner", userId: "owner-1" }, true],
    [{ status: "authorized", role: null, userId: "unknown-1" }, false],
    [{ status: "forbidden", role: null, userId: "member-1" }, false],
    [{ status: "unauthenticated", role: null, userId: null }, false],
    [{ status: "unavailable", role: null, userId: null }, false],
  ] as const)("maps %o to analytics read access %s", (access, expected) => {
    expect(canReadAnalytics(access)).toBe(expected);
  });
});
