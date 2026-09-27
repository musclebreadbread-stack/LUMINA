import { randomBytes } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";
import { loadNeonAdminEnvironment } from "./lib/neonAdminEnv.mjs";

const args = process.argv.slice(2);
if (args.some((argument) => !["--dry-run", "--apply", "--help"].includes(argument))) {
  throw new Error("Usage: node scripts/neon-configure-member-auth-roles.mjs [--dry-run | --apply]");
}
if (args.includes("--help")) {
  console.log("Usage: node scripts/neon-configure-member-auth-roles.mjs [--dry-run | --apply]\nDefault: --dry-run; staging only");
  process.exit(0);
}
if (args.includes("--dry-run") && args.includes("--apply")) {
  throw new Error("Choose exactly one of --dry-run or --apply");
}

const apply = args.includes("--apply");
const admin = await loadNeonAdminEnvironment();
if (admin.fileName !== ".env.staging.admin.local" || admin.isProduction) {
  throw new Error("Member auth role configuration is restricted to the verified staging Neon endpoint");
}

const directUrl = new URL(admin.databaseUrl);
const pooledValue = admin.values.get("DATABASE_URL");
let pooledUrl;
try {
  pooledUrl = new URL(pooledValue ?? "");
} catch {
  throw new Error("DATABASE_URL must be a valid pooled Postgres URL in the staging admin env file");
}
const normalizeHost = (hostname) => hostname.toLowerCase().replace(/-pooler(?=\.)/u, "");
const isPostgresUrl = (url) => url.protocol === "postgres:" || url.protocol === "postgresql:";
if (!isPostgresUrl(pooledUrl) || !directUrl.hostname.toLowerCase().endsWith(".neon.tech")
  || !pooledUrl.hostname.toLowerCase().endsWith(".neon.tech") || directUrl.username !== "neondb_owner"
  || pooledUrl.username !== "neondb_owner" || normalizeHost(directUrl.hostname) !== normalizeHost(pooledUrl.hostname)
  || directUrl.pathname !== pooledUrl.pathname) {
  throw new Error("The selected direct and pooled owner URLs must point at the same staging Neon endpoint");
}

const appEnvUrl = new URL("../.env.staging.local", import.meta.url);
let appEnvContents;
try {
  appEnvContents = await readFile(appEnvUrl, "utf8");
} catch {
  throw new Error("Could not read the local staging environment file");
}
const newline = appEnvContents.includes("\r\n") ? "\r\n" : "\n";
const targets = [
  { role: "lumina_auth_app", key: "IDENTITY_DATABASE_URL", schema: "identity", tables: ["user", "session", "account", "verification", "rateLimit"] },
  { role: "lumina_member_app", key: "MEMBER_DATABASE_URL", schema: "member", tables: ["profiles", "saved_results", "consents", "share_links"] },
];

function currentValueState(contents, key) {
  const entries = contents.split(/\r?\n/u).filter((line) => new RegExp(`^\\s*${key}\\s*=`, "u").test(line));
  return { count: entries.length, nonEmpty: entries.some((line) => !/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*$/u.test(line)) };
}

function withValues(contents, updates) {
  const lines = contents.split(/\r?\n/u);
  const trailingNewline = lines.at(-1) === "";
  if (trailingNewline) lines.pop();
  const written = new Set();
  const updated = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/u);
    if (!match || !updates.has(match[1])) return line;
    written.add(match[1]);
    return `${match[1]}=${updates.get(match[1])}`;
  });
  for (const [key, value] of updates) {
    if (!written.has(key)) updated.push(`${key}=${value}`);
  }
  return `${updated.join(newline)}${trailingNewline ? newline : ""}`;
}

