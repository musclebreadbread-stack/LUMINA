import { randomBytes } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";
import { loadNeonAdminEnvironment } from "./lib/neonAdminEnv.mjs";

const args = process.argv.slice(2);
if (args.some((argument) => !["--dry-run", "--apply", "--help"].includes(argument))) {
  throw new Error("Usage: node scripts/neon-configure-billing-role.mjs [--dry-run | --apply]");
}
if (args.includes("--help")) {
  console.log("Usage: node scripts/neon-configure-billing-role.mjs [--dry-run | --apply]\nDefault: --dry-run");
  process.exit(0);
}
if (args.includes("--dry-run") && args.includes("--apply")) {
  throw new Error("Choose exactly one of --dry-run or --apply");
}

const apply = args.includes("--apply");
const admin = await loadNeonAdminEnvironment({ requireProductionOptIn: apply });
const directUrl = new URL(admin.databaseUrl);
const pooledValue = admin.values.get("DATABASE_URL");
if (!pooledValue) throw new Error("DATABASE_URL is not configured in the selected admin env file");

let pooledUrl;
try {
  pooledUrl = new URL(pooledValue);
} catch {
  throw new Error("DATABASE_URL must be a valid Postgres URL in the selected admin env file");
}
const normalizeHost = (hostname) => hostname.toLowerCase().replace(/-pooler(?=\.)/u, "");
const isPostgresUrl = (url) => url.protocol === "postgres:" || url.protocol === "postgresql:";
if (!directUrl.hostname.toLowerCase().endsWith(".neon.tech") || !pooledUrl.hostname.toLowerCase().endsWith(".neon.tech")
  || !isPostgresUrl(pooledUrl) || directUrl.username !== "neondb_owner" || pooledUrl.username !== "neondb_owner"
  || normalizeHost(directUrl.hostname) !== normalizeHost(pooledUrl.hostname) || directUrl.pathname !== pooledUrl.pathname) {
  throw new Error("The selected direct and pooled owner URLs must point at the same canonical Neon endpoint");
}

const envUrl = new URL(`../${admin.fileName}`, import.meta.url);
const envContents = await readFile(envUrl, "utf8");
const newline = envContents.includes("\r\n") ? "\r\n" : "\n";

function withBillingWorkerUrl(contents, value) {
  const lines = contents.split(/\r?\n/u);
  const trailingNewline = lines.at(-1) === "";
  if (trailingNewline) lines.pop();
  let found = false;
  const updated = lines.map((line) => {
    if (!/^\s*BILLING_DATABASE_URL=/u.test(line)) return line;
    found = true;
    return `BILLING_DATABASE_URL=${value}`;
  });
  if (!found) updated.push(`BILLING_DATABASE_URL=${value}`);
  return `${updated.join(newline)}${trailingNewline ? newline : ""}`;
}

async function atomicWrite(pathUrl, contents) {
  const tempUrl = new URL(`.${randomBytes(12).toString("hex")}.tmp`, pathUrl);
  try {
    await writeFile(tempUrl, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(tempUrl, pathUrl);
  } catch {
    try { await unlink(tempUrl); } catch { /* The temporary file may not have been created. */ }
    throw new Error("Could not safely update the selected local admin env file");
  }
}

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    envFile: admin.fileName,
    role: "lumina_billing_worker",
    endpointId: admin.endpointId,
    isProduction: admin.isProduction,
    localValuesToWrite: ["BILLING_DATABASE_URL"],
  }, null, 2));
} else {
  const password = randomBytes(48).toString("base64url");
  const workerUrl = new URL(pooledUrl.toString());
  workerUrl.username = "lumina_billing_worker";
  workerUrl.password = password;
  const nextContents = withBillingWorkerUrl(envContents, workerUrl.toString());
  const client = new Client(admin.databaseUrl);

  try {
    try {
      await client.connect();
    } catch {
      throw new Error("Could not connect to the selected Neon endpoint; verify the local admin env file");
    }

    const result = await client.query(
      `select role.rolcanlogin, role.rolsuper, role.rolcreatedb, role.rolcreaterole,
              role.rolreplication, role.rolbypassrls,
              exists (
                select 1
                  from pg_catalog.pg_auth_members m
                 where m.member = role.oid
                    or (
                      m.roleid = role.oid
                      and (
                        m.member <> (select oid from pg_catalog.pg_roles where rolname = current_user)
                        or not m.admin_option
                        or m.inherit_option
                        or m.set_option
                      )
                    )
              ) as has_unexpected_role_memberships,
              exists (
                select 1 from pg_catalog.pg_namespace where nspowner = role.oid
                union all select 1 from pg_catalog.pg_class where relowner = role.oid
                union all select 1 from pg_catalog.pg_proc where proowner = role.oid
                union all select 1 from pg_catalog.pg_database where datdba = role.oid
              ) as owns_database_objects
         from pg_catalog.pg_roles role where role.rolname = $1`,
      ["lumina_billing_worker"],
    );
    const role = result.rows[0];
    if (!role || role.rolcanlogin !== true || role.rolsuper !== false || role.rolcreatedb !== false
      || role.rolcreaterole !== false || role.rolreplication !== false || role.rolbypassrls !== false
      || role.has_unexpected_role_memberships !== false || role.owns_database_objects !== false) {
      throw new Error("The migration must create lumina_billing_worker with restricted privileges before configuration");
    }

    await atomicWrite(envUrl, nextContents);
    try {
      await client.query(`alter role lumina_billing_worker password '${password}'`);
    } catch {
      try { await atomicWrite(envUrl, envContents); }
      catch { throw new Error("Role rotation failed and local credentials could not be restored; do not log or copy credentials"); }
      throw new Error("Could not configure lumina_billing_worker; the previous local admin env file was restored");
    }
    console.log(JSON.stringify({
      mode: "apply",
      envFile: admin.fileName,
      role: "lumina_billing_worker",
      configuredValues: ["BILLING_DATABASE_URL"],
    }, null, 2));
  } finally {
    await client.end();
  }
}
