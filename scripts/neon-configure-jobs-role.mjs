import { randomBytes } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";
import { loadNeonAdminEnvironment } from "./lib/neonAdminEnv.mjs";

const argumentsList = process.argv.slice(2);
if (argumentsList.some((argument) => !["--dry-run", "--apply", "--help"].includes(argument))) {
  throw new Error("Usage: node scripts/neon-configure-jobs-role.mjs [--dry-run | --apply]");
}
if (argumentsList.includes("--help")) {
  console.log("Usage: node scripts/neon-configure-jobs-role.mjs [--dry-run | --apply]\nDefault: --dry-run");
  process.exit(0);
}
if (argumentsList.includes("--dry-run") && argumentsList.includes("--apply")) {
  throw new Error("Choose exactly one of --dry-run or --apply");
}

const apply = argumentsList.includes("--apply");
const admin = await loadNeonAdminEnvironment({ requireProductionOptIn: apply });
const directUrl = new URL(admin.databaseUrl);
const pooledUrlValue = admin.values.get("DATABASE_URL");
if (!pooledUrlValue) throw new Error("DATABASE_URL is not configured in the selected admin env file");

let pooledUrl;
try {
  pooledUrl = new URL(pooledUrlValue);
} catch {
  throw new Error("DATABASE_URL must be a valid Postgres URL in the selected admin env file");
}
const normalizeHost = (hostname) => hostname.toLowerCase().replace(/-pooler(?=\.)/u, "");
const isPostgresUrl = (url) => url.protocol === "postgres:" || url.protocol === "postgresql:";
if (!directUrl.hostname.toLowerCase().endsWith(".neon.tech")
  || !pooledUrl.hostname.toLowerCase().endsWith(".neon.tech")) {
  throw new Error("Both owner URLs must use canonical Neon hostnames");
}
if (!isPostgresUrl(pooledUrl)) {
  throw new Error("DATABASE_URL must use the Postgres protocol");
}
if (directUrl.username !== "neondb_owner" || pooledUrl.username !== "neondb_owner") {
  throw new Error("Both owner URLs must use the neondb_owner role");
}
if (normalizeHost(directUrl.hostname) !== normalizeHost(pooledUrl.hostname)) {
  throw new Error("The pooled and direct owner URLs must point to the same Neon endpoint");
}
if (directUrl.pathname !== pooledUrl.pathname) {
  throw new Error("The pooled and direct owner URLs must target the same database");
}

const fileUrl = new URL(`../${admin.fileName}`, import.meta.url);
const envContents = await readFile(fileUrl, "utf8");
const newline = envContents.includes("\r\n") ? "\r\n" : "\n";

function updatedEnvContents(contents, updates) {
  const lines = contents.split(/\r?\n/u);
  const trailingNewline = lines.at(-1) === "";
  if (trailingNewline) lines.pop();

  const written = new Set();
  const updated = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/u);
    if (!match || !updates.has(match[1])) return line;
    written.add(match[1]);
    return `${match[1]}=${updates.get(match[1])}`;
  });
  for (const [key, value] of updates) {
    if (!written.has(key)) updated.push(`${key}=${value}`);
  }

  return `${updated.join(newline)}${trailingNewline ? newline : ""}`;
}

async function atomicWrite(fileUrlToWrite, contents) {
  const filePath = new URL(fileUrlToWrite);
  const temporaryPath = new URL(`.${randomBytes(12).toString("hex")}.tmp`, filePath);
  try {
    await writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporaryPath, filePath);
  } catch {
    try { await unlink(temporaryPath); } catch { /* The temporary file may not have been created. */ }
    throw new Error("Could not safely update the selected local admin env file");
  }
}

if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    envFile: admin.fileName,
    role: "lumina_jobs_worker",
    localValuesToWrite: ["ANALYTICS_ROLLUP_DATABASE_URL", "ANALYTICS_ROLLUP_DATABASE_URL_UNPOOLED"],
  }, null, 2));
} else {
  const password = randomBytes(48).toString("base64url");
  const workerDirectUrl = new URL(directUrl.toString());
  workerDirectUrl.username = "lumina_jobs_worker";
  workerDirectUrl.password = password;
  const workerPooledUrl = new URL(pooledUrl.toString());
  workerPooledUrl.username = "lumina_jobs_worker";
  workerPooledUrl.password = password;

  const updates = new Map([
    ["ANALYTICS_ROLLUP_DATABASE_URL", workerPooledUrl.toString()],
    ["ANALYTICS_ROLLUP_DATABASE_URL_UNPOOLED", workerDirectUrl.toString()],
  ]);
  const nextContents = updatedEnvContents(envContents, updates);
  const client = new Client(admin.databaseUrl);

  try {
    try {
      await client.connect();
    } catch {
      throw new Error("Could not connect to the selected Neon endpoint; verify the local admin env file");
    }

    const result = await client.query(
      `select
         role.rolcanlogin,
         role.rolsuper,
         role.rolcreatedb,
         role.rolcreaterole,
         role.rolreplication,
         role.rolbypassrls,
         exists (
           select 1 from pg_catalog.pg_auth_members membership
            where membership.member = role.oid
         ) as has_role_memberships,
         exists (
           select 1 from pg_catalog.pg_namespace where nspowner = role.oid
           union all
           select 1 from pg_catalog.pg_class where relowner = role.oid
           union all
           select 1 from pg_catalog.pg_proc where proowner = role.oid
           union all
           select 1 from pg_catalog.pg_database where datdba = role.oid
         ) as owns_database_objects
         from pg_catalog.pg_roles role
        where role.rolname = $1`,
      ["lumina_jobs_worker"],
    );
    const role = result.rows[0];
    if (!role || role.rolcanlogin !== true || role.rolsuper !== false
      || role.rolcreatedb !== false || role.rolcreaterole !== false
      || role.rolreplication !== false || role.rolbypassrls !== false
      || role.has_role_memberships !== false || role.owns_database_objects !== false) {
      throw new Error("The migration must create lumina_jobs_worker with restricted login attributes before configuration");
    }

    await atomicWrite(fileUrl, nextContents);
    try {
      await client.query(`alter role lumina_jobs_worker password '${password}'`);
    } catch {
      try {
        await atomicWrite(fileUrl, envContents);
      } catch {
        throw new Error("Role rotation failed and the local admin env file could not be restored; do not log or copy credentials");
      }
      throw new Error("Could not configure lumina_jobs_worker; the previous local admin env file was restored");
    }

    console.log(JSON.stringify({
      mode: "apply",
      envFile: admin.fileName,
      role: "lumina_jobs_worker",
      configuredValues: Array.from(updates.keys()),
    }, null, 2));
  } finally {
    await client.end();
  }
}