async function atomicWrite(fileUrl, contents) {
  const tempUrl = new URL(`.${randomBytes(12).toString("hex")}.tmp`, fileUrl);
  try {
    await writeFile(tempUrl, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(tempUrl, fileUrl);
  } catch {
    try { await unlink(tempUrl); } catch { /* The temporary file may not have been created. */ }
    throw new Error("Could not safely update the local staging environment file");
  }
}

const inspectSql = `
  select role.rolname,
         role.rolcanlogin,
         role.rolsuper,
         role.rolcreatedb,
         role.rolcreaterole,
         role.rolreplication,
         role.rolbypassrls,
         auth.rolpassword is null as password_unset,
         exists (
           select 1
             from pg_catalog.pg_auth_members membership
            where membership.member = role.oid
               or (
                 membership.roleid = role.oid
                 and (
                   membership.member <> (select oid from pg_catalog.pg_roles where rolname = current_user)
                   or not membership.admin_option
                   or membership.inherit_option
                   or membership.set_option
                 )
               )
         ) as has_unexpected_memberships,
         exists (
           select 1 from pg_catalog.pg_namespace where nspowner = role.oid
           union all select 1 from pg_catalog.pg_class where relowner = role.oid
           union all select 1 from pg_catalog.pg_proc where proowner = role.oid
           union all select 1 from pg_catalog.pg_type where typowner = role.oid
           union all select 1 from pg_catalog.pg_database where datdba = role.oid
         ) as owns_database_objects,
         has_schema_privilege(role.rolname, 'identity', 'USAGE') as identity_usage,
         has_schema_privilege(role.rolname, 'member', 'USAGE') as member_usage,
         has_schema_privilege(role.rolname, 'app', 'USAGE') as app_usage,
         (has_schema_privilege(role.rolname, 'identity', 'CREATE')
           or has_schema_privilege(role.rolname, 'member', 'CREATE')
           or has_schema_privilege(role.rolname, 'app', 'CREATE')
           or has_database_privilege(role.rolname, current_database(), 'CREATE')) as has_ddl_privileges,
         (select count(*) = cardinality($2::text[]) * 4
            from unnest($2::text[]) as objects(object_name)
            cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as privileges(privilege_name)
           where has_table_privilege(role.rolname, $3 || '.' || quote_ident(object_name), privilege_name)) as has_expected_table_privileges,
         (select count(*) = 0
            from unnest($2::text[]) as objects(object_name)
            cross join unnest(array['TRUNCATE', 'REFERENCES', 'TRIGGER']) as privileges(privilege_name)
           where has_table_privilege(role.rolname, $3 || '.' || quote_ident(object_name), privilege_name)) as has_no_unexpected_table_privileges,
         (select count(*) = cardinality($2::text[])
                  and count(*) filter (where relation.relrowsecurity and relation.relforcerowsecurity) = cardinality($2::text[])
            from pg_catalog.pg_class relation
            join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
           where namespace.nspname = $3 and relation.relname = any($2::text[]) and relation.relkind = 'r') as has_forced_rls,
         (select count(distinct policy.tablename) = cardinality($2::text[])
            from pg_catalog.pg_policies policy
           where policy.schemaname = $3 and policy.tablename = any($2::text[])
             and role.rolname = any(policy.roles)) as has_role_rls_policies,
         has_function_privilege(role.rolname, 'app.current_user_id()', 'EXECUTE') as can_read_current_user_id
    from pg_catalog.pg_roles role
    join pg_catalog.pg_authid auth on auth.oid = role.oid
   where role.rolname = $1`;

function validateRole(row, target) {
  if (!row) return { role: target.role, exists: false, safe: false };
  const isAuth = target.role === "lumina_auth_app";
  const valid = row.rolcanlogin === true && row.rolsuper === false && row.rolcreatedb === false
    && row.rolcreaterole === false && row.rolreplication === false && row.rolbypassrls === false
    && row.password_unset === true && row.has_unexpected_memberships === false && row.owns_database_objects === false
    && row.has_ddl_privileges === false && row.has_expected_table_privileges === true
    && row.has_no_unexpected_table_privileges === true && row.has_forced_rls === true
    && row.has_role_rls_policies === true
    && (isAuth
      ? row.identity_usage === true && row.member_usage === false && row.can_read_current_user_id === false
      : row.identity_usage === false && row.member_usage === true && row.app_usage === true && row.can_read_current_user_id === true);
  return {
    role: target.role,
    exists: true,
    loginOnly: row.rolcanlogin && !row.rolsuper && !row.rolcreatedb && !row.rolcreaterole && !row.rolreplication && !row.rolbypassrls,
    passwordUnset: row.password_unset,
    noUnexpectedMemberships: !row.has_unexpected_memberships,
    ownsNoDatabaseObjects: !row.owns_database_objects,
    expectedSchemaAndTableAccess: row.has_expected_table_privileges
      && row.has_no_unexpected_table_privileges
      && (isAuth ? row.identity_usage && !row.member_usage : !row.identity_usage && row.member_usage && row.app_usage),
    forcedRlsAndPolicies: row.has_forced_rls && row.has_role_rls_policies,
    noDdlPrivileges: !row.has_ddl_privileges,
    safe: valid,
  };
}

const adminClient = new Client(admin.databaseUrl);
try {
  try {
    await adminClient.connect();
  } catch {
    throw new Error("Could not connect to the verified staging Neon endpoint");
  }

  const localStates = targets.map((target) => ({ key: target.key, ...currentValueState(appEnvContents, target.key) }));
  const states = [];
  for (const target of targets) {
    let result;
    try {
      result = await adminClient.query(inspectSql, [target.role, target.tables, target.schema]);
    } catch {
      throw new Error(`Could not inspect ${target.role} safely; verify staging migration and owner permissions`);
    }
    states.push(validateRole(result.rows[0], target));
  }

  const safeToConfigure = states.every((state) => state.safe)
    && localStates.every((state) => state.count <= 1 && !state.nonEmpty);
  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      environment: "staging",
      endpointId: admin.endpointId,
      localEnvFile: ".env.staging.local",
      safeToConfigure,
      roles: states,
      localValues: localStates.map(({ key, count, nonEmpty }) => ({ key, configured: count > 0 && nonEmpty, duplicateEntries: count > 1 })),
      valuesToWrite: targets.map(({ key }) => key),
    }, null, 2));
    if (!safeToConfigure) process.exitCode = 1;
  } else {
    if (!safeToConfigure) {
      throw new Error("Staging role or local environment preconditions are not safe; no credentials were changed");
    }

    const passwords = new Map(targets.map(({ role }) => [role, randomBytes(48).toString("base64url")]));
    const urls = new Map(targets.map((target) => {
      const url = new URL(pooledUrl.toString());
      url.username = target.role;
      url.password = passwords.get(target.role);
      return [target.key, url.toString()];
    }));
    const nextContents = withValues(appEnvContents, urls);

    try {
      await adminClient.query("begin");
      await adminClient.query(`alter role lumina_auth_app with password '${passwords.get("lumina_auth_app")}'`);
      await adminClient.query(`alter role lumina_member_app with password '${passwords.get("lumina_member_app")}'`);
      await adminClient.query("commit");
    } catch {
      try { await adminClient.query("rollback"); } catch { /* The connection may already have rolled back. */ }
      throw new Error("Could not configure staging app-role credentials; no local URLs were written");
    }

    try {
      for (const target of targets) {
        const testClient = new Client(urls.get(target.key));
        try {
          await testClient.connect();
          const result = await testClient.query(
            `select current_user as role_name, role.rolsuper, role.rolbypassrls
               from pg_catalog.pg_roles role where role.rolname = current_user`,
          );
          const row = result.rows[0];
          if (!row || row.role_name !== target.role || row.rolsuper !== false || row.rolbypassrls !== false) {
            throw new Error("role connection check failed");
          }
        } catch {
          throw new Error(`Could not validate the ${target.role} staging connection`);
        } finally {
          try { await testClient.end(); } catch { /* Connection close must not expose driver details. */ }
        }
      }
    } catch (error) {
      try {
        await adminClient.query("begin");
        await adminClient.query("alter role lumina_auth_app with password null");
        await adminClient.query("alter role lumina_member_app with password null");
        await adminClient.query("commit");
      } catch {
        try { await adminClient.query("rollback"); } catch { /* Preserve the sanitized validation error. */ }
        throw new Error("Staging connection validation failed and database credentials could not be reset; do not enable member auth");
      }
      throw error;
    }

    try {
      await atomicWrite(appEnvUrl, nextContents);
    } catch {
      try {
        await adminClient.query("begin");
        await adminClient.query("alter role lumina_auth_app with password null");
        await adminClient.query("alter role lumina_member_app with password null");
        await adminClient.query("commit");
      } catch {
        try { await adminClient.query("rollback"); } catch { /* Preserve the sanitized write error. */ }
        throw new Error("Local staging file update failed and database credentials could not be reset; do not enable member auth");
      }
      throw new Error("Could not safely update .env.staging.local; staging role passwords were reset");
    }

    console.log(JSON.stringify({
      mode: "apply",
      environment: "staging",
      localEnvFile: ".env.staging.local",
      configuredRoles: targets.map(({ role }) => role),
      configuredValues: targets.map(({ key }) => key),
      connectionChecks: targets.map(({ role }) => ({ role, passed: true })),
      featureMemberAuth: "unchanged and must remain disabled",
    }, null, 2));
  }
} finally {
  try { await adminClient.end(); } catch { /* Avoid emitting raw database driver errors. */ }
}
