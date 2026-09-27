import "server-only";

import { Pool, type ClientBase, type PoolClient } from "pg";

let billingPool: Pool | null = null;

async function assertBillingWorkerRole(client: ClientBase): Promise<void> {
  const result = await client.query<{ role_name: string; is_superuser: boolean; bypasses_rls: boolean }>(
    `select current_user as role_name, rolsuper as is_superuser, rolbypassrls as bypasses_rls
       from pg_catalog.pg_roles where rolname = current_user`,
  );
  const role = result.rows[0];
  if (!role || role.role_name !== "lumina_billing_worker" || role.is_superuser || role.bypasses_rls) {
    throw new Error("BILLING_DATABASE_URL must use the non-privileged lumina_billing_worker role");
  }
}

function getBillingPool(): Pool {
  if (billingPool) return billingPool;
  const connectionString = process.env.BILLING_DATABASE_URL;
  if (!connectionString) throw new Error("BILLING_DATABASE_URL is not configured");
  billingPool = new Pool({
    connectionString,
    application_name: "lumina-billing-worker",
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 3,
    options: "-c search_path=billing,app,pg_catalog",
    ssl: { rejectUnauthorized: true },
    onConnect: assertBillingWorkerRole,
  });
  billingPool.on("error", (error: Error & { readonly code?: string }) => {
    console.error("Billing database idle connection error", error.code ?? "unknown");
  });
  return billingPool;
}

export async function withBillingTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getBillingPool().connect();
  try {
    await client.query("begin");
    const value = await operation(client);
    await client.query("commit");
    return value;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original sanitized operation error.
    }
    throw error;
  } finally {
    client.release();
  }
}
