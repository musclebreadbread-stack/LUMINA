import { readdir, readFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";

const envFile = process.env.NEON_ENV_FILE ?? ".env.staging.admin.local";
const envPath = new URL(`../${envFile}`, import.meta.url);
const envContents = await readFile(envPath, "utf8");
for (const line of envContents.split(/\r?\n/u)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
  if (!match || process.env[match[1]] !== undefined) continue;
  const rawValue = match[2];
  process.env[match[1]] = rawValue.replace(/^"|"$/gu, "");
}

if (![".env.staging.admin.local", ".env.production.admin.local", ".env.local"].includes(envFile)) {
  throw new Error("Migrations require an admin env file; runtime env files are not accepted");
}
if ([".env.production.admin.local", ".env.local"].includes(envFile) && process.env.NEON_ALLOW_PRODUCTION !== "1") {
  throw new Error("Refusing to migrate production without NEON_ALLOW_PRODUCTION=1");
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED is not configured");

const migrationsDirectory = new URL("../neon/migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+_[A-Za-z0-9_-]+\.sql$/u.test(file))
  .sort();
if (migrationFiles.length === 0) throw new Error("No Neon migrations found");
const client = new Client(databaseUrl);

try {
  await client.connect();
  for (const migrationFile of migrationFiles) {
    const migrationSql = await readFile(new URL(migrationFile, migrationsDirectory), "utf8");
    await client.query(migrationSql);
    console.log(`Neon migration applied: ${migrationFile}`);
  }
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Preserve the original migration error.
  }
  throw error;
} finally {
  await client.end();
}
