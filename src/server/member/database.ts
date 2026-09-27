import "server-only";

import { Pool, type ClientBase, type PoolClient } from "pg";

let memberPool: Pool | null = null;

async function assertMemberDatabaseRole(client: ClientBase): Promise<void> {
  const result = await client.query<{ role_name: string; is_superuser: boolean; bypasses_rls: boolean }>(
    `select current_user as role_name, rolsuper as is_superuser, rolbypassrls as bypasses_rls
       from pg_catalog.pg_roles
      where rolname = current_user`,
  );
  const role = result.rows[0];
  if (!role || role.role_name !== "lumina_member_app" || role.is_superuser || role.bypasses_rls) {
    throw new Error("MEMBER_DATABASE_URL must use the non-privileged lumina_member_app role");
  }
}

export function getMemberPool(): Pool {
  if (memberPool) return memberPool;

  const connectionString = process.env.MEMBER_DATABASE_URL;
  if (!connectionString) throw new Error("MEMBER_DATABASE_URL is not configured");

  memberPool = new Pool({
    connectionString,
    application_name: "lumina-member-data",
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 4,
    options: "-c search_path=member,app,pg_catalog",
    ssl: { rejectUnauthorized: true },
    onConnect: assertMemberDatabaseRole,
  });

  memberPool.on("error", (error: Error & { readonly code?: string }) => {
    console.error("Member data database idle connection error", error.code ?? "unknown");
  });

  return memberPool;
}

export async function withMemberTransaction<T>(
  userId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!userId || userId.length > 256) throw new Error("Invalid member identity");

  const client = await getMemberPool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.current_user_id', $1, true)", [userId]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original, sanitized application error.
    }
    throw error;
  } finally {
    client.release();
  }
}
