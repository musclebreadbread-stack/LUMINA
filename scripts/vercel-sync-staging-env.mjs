import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const projectFile = await readFile(".vercel/project.json", "utf8");
const project = JSON.parse(projectFile);
if (project.projectName !== "lumina-cognitive") {
  throw new Error("Refusing to sync env for an unexpected Vercel project");
}

const envFile = ".env.staging.local";
const envText = await readFile(envFile, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/u)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
  if (match) env[match[1]] = match[2].replace(/^"|"$/gu, "");
}

const keys = [
  "NEON_BRANCH",
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_JWKS_URL",
  "COGNITIVE_SUBJECT_COOKIE_SECRET",
  "NEON_AUTH_COOKIE_SECRET",
];
for (const key of keys) {
  if (!env[key]) throw new Error(`${key} is missing from ${envFile}`);
}

const sensitiveKeys = new Set(keys.filter((key) => key !== "NEON_BRANCH"));
const command = process.platform === "win32" ? "vercel.cmd" : "vercel";

function addEnv(key) {
  return new Promise((resolve, reject) => {
    const args = [
      "env",
      "add",
      key,
      "preview,development",
      "--project",
      project.projectId,
      "--force",
      "--yes",
      sensitiveKeys.has(key) ? "--sensitive" : "--no-sensitive",
    ];
    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "ignore"],
      shell: process.platform === "win32",
    });
    let settled = false;
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else reject(new Error(`vercel env add failed for ${key}`));
    });
    child.stdin.end(`${env[key]}\n`);
  });
}

for (const key of keys) await addEnv(key);
console.log(JSON.stringify({ project: project.projectName, environments: ["preview", "development"], keys }));
