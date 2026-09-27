import "server-only";

import { Pool, type ClientBase } from "pg";

let identityPool: Pool | null = null;

async function assertIdentityDatabaseRole(client: ClientBase): Promise<void> {
  const result = await client.query<{ role_name: string; is_superuser: boolean; bypasses_rls: boolean }>(
    `select current_user as role_name, rolsuper as is_superuser, rolbypassrls as bypasses_rls
       from pg_catalog.pg_roles
      where rolname = current_user`,
  );
  const role = result.rows[0];
  if (!role || role.role_name !== "lumina_auth_app" || role.is_superuser || role.bypasses_rls) {
    throw new Error("IDENTITY_DATABASE_URL must use the non-privileged lumina_auth_app role");
  }
}

export function getIdentityPool(): Pool {
  if (identityPool) return identityPool;

  const connectionString = process.env.IDENTITY_DATABASE_URL;
  if (!connectionString) throw new Error("IDENTITY_DATABASE_URL is not configured");

  identityPool = new Pool({
    connectionString,
    application_name: "lumina-member-auth",
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 4,
    options: "-c search_path=identity,pg_catalog",
    ssl: { rejectUnauthorized: true },
    onConnect: assertIdentityDatabaseRole,
  });

  identityPool.on("error", (error: Error & { readonly code?: string }) => {
    console.error("Member auth database idle connection error", error.code ?? "unknown");
  });

  return identityPool;
}
