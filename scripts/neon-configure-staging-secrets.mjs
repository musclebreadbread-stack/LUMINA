import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const envFile = process.env.NEON_ENV_FILE ?? ".env.staging.local";
if (![".env.staging.local", ".env.local"].includes(envFile)) {
  throw new Error("This command only accepts .env.staging.local or an explicitly approved .env.local");
}
if (envFile === ".env.local" && process.env.NEON_ALLOW_PRODUCTION !== "1") {
  throw new Error("Refusing to configure production secrets without NEON_ALLOW_PRODUCTION=1");
}

const envText = await readFile(envFile, "utf8");
const requiredKeys = ["COGNITIVE_SUBJECT_COOKIE_SECRET", "NEON_AUTH_COOKIE_SECRET"];
const values = new Map();
for (const line of envText.split(/\r?\n/u)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
  if (match) values.set(match[1], match[2].replace(/^"|"$/gu, ""));
}

const generated = [];
for (const key of requiredKeys) {
  const current = values.get(key);
  if (current && current.length >= 32) continue;
  const secret = randomBytes(32).toString("base64url");
  values.set(key, secret);
  generated.push(key);
}

if (generated.length > 0) {
  const lines = envText.split(/\r?\n/u);
  const seen = new Set();
  const updatedLines = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/u);
    if (!match || !values.has(match[1]) || !requiredKeys.includes(match[1])) return line;
    seen.add(match[1]);
    return `${match[1]}=${values.get(match[1])}`;
  });
  for (const key of requiredKeys) {
    if (!seen.has(key)) updatedLines.push(`${key}=${values.get(key)}`);
  }
  await writeFile(envFile, updatedLines.join("\n"), "utf8");
}

console.log(JSON.stringify({
  file: envFile,
  generated,
  lengths: Object.fromEntries(requiredKeys.map((key) => [key, values.get(key)?.length ?? 0])),
}));
