import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AIQueryResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  rowCount: number | null;
}>;

type AIWorkerRole = Readonly<{
  role_name: string;
  is_superuser: boolean;
  bypasses_rls: boolean;
}>;

type AIWorkerTestClient = Readonly<{
  query: (statement: string, parameters?: readonly unknown[]) => Promise<AIQueryResult>;
  release: () => void;
}>;

type AIPoolTestOptions = Readonly<{
  application_name?: string;
  connectionString?: string;
  max?: number;
  onConnect?: (client: AIWorkerTestClient) => Promise<void>;
  options?: string;
  ssl?: Readonly<{ rejectUnauthorized: boolean }>;
}>;

const {
  aiQueryMock,
  clientReleaseMock,
  currentRoleMock,
  poolConstructorMock,
  poolOnMock,
} = vi.hoisted(() => ({
  aiQueryMock: vi.fn<(statement: string, parameters?: readonly unknown[]) => Promise<AIQueryResult>>(),
  clientReleaseMock: vi.fn<() => void>(),
  currentRoleMock: { value: null as AIWorkerRole | null },
  poolConstructorMock: vi.fn<(options: AIPoolTestOptions) => void>(),
  poolOnMock: vi.fn<(event: string, listener: (error: Error & { readonly code?: string }) => void) => unknown>(),
}));

const workerClient: AIWorkerTestClient = {
  query: aiQueryMock,
  release: clientReleaseMock,
};

vi.mock("server-only", () => ({}));
vi.mock("pg", () => ({
  Pool: class {
    private readonly options: AIPoolTestOptions;

    readonly on = poolOnMock;

    constructor(options: AIPoolTestOptions) {
      this.options = options;
      poolConstructorMock(options);
    }

    readonly connect = async (): Promise<AIWorkerTestClient> => {
      await this.options.onConnect?.(workerClient);
      return workerClient;
    };
  },
}));

function normalize(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

function statements(): string[] {
  return aiQueryMock.mock.calls.map(([statement]) => normalize(statement));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AI_DATABASE_URL", "postgresql://ai-worker.invalid/database");
  currentRoleMock.value = { role_name: "lumina_ai_worker", is_superuser: false, bypasses_rls: false };
  aiQueryMock.mockReset().mockImplementation(async (statement) => {
    if (normalize(statement).startsWith("select current_user as role_name")) {
      return { rows: currentRoleMock.value ? [currentRoleMock.value] : [], rowCount: currentRoleMock.value ? 1 : 0 };
    }
    return { rows: [], rowCount: 1 };
  });
  clientReleaseMock.mockReset();
  poolConstructorMock.mockReset();
  poolOnMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI worker database boundary", () => {
  it.each([
    { role: null, label: "missing role" },
    { role: { role_name: "lumina_member_app", is_superuser: false, bypasses_rls: false }, label: "wrong role" },
    { role: { role_name: "lumina_ai_worker", is_superuser: true, bypasses_rls: false }, label: "superuser" },
    { role: { role_name: "lumina_ai_worker", is_superuser: false, bypasses_rls: true }, label: "RLS bypass" },
  ])("rejects an unsafe worker role ($label)", async ({ role }) => {
    currentRoleMock.value = role;
    const database = await import("./database");

    await expect(database.withAITransaction(async () => "unused"))
      .rejects.toThrow("AI_DATABASE_URL must use the non-privileged lumina_ai_worker role");

    expect(statements()).toEqual([expect.stringContaining("select current_user as role_name")]);
    expect(poolConstructorMock.mock.calls[0]?.[0]).toMatchObject({
      application_name: "lumina-ai-worker",
      max: 3,
      options: "-c search_path=ai,billing,app,pg_catalog",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("commits a successful worker operation and releases its client", async () => {
    const database = await import("./database");

    await expect(database.withAITransaction(async (client) => {
      await client.query("select worker operation");
      return "completed";
    })).resolves.toBe("completed");

    expect(statements()).toEqual([
      expect.stringContaining("select current_user as role_name"),
      "begin",
      "select worker operation",
      "commit",
    ]);
    expect(clientReleaseMock).toHaveBeenCalledOnce();
  });

  it("rolls back after a failed quota operation, preserves the original error, and releases the client", async () => {
    const database = await import("./database");
    const operationError = new Error("synthetic quota limit");
    aiQueryMock.mockImplementation(async (statement) => {
      if (normalize(statement).startsWith("select current_user as role_name")) {
        const role = currentRoleMock.value;
        return { rows: role ? [role] : [], rowCount: role ? 1 : 0 };
      }
      if (normalize(statement) === "rollback") throw new Error("synthetic rollback failure");
      return { rows: [], rowCount: 1 };
    });

    await expect(database.withAITransaction(async (client) => {
      await client.query("insert into ai.quota_counters");
      throw operationError;
    })).rejects.toBe(operationError);

    expect(statements()).toEqual([
      expect.stringContaining("select current_user as role_name"),
      "begin",
      "insert into ai.quota_counters",
      "rollback",
    ]);
    expect(clientReleaseMock).toHaveBeenCalledOnce();
  });
});
