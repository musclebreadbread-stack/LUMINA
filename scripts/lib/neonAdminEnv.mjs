import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const ADMIN_ENV_FILES = new Set([
  ".env.staging.admin.local",
  ".env.production.admin.local",
]);

const AMBIENT_DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "ANALYTICS_ROLLUP_DATABASE_URL",
  "ANALYTICS_ROLLUP_DATABASE_URL_UNPOOLED",
  "AI_DATABASE_URL",
];

function parseEnv(contents) {
  const values = new Map();
  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!key || rawValue === undefined) continue;
    values.set(key, rawValue.replace(/^"|"$/gu, ""));
  }
  return values;
}

function databaseUrl(value, key) {
  if (!value) throw new Error(`${key} is not configured in the selected admin env file`);

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid Postgres URL`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${key} must use the Postgres protocol`);
  }
  if (!parsed.hostname || !parsed.username) {
    throw new Error(`${key} must include a database endpoint and role`);
  }

  return parsed;
}

function endpointIdFromUrl(value, key) {
  const parsed = databaseUrl(value, key);
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith(".neon.tech")) {
    throw new Error(`${key} must use a canonical Neon hostname`);
  }
  const endpointId = hostname.split(".")[0]?.replace(/-pooler$/u, "");
  if (!endpointId) throw new Error(`${key} does not contain a recognizable database endpoint`);
  return endpointId;
}

async function readEnvFile(fileName) {
  const fileUrl = new URL(`../../${fileName}`, import.meta.url);
  return parseEnv(await readFile(fileUrl, "utf8"));
}

/**
 * Loads an approved local Neon admin env file without inheriting a database URL
 * from the invoking shell. Only endpoint identifiers are compared or returned;
 * connection strings must never be logged.
 */
export async function loadNeonAdminEnvironment({
  databaseUrlKey = "DATABASE_URL_UNPOOLED",
  expectedRole = "neondb_owner",
  requireProductionOptIn = false,
} = {}) {
  for (const key of AMBIENT_DATABASE_URL_KEYS) {
    if (process.env[key] !== undefined) {
      throw new Error(`Refusing to use shell-provided ${key}; select a reviewed admin env file`);
    }
  }

  const fileName = process.env.NEON_ENV_FILE ?? ".env.staging.admin.local";
  if (!ADMIN_ENV_FILES.has(fileName)) {
    throw new Error("Neon admin commands require .env.staging.admin.local or .env.production.admin.local");
  }

  const values = await readEnvFile(fileName);
  const selectedUrl = databaseUrl(values.get(databaseUrlKey), databaseUrlKey);
  if (expectedRole !== null && selectedUrl.username !== expectedRole) {
    throw new Error(`${databaseUrlKey} must use the ${expectedRole} role`);
  }

  let productionValues;
  try {
    productionValues = await readEnvFile(".env.production.admin.local");
  } catch {
    throw new Error("The production admin env file is required to verify the selected endpoint");
  }

  const productionUrlValue = productionValues.get("DATABASE_URL_UNPOOLED");
  const productionEndpointId = productionUrlValue
    ? endpointIdFromUrl(productionUrlValue, "production DATABASE_URL_UNPOOLED")
    : undefined;
  if (!productionEndpointId) {
    throw new Error("The production admin env file must configure DATABASE_URL_UNPOOLED");
  }

  const selectedEndpointId = endpointIdFromUrl(selectedUrl.toString(), databaseUrlKey);
  const isProduction = selectedEndpointId === productionEndpointId;
  if (fileName === ".env.production.admin.local" && !isProduction) {
    throw new Error("The production admin env file does not point at the configured production endpoint");
  }
  if (fileName === ".env.staging.admin.local" && isProduction) {
    throw new Error("The staging admin env file points at the production endpoint");
  }
  if (requireProductionOptIn && isProduction && process.env.NEON_ALLOW_PRODUCTION !== "1") {
    throw new Error("Refusing a production database write without NEON_ALLOW_PRODUCTION=1");
  }

  return {
    fileName,
    values,
    databaseUrl: selectedUrl.toString(),
    endpointId: selectedEndpointId,
    isProduction,
  };
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
