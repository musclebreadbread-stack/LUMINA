import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Client } from "@neondatabase/serverless";

const envFile = process.env.NEON_ENV_FILE ?? ".env.staging.local";
if (![".env.staging.local", ".env.local"].includes(envFile)) {
  throw new Error("This command only accepts .env.staging.local or an explicitly approved .env.local");
}
if (envFile === ".env.local" && process.env.NEON_ALLOW_PRODUCTION !== "1") {
  throw new Error("Refusing to configure the production role without NEON_ALLOW_PRODUCTION=1");
}

const envText = await readFile(envFile, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/u)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
  if (!match) continue;
  env[match[1]] = match[2].replace(/^"|"$/gu, "");
}

const ownerDirectUrl = env.DATABASE_URL_UNPOOLED;
const ownerPooledUrl = env.DATABASE_URL;
if (!ownerDirectUrl || !ownerPooledUrl) {
  throw new Error(`DATABASE_URL and DATABASE_URL_UNPOOLED are required in ${envFile}`);
}

const ownerDirect = new URL(ownerDirectUrl);
const ownerPooled = new URL(ownerPooledUrl);
if (ownerDirect.username !== "neondb_owner" || ownerPooled.username !== "neondb_owner") {
  throw new Error(`Refusing to rotate the role unless both ${envFile} URLs use neondb_owner`);
}

const roleName = "lumina_cognitive_app";
const password = randomBytes(36).toString("base64url");
const escapedPassword = password.replaceAll("'", "''");
const client = new Client(ownerDirect.toString());

try {
  await client.connect();
  await client.query(`alter role ${roleName} login password '${escapedPassword}'`);
  const roleResult = await client.query(`
    select rolname, rolsuper, rolbypassrls, rolcanlogin
      from pg_roles
     where rolname = '${roleName}'
  `);
  const role = roleResult.rows[0];
  if (!role || role.rolsuper || role.rolbypassrls || !role.rolcanlogin) {
    throw new Error("Dedicated role did not retain the expected restricted attributes");
  }
} finally {
  await client.end();
}

const roleDirect = new URL(ownerDirect.toString());
roleDirect.username = roleName;
roleDirect.password = password;
const rolePooled = new URL(ownerPooled.toString());
rolePooled.username = roleName;
rolePooled.password = password;

const updates = new Map([
  ["DATABASE_URL", rolePooled.toString()],
  ["DATABASE_URL_UNPOOLED", roleDirect.toString()],
]);
const lines = envText.split(/\r?\n/u);
const seen = new Set();
const updatedLines = lines.map((line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/u);
  if (!match || !updates.has(match[1])) return line;
  seen.add(match[1]);
  return `${match[1]}=${updates.get(match[1])}`;
});
for (const [key, value] of updates) {
  if (!seen.has(key)) updatedLines.push(`${key}=${value}`);
}
await writeFile(envFile, updatedLines.join("\n"), "utf8");

console.log(JSON.stringify({
  file: envFile,
  role: roleName,
  pooledHost: rolePooled.host,
  directHost: roleDirect.host,
  passwordLength: password.length,
}));
