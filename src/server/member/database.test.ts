import type { ClientBase, PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  rowCount: number | null;
}>;

type MemberTransactionClient = Pick<PoolClient, "query" | "release">;
type MemberRoleGuardClient = Pick<ClientBase, "query">;
type MemberPoolOptions = Readonly<{
  connectionString: string;
  application_name: string;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
  options: string;
  ssl: Readonly<{ rejectUnauthorized: boolean }>;
  onConnect: (client: MemberRoleGuardClient) => Promise<void>;
}>;

const {
  clientQueryMock,
  clientReleaseMock,
  poolConstructorMock,
  poolConnectMock,
  poolOnMock,
} = vi.hoisted(() => ({
  clientQueryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<QueryResult>>(),
  clientReleaseMock: vi.fn<() => void>(),
  poolConstructorMock: vi.fn<(options: MemberPoolOptions) => void>(),
  poolConnectMock: vi.fn<() => Promise<MemberTransactionClient>>(),
  poolOnMock: vi.fn<(event: string, listener: (error: Error & { readonly code?: string }) => void) => unknown>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("pg", () => ({
  Pool: class {
    readonly connect = poolConnectMock;
    readonly on = poolOnMock;

    constructor(options: MemberPoolOptions) {
      poolConstructorMock(options);
    }
  },
}));

const memberClient: MemberTransactionClient = {
  query: clientQueryMock as unknown as PoolClient["query"],
  release: clientReleaseMock,
};
const roleGuardClient: MemberRoleGuardClient = {
  query: clientQueryMock as unknown as ClientBase["query"],
};

function expectCurrentRoleQuery(): void {
  const call = clientQueryMock.mock.calls[clientQueryMock.mock.calls.length - 1];
  if (!call) throw new Error("Member database role query was not captured");
  expect(call[0].replace(/\s+/gu, " ").trim().toLowerCase()).toBe(
    "select current_user as role_name, rolsuper as is_superuser, rolbypassrls as bypasses_rls from pg_catalog.pg_roles where rolname = current_user",
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("MEMBER_DATABASE_URL", "postgresql://member.invalid/database");
  clientQueryMock.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
  clientReleaseMock.mockReset();
  poolConstructorMock.mockReset();
  poolConnectMock.mockReset().mockResolvedValue(memberClient);
  poolOnMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("member database pool", () => {
  it("uses the non-privileged member role guard, TLS, and a cached bounded pool", async () => {
    const { getMemberPool } = await import("./database");

    const pool = getMemberPool();
    expect(getMemberPool()).toBe(pool);
    expect(poolConstructorMock).toHaveBeenCalledOnce();
    expect(poolConstructorMock).toHaveBeenCalledWith(expect.objectContaining({
      connectionString: "postgresql://member.invalid/database",
      application_name: "lumina-member-data",
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      max: 4,
      options: "-c search_path=member,app,pg_catalog",
      ssl: { rejectUnauthorized: true },
      onConnect: expect.any(Function),
    }));
    expect(poolOnMock).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("requires the application connection string", async () => {
    vi.stubEnv("MEMBER_DATABASE_URL", "");
    const { getMemberPool } = await import("./database");

    expect(() => getMemberPool()).toThrow("MEMBER_DATABASE_URL is not configured");
    expect(poolConstructorMock).not.toHaveBeenCalled();
  });

  it("accepts only the exact non-privileged member database role", async () => {
    const { getMemberPool } = await import("./database");
    getMemberPool();
    const options = poolConstructorMock.mock.calls[0]?.[0];
    if (!options) throw new Error("Member pool configuration was not captured");

    clientQueryMock.mockResolvedValueOnce({
      rows: [{ role_name: "lumina_member_app", is_superuser: false, bypasses_rls: false }],
      rowCount: 1,
    });
    await expect(options.onConnect(roleGuardClient)).resolves.toBeUndefined();
    expectCurrentRoleQuery();

    for (const row of [
      { role_name: "other_role", is_superuser: false, bypasses_rls: false },
      { role_name: "lumina_member_app", is_superuser: true, bypasses_rls: false },
      { role_name: "lumina_member_app", is_superuser: false, bypasses_rls: true },
    ]) {
      clientQueryMock.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
      await expect(options.onConnect(roleGuardClient)).rejects.toThrow(
        "MEMBER_DATABASE_URL must use the non-privileged lumina_member_app role",
      );
      expectCurrentRoleQuery();
    }

    clientQueryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await expect(options.onConnect(roleGuardClient)).rejects.toThrow(
      "MEMBER_DATABASE_URL must use the non-privileged lumina_member_app role",
    );
    expectCurrentRoleQuery();
  });
});

describe("member RLS transaction context", () => {
  it("sets the current user inside the transaction before running member SQL", async () => {
    const { withMemberTransaction } = await import("./database");

    await expect(withMemberTransaction("member-42", async (client) => {
      await client.query("select * from member.profiles");
      return "result";
    })).resolves.toBe("result");

    expect(clientQueryMock.mock.calls.map(([statement]) => statement)).toEqual([
      "begin",
      "select set_config('app.current_user_id', $1, true)",
      "select * from member.profiles",
      "commit",
    ]);
    expect(clientQueryMock).toHaveBeenNthCalledWith(2,
      "select set_config('app.current_user_id', $1, true)",
      ["member-42"],
    );
    expect(poolConnectMock).toHaveBeenCalledOnce();
    expect(clientReleaseMock).toHaveBeenCalledOnce();
  });

  it.each(["", "x".repeat(257)])("rejects an invalid user identity before connecting", async (userId) => {
    const { withMemberTransaction } = await import("./database");

    await expect(withMemberTransaction(userId, async () => undefined)).rejects.toThrow("Invalid member identity");

    expect(poolConnectMock).not.toHaveBeenCalled();
    expect(clientQueryMock).not.toHaveBeenCalled();
  });

  it("rolls back and releases the client after an operation fails", async () => {
    const { withMemberTransaction } = await import("./database");
    const operationError = new Error("synthetic member operation failure");

    await expect(withMemberTransaction("member-42", async () => {
      throw operationError;
    })).rejects.toBe(operationError);

    expect(clientQueryMock.mock.calls.map(([statement]) => statement)).toEqual([
      "begin",
      "select set_config('app.current_user_id', $1, true)",
      "rollback",
    ]);
    expect(clientReleaseMock).toHaveBeenCalledOnce();
  });

  it("preserves the operation error when rollback also fails", async () => {
    const { withMemberTransaction } = await import("./database");
    const operationError = new Error("synthetic member operation failure");
    clientQueryMock
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockRejectedValueOnce(new Error("synthetic rollback failure"));

    await expect(withMemberTransaction("member-42", async () => {
      throw operationError;
    })).rejects.toBe(operationError);

    expect(clientQueryMock.mock.calls.map(([statement]) => statement)).toEqual([
      "begin",
      "select set_config('app.current_user_id', $1, true)",
      "rollback",
    ]);
    expect(clientReleaseMock).toHaveBeenCalledOnce();
  });
});
