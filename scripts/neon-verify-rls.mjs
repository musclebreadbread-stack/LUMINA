import { Client } from "@neondatabase/serverless";
import { loadNeonAdminEnvironment } from "./lib/neonAdminEnv.mjs";

if (process.argv.length > 2) throw new Error("Usage: node scripts/neon-verify-rls.mjs");
const userA = process.env.RLS_TEST_USER_A_ID;
const userB = process.env.RLS_TEST_USER_B_ID;
const memberUrlValue = process.env.MEMBER_DATABASE_URL;
if (!userA || !userB || userA === userB || userA.length > 256 || userB.length > 256) {
  throw new Error("Set two distinct RLS_TEST_USER_A_ID and RLS_TEST_USER_B_ID values for test accounts");
}
if (!memberUrlValue) throw new Error("MEMBER_DATABASE_URL must use the lumina_member_app role");

const admin = await loadNeonAdminEnvironment({ databaseUrlKey: "DATABASE_URL_UNPOOLED" });
let memberUrl;
try {
  memberUrl = new URL(memberUrlValue);
} catch {
  throw new Error("MEMBER_DATABASE_URL must be a valid Postgres URL");
}
const ownerUrl = new URL(admin.databaseUrl);
const normalizeHost = (hostname) => hostname.toLowerCase().replace(/-pooler(?=\.)/u, "");
if ((memberUrl.protocol !== "postgres:" && memberUrl.protocol !== "postgresql:")
  || memberUrl.username !== "lumina_member_app"
  || normalizeHost(memberUrl.hostname) !== normalizeHost(ownerUrl.hostname)
  || memberUrl.pathname !== ownerUrl.pathname) {
  throw new Error("MEMBER_DATABASE_URL must target the selected Neon endpoint with lumina_member_app");
}

const adminClient = new Client(admin.databaseUrl);
const memberClient = new Client(memberUrlValue);

async function main() {
  await adminClient.connect();
  const rlsResult = await adminClient.query(
    `select namespace.nspname as schema_name, relation.relname as table_name,
            relation.relrowsecurity as rls_enabled, relation.relforcerowsecurity as rls_forced,
            count(policy.oid)::int as policy_count
       from pg_catalog.pg_class relation
       join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
       left join pg_catalog.pg_policy policy on policy.polrelid = relation.oid
      where namespace.nspname = any($1) and relation.relkind in ('r', 'p')
      group by namespace.nspname, relation.relname, relation.relrowsecurity, relation.relforcerowsecurity
      order by namespace.nspname, relation.relname`,
    [["identity", "member", "billing", "ai", "ops"]],
  );
  const schemas = new Set(rlsResult.rows.map((row) => row.schema_name));
  const requiredSchemas = ["identity", "member", "billing", "ai", "ops"];
  const missingSchemas = requiredSchemas.filter((schema) => !schemas.has(schema));
  const unsafeTables = rlsResult.rows.filter((row) => row.rls_enabled !== true || row.rls_forced !== true || row.policy_count < 1);
  if (missingSchemas.length > 0 || unsafeTables.length > 0) {
    throw new Error("One or more required schemas or RLS policies are missing or unsafe");
  }

  await memberClient.connect();
  const roleResult = await memberClient.query(
    `select current_user as role_name, role.rolsuper as is_superuser, role.rolbypassrls as bypasses_rls
       from pg_catalog.pg_roles role where role.rolname = current_user`,
  );
  const role = roleResult.rows[0];
  if (!role || role.role_name !== "lumina_member_app" || role.is_superuser !== false || role.bypasses_rls !== false) {
    throw new Error("Member connection did not use a restricted RLS-enforced role");
  }

  const crossUserChecks = [];
  for (const [ownerId, otherId] of [[userA, userB], [userB, userA]]) {
    await memberClient.query("begin read only");
    try {
      await memberClient.query("select set_config('app.current_user_id', $1, true)", [ownerId]);
      const own = await memberClient.query("select count(*)::int as count from member.profiles where user_id = $1", [ownerId]);
      const other = await memberClient.query("select count(*)::int as count from member.profiles where user_id = $1", [otherId]);
      if ((own.rows[0]?.count ?? 0) < 1 || (other.rows[0]?.count ?? 0) !== 0) {
        throw new Error("Cross-user RLS check failed");
      }
      crossUserChecks.push({ ownerRowsVisible: own.rows[0].count, crossUserRowsVisible: other.rows[0].count });
      await memberClient.query("commit");
    } catch (error) {
      try { await memberClient.query("rollback"); } catch { /* Preserve the sanitized failure. */ }
      throw error;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    environment: admin.fileName.includes("production") ? "production" : "staging",
    tablesChecked: rlsResult.rows.length,
    schemasChecked: requiredSchemas,
    crossUserChecks,
  }, null, 2));
}

try {
  await main();
} catch {
  console.error("RLS verification failed. Check the selected Neon environment, migrations, and two test-account IDs.");
  process.exitCode = 1;
} finally {
  await memberClient.end().catch(() => undefined);
  await adminClient.end().catch(() => undefined);
}
