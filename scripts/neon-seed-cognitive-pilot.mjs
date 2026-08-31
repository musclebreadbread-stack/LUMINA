import { readFile } from "node:fs/promises";
import { Client } from "@neondatabase/serverless";

const envFile = process.env.NEON_ENV_FILE ?? ".env.staging.admin.local";
const allowedEnvFiles = [".env.staging.admin.local", ".env.production.admin.local", ".env.local"];
if (!allowedEnvFiles.includes(envFile)) throw new Error("Pilot seed requires an approved admin env file");

const envPath = new URL(`../${envFile}`, import.meta.url);
const envContents = await readFile(envPath, "utf8");
for (const line of envContents.split(/\r?\n/u)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
  if (!match || process.env[match[1]] !== undefined) continue;
  process.env[match[1]] = match[2].replace(/^"|"$/gu, "");
}

if ([".env.production.admin.local", ".env.local"].includes(envFile) && process.env.NEON_ALLOW_PRODUCTION !== "1") {
  throw new Error("Refusing to seed production without NEON_ALLOW_PRODUCTION=1");
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED is not configured");

const { ITEM_BANK, CANDIDATE_NORM, ITEM_BANK_EXPECTED_COUNT, ITEM_BANK_EXPECTED_PER_DOMAIN, optionFigureSignature } = await import("../neon/seeds/cognitive-pilot-v1.mjs");
const domains = ["gf", "gc", "gv", "gwm", "gs"];

function assertItemBank() {
  if (ITEM_BANK.length !== ITEM_BANK_EXPECTED_COUNT) throw new Error("pilot item count does not match the blueprint");
  const ids = new Set();
  const counts = Object.fromEntries(domains.map((domain) => [domain, 0]));
  for (const item of ITEM_BANK) {
    if (ids.has(item.version_id)) throw new Error(`duplicate pilot item id: ${item.version_id}`);
    ids.add(item.version_id);
    if (!domains.includes(item.domain)) throw new Error(`invalid pilot domain: ${item.domain}`);
    counts[item.domain] += 1;
    if (item.status !== "pilot" || item.item_bank_version !== "cognitive-pilot-v1" || item.calibration_version !== "ko-adult-pilot-2026-08") {
      throw new Error(`pilot item metadata mismatch: ${item.version_id}`);
    }
    if (!item.presentation || item.presentation.domain !== item.domain || !Array.isArray(item.presentation.options) || item.presentation.options.length < 2) {
      throw new Error(`invalid pilot presentation: ${item.version_id}`);
    }
    const optionIds = new Set(item.presentation.options.map((entry) => entry.id));
    if (optionIds.size !== item.presentation.options.length || !optionIds.has(item.correct_option_id)) {
      throw new Error(`pilot answer key does not match options: ${item.version_id}`);
    }
    const visualSignatures = new Map();
    for (const option of item.presentation.options) {
      const signature = optionFigureSignature(option.figure);
      if (signature === null) continue;
      const previousOptionId = visualSignatures.get(signature);
      if (previousOptionId !== undefined) {
        throw new Error(`visually overlapping pilot options: ${item.version_id} (${previousOptionId}, ${option.id})`);
      }
      visualSignatures.set(signature, option.id);
    }
    const parameters = item.parameters;
    if (!parameters || !Number.isFinite(parameters.discrimination) || parameters.discrimination <= 0 || !Number.isFinite(parameters.difficulty) || !Number.isFinite(parameters.guessing) || parameters.guessing < 0 || parameters.guessing >= 1) {
      throw new Error(`invalid provisional IRT parameters: ${item.version_id}`);
    }
    if (!item.metadata || item.metadata.calibrationStatus !== "provisional_start_value" || item.metadata.calibrationSampleSize !== 0 || item.metadata.releaseConstraint !== "pilot_only_no_iq_or_percentile") {
      throw new Error(`pilot item must carry provisional calibration metadata: ${item.version_id}`);
    }
  }
  for (const domain of domains) {
    if (counts[domain] !== ITEM_BANK_EXPECTED_PER_DOMAIN[domain]) throw new Error(`pilot coverage mismatch: ${domain}`);
  }
}

assertItemBank();

if (process.argv.includes("--dry-run")) {
  console.log(`Cognitive pilot seed validated locally: ${ITEM_BANK.length} items across ${domains.length} domains.`);
  process.exit(0);
}

const client = new Client(databaseUrl);
await client.connect();
try {
  await client.query("begin");
  for (const item of ITEM_BANK) {
    await client.query(
      `insert into private_cognitive.item_versions
        (version_id, item_bank_version, calibration_version, domain, status, presentation, parameters, exposure_rate, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9::jsonb)
       on conflict (version_id) do update set
         item_bank_version = excluded.item_bank_version,
         calibration_version = excluded.calibration_version,
         domain = excluded.domain,
         status = excluded.status,
         presentation = excluded.presentation,
         parameters = excluded.parameters,
         exposure_rate = excluded.exposure_rate,
         metadata = excluded.metadata`,
      [
        item.version_id,
        item.item_bank_version,
        item.calibration_version,
        item.domain,
        item.status,
        JSON.stringify(item.presentation),
        JSON.stringify(item.parameters),
        item.exposure_rate,
        JSON.stringify(item.metadata),
      ],
    );
    await client.query(
      `insert into private_cognitive.answer_keys (version_id, correct_option_id)
       values ($1, $2)
       on conflict (version_id) do update set correct_option_id = excluded.correct_option_id`,
      [item.version_id, item.correct_option_id],
    );
  }

  await client.query(
    `insert into private_cognitive.norm_releases
      (id, status, target_population, item_bank_version, algorithm_version, norm_payload, validation_manifest_hash, approved_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     on conflict (id) do update set
       status = excluded.status,
       target_population = excluded.target_population,
       item_bank_version = excluded.item_bank_version,
       algorithm_version = excluded.algorithm_version,
       norm_payload = excluded.norm_payload,
       validation_manifest_hash = excluded.validation_manifest_hash,
       approved_at = excluded.approved_at`,
    [
      CANDIDATE_NORM.id,
      CANDIDATE_NORM.status,
      CANDIDATE_NORM.target_population,
      CANDIDATE_NORM.item_bank_version,
      CANDIDATE_NORM.algorithm_version,
      JSON.stringify(CANDIDATE_NORM.norm_payload),
      CANDIDATE_NORM.validation_manifest_hash,
      CANDIDATE_NORM.approved_at,
    ],
  );

  await client.query("commit");
  const counts = await client.query(
    `select domain, count(*)::int as count
       from private_cognitive.item_versions
      where item_bank_version = $1 and calibration_version = $2 and status = 'pilot'
      group by domain order by domain`,
    ["cognitive-pilot-v1", "ko-adult-pilot-2026-08"],
  );
  console.log(`Neon cognitive pilot bank seeded: ${ITEM_BANK.length} items; domains=${JSON.stringify(counts.rows)}`);
  console.log(`Norm release remains candidate: ${CANDIDATE_NORM.id}`);
} catch (error) {
  try { await client.query("rollback"); } catch { /* preserve original error */ }
  throw error;
} finally {
  await client.end();
}
