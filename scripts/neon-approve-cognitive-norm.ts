import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "@neondatabase/serverless";

// Node's native strip-types runner requires the explicit `.ts` extension here;
// the script is not bundled into the client.
// @ts-expect-error TS5097 is intentional for the Node strip-types entrypoint.
import { parseNormTablePayload, parseReleaseManifest, parseReviewRecord } from "../src/lib/cognitiveNormApproval.ts";

const NORM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function requireArgument(name: string): string {
  const value = argument(name);
  if (value === undefined) throw new Error(`--${name} is required`);
  return value;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function readJson(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8");
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return JSON.parse(withoutBom);
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function loadAdminEnv(): void {
  const envFile = process.env.NEON_ENV_FILE ?? ".env.staging.admin.local";
  if (![".env.staging.admin.local", ".env.production.admin.local", ".env.local"].includes(envFile)) {
    throw new Error("Norm approval requires an admin env file; runtime env files are not accepted");
  }
  if ([".env.production.admin.local", ".env.local"].includes(envFile) && process.env.NEON_ALLOW_PRODUCTION !== "1") {
    throw new Error("Refusing to approve a production norm release without NEON_ALLOW_PRODUCTION=1");
  }
}

async function main(): Promise<void> {
  const normId = requireArgument("norm-id");
  if (!NORM_ID_PATTERN.test(normId)) throw new Error("--norm-id has an invalid format");

  const manifest = parseReleaseManifest(await readJson(requireArgument("release-manifest")));
  const payload = parseNormTablePayload(await readJson(requireArgument("norm-payload")), manifest);
  const review = parseReviewRecord(await readJson(requireArgument("review-record")));

  const payloadText = JSON.stringify(payload);
  const manifestHash = sha256(JSON.stringify(manifest));
  const payloadHash = sha256(payloadText);
  const combinedHash = sha256(`${manifestHash}:${payloadHash}`);
  const ages = payload.byAge.flatMap((row) => [row.minimumAge, row.maximumAge]);

  console.log("Cognitive norm approval — summary");
  console.log(`  norm id:            ${normId}`);
  console.log(`  item bank version:  ${manifest.itemBankVersion}`);
  console.log(`  algorithm version:  ${manifest.algorithmVersion}`);
  console.log(`  manifest status:    ${manifest.status}`);
  console.log(`  age bands:          ${payload.byAge.length} (${Math.min(...ages)}-${Math.max(...ages)})`);
  console.log(`  manifest hash:      ${manifestHash}`);
  console.log(`  payload hash:       ${payloadHash}`);
  console.log(`  reviewer:           ${review.reviewer}`);
  console.log(`  review date:        ${review.date}`);
  console.log(`  review statement:   ${review.statement}`);

  if (!flag("confirm")) {
    console.log("\nDry run only — no database write happened. Re-run with --confirm to approve.");
    return;
  }

  loadAdminEnv();
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED is not configured");

  const client = new Client(databaseUrl);
  try {
    await client.connect();
    await client.query("begin");
    await client.query(
      `insert into private_cognitive.norm_releases
         (id, status, target_population, item_bank_version, algorithm_version, norm_payload, validation_manifest_hash, approved_at)
       values ($1, 'approved', 'ko-adults-18-64', $2, $3, $4::jsonb, $5, now())`,
      [normId, manifest.itemBankVersion, manifest.algorithmVersion, payloadText, combinedHash],
    );
    await client.query(
      `insert into private_cognitive.audit_events (event_type, metadata)
       values ('cognitive_norm_release_approved', $1::jsonb)`,
      [JSON.stringify({ normId, reviewer: review.reviewer, reviewDate: review.date, statement: review.statement, manifestHash, payloadHash })],
    );
    await client.query("commit");
    console.log(`\nApproved. private_cognitive.norm_releases.id = ${normId}`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "cognitive norm approval failed"}\n`);
  process.exitCode = 1;
});
