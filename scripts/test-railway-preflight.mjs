import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const preflightPath = fileURLToPath(new URL("./railway-preflight.mjs", import.meta.url));
const windowsEnvironmentKeys = ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"];
const readyBillingEnvironment = {
  APP_ENV: "staging",
  FEATURE_MEMBER_AUTH: "true",
  FEATURE_BILLING: "true",
  MEMBER_LEGAL_DOCUMENTS_APPROVED: "true",
  BETTER_AUTH_URL: "https://lumina.example.invalid",
  BETTER_AUTH_SECRET: "member-auth-secret-placeholder-32-chars",
  IDENTITY_DATABASE_URL: "postgresql://identity:placeholder@identity.example.invalid/lumina",
  MEMBER_DATABASE_URL: "postgresql://member:placeholder@member.example.invalid/lumina",
  RESEND_API_KEY: "re_placeholder",
  AUTH_EMAIL_FROM: "LUMINA <auth@example.invalid>",
  MEMBER_AUTH_TURNSTILE_SECRET_KEY: "turnstile-secret-placeholder",
  MEMBER_AUTH_TURNSTILE_SITE_KEY: "turnstile-site-placeholder",
  MEMBER_TERMS_VERSION: "member-terms-v1",
  MEMBER_PRIVACY_VERSION: "member-privacy-v1",
  MEMBER_TRANSFER_VERSION: "member-transfer-v1",
  BILLING_DATABASE_URL: "postgresql://lumina_billing_worker:placeholder@billing.example.invalid/lumina",
  TOSS_CLIENT_KEY: "test_ck_placeholder",
  TOSS_SECRET_KEY: "test_sk_placeholder-never-a-real-key",
  BILLING_ENCRYPTION_KEY: "a".repeat(64),
  BILLING_USER_REF_HMAC_KEY: "h".repeat(40),
  BILLING_ENCRYPTION_KEY_VERSION: "1",
  BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
  BILLING_TERMS_VERSION: "billing-terms-v1",
  BILLING_WITHDRAWAL_NOTICE_VERSION: "billing-withdrawal-v1",
  NEXT_PUBLIC_SELLER_NAME: "Example Seller",
  NEXT_PUBLIC_SELLER_REPRESENTATIVE: "Example Representative",
  NEXT_PUBLIC_SELLER_REGISTRATION_NUMBER: "000-00-00000",
  NEXT_PUBLIC_SELLER_MAIL_ORDER_REGISTRATION: "2026-Example-0000",
  NEXT_PUBLIC_SELLER_ADDRESS: "Example address",
  NEXT_PUBLIC_SELLER_PHONE: "000-0000-0000",
  NEXT_PUBLIC_SELLER_CONTACT_EMAIL: "help@example.invalid",
  NEXT_PUBLIC_HOSTING_PROVIDER: "Example Hosting",
};
const sellerDisclosureVariables = Object.keys(readyBillingEnvironment)
  .filter((name) => name.startsWith("NEXT_PUBLIC_"));

function runPreflight(overrides = {}) {
  const env = Object.fromEntries(
    windowsEnvironmentKeys
      .filter((name) => process.env[name] !== undefined)
      .map((name) => [name, process.env[name]]),
  );
  Object.assign(env, { APP_ENV: "production" }, overrides);

  return spawnSync(process.execPath, [preflightPath], {
    encoding: "utf8",
    env,
  });
}

test("reports disabled production Sentry and billing as structured warnings on stdout", () => {
  const result = runPreflight();

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const logLines = result.stdout.trim().split(/\r?\n/u);
  const structuredLogs = logLines.filter((line) => line.startsWith("{"));
  assert.equal(structuredLogs.length, 2);
  assert.deepEqual(structuredLogs.map((line) => JSON.parse(line)), [
    {
      level: "warn",
      message: "Railway preflight warning: Production server-side Sentry reporting is disabled; this process will not send server errors to Sentry.",
      component: "railway-preflight",
      event: "warning",
    },
    {
      level: "warn",
      message: "Railway preflight warning: Production billing checkout is disabled; paid orders cannot be accepted.",
      component: "railway-preflight",
      event: "warning",
    },
  ]);
  assert.match(logLines.at(-1), /Railway preflight passed for production/u);
});

test("reports billing disabled without a Sentry warning when production reporting is configured", () => {
  const result = runPreflight({
    SENTRY_SERVER_ENABLED: "true",
    SENTRY_DSN: "https://example.invalid/1",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes("server errors to Sentry"), false);
  assert.match(result.stdout, /Production billing checkout is disabled/u);
  assert.match(result.stdout, /Railway preflight passed for production/u);
});

test("does not claim startup continues when the Sentry flag is invalid", () => {
  const result = runPreflight({ SENTRY_SERVER_ENABLED: "TRUE" });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout.includes("server errors to Sentry"), false);
  assert.match(result.stdout, /Production billing checkout is disabled/u);
  assert.match(result.stderr, /SENTRY_SERVER_ENABLED must be unset, empty, true, or false/u);
});

test("keeps the Sentry warning accurate when another preflight check blocks startup", () => {
  const result = runPreflight({ FEATURE_DEEP_SAJU: "true" });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /"level":"warn"/u);
  assert.match(result.stdout, /server errors to Sentry/u);
  assert.match(result.stdout, /Production billing checkout is disabled/u);
  assert.doesNotMatch(result.stdout, /startup continues/u);
  assert.match(result.stderr, /deepSaju: feature enablement requires explicit policy approval/u);
});

test("blocks checkout when required billing or member configuration is missing without printing values", () => {
  const secret = "test_sk_sensitive_placeholder_never_print";
  const result = runPreflight({ FEATURE_BILLING: "true", TOSS_SECRET_KEY: secret });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FEATURE_MEMBER_AUTH must be true/u);
  assert.match(result.stderr, /BILLING_DATABASE_URL must be configured/u);
  assert.match(result.stderr, /BILLING_LEGAL_DOCUMENTS_APPROVED must be true/u);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret, "u"));
});

test("accepts complete billing and member configuration without external requests", () => {
  const result = runPreflight(readyBillingEnvironment);

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes('"event":"warning"'), false);
  assert.match(result.stdout, /Railway preflight passed for staging/u);
});

test("blocks checkout until every seller disclosure shown in the site footer is configured", () => {
  assert.equal(sellerDisclosureVariables.length, 8);
  for (const name of sellerDisclosureVariables) {
    const result = runPreflight({ ...readyBillingEnvironment, [name]: " " });
    assert.equal(result.status, 1, `${name} should be required`);
    assert.match(result.stderr, new RegExp(`billing: ${name} must be configured for the seller disclosure footer`, "u"));
  }
});

test("passes every seller disclosure into the Docker build where Next.js inlines public values", () => {
  const dockerfile = readFileSync(fileURLToPath(new URL("../Dockerfile", import.meta.url)), "utf8");
  const builderStage = dockerfile.slice(dockerfile.indexOf("AS builder"), dockerfile.indexOf("pnpm run build"));

  for (const name of sellerDisclosureVariables) {
    assert.match(builderStage, new RegExp(`^ARG ${name}$`, "mu"), `${name} needs a builder ARG`);
    assert.match(builderStage, new RegExp(`${name}=\\$${name}`, "u"), `${name} needs a builder ENV`);
  }
});

function publicVariablesReadBySource(directory) {
  const names = new Set();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      for (const name of publicVariablesReadBySource(entryPath)) names.add(name);
    } else if (/\.(ts|tsx)$/u.test(entry.name) && !/\.test\.(ts|tsx)$/u.test(entry.name)) {
      const source = readFileSync(entryPath, "utf8");
      for (const match of source.matchAll(/process\.env(?:\.|\[["'])(NEXT_PUBLIC_[A-Z0-9_]+)/gu)) {
        names.add(match[1]);
      }
    }
  }
  return names;
}

test("unsets empty NEXT_PUBLIC_* build values so missing build args keep runtime reads", () => {
  const dockerfile = readFileSync(fileURLToPath(new URL("../Dockerfile", import.meta.url)), "utf8");
  const buildLine = dockerfile.slice(dockerfile.lastIndexOf("RUN ", dockerfile.indexOf("pnpm run build")), dockerfile.indexOf("pnpm run build"));
  assert.match(buildLine, /NEXT_PUBLIC_\[A-Z0-9_\]\*\\\)=\$/u, "the build step should select empty NEXT_PUBLIC_* values");
  assert.match(buildLine, /unset "\$name"/u, "the build step should unset them before building");

  // Run the same shell fragment against a fake environment.
  const fragment = buildLine.replace(/^RUN /u, "").replace(/\\\r?\n\s*&&\s*$/u, "").trim();
  const probe = spawnSync("sh", ["-c", `${fragment}; env | grep '^NEXT_PUBLIC_' | sort`], {
    env: { PATH: process.env.PATH, NEXT_PUBLIC_EMPTY: "", NEXT_PUBLIC_SET: "value" },
    encoding: "utf8",
  });
  if (probe.error) return; // no POSIX shell on this host; the regex assertions above still hold
  assert.equal(probe.stdout.trim(), "NEXT_PUBLIC_SET=value");
});

test("passes every NEXT_PUBLIC_* the app reads into the Docker build", () => {
  // Prerendered routes (sitemap.xml, robots.txt) and client bundles read these at
  // build time. A missing ARG silently ships http://localhost:3000 or no tracker.
  const dockerfile = readFileSync(fileURLToPath(new URL("../Dockerfile", import.meta.url)), "utf8");
  const buildStep = dockerfile.indexOf("pnpm run build");
  const builderStage = dockerfile.slice(dockerfile.indexOf("AS builder"), buildStep);
  const names = publicVariablesReadBySource(fileURLToPath(new URL("../src", import.meta.url)));

  assert.ok(buildStep > 0 && builderStage.length > 0, "the Dockerfile builder stage and build step should be found");
  assert.ok(names.has("NEXT_PUBLIC_SITE_URL"), "the source scan should find NEXT_PUBLIC_SITE_URL");
  for (const name of names) {
    assert.match(builderStage, new RegExp(`^ARG ${name}$`, "mu"), `${name} needs a builder ARG`);
    assert.match(builderStage, new RegExp(`${name}=\\$${name}`, "u"), `${name} needs a builder ENV`);
  }
});

test("rejects seller disclosures containing line breaks", () => {
  const result = runPreflight({ ...readyBillingEnvironment, NEXT_PUBLIC_SELLER_ADDRESS: "line one\nline two" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /billing: NEXT_PUBLIC_SELLER_ADDRESS must not contain line breaks/u);
  assert.doesNotMatch(result.stdout + result.stderr, /line one/u);
});

test("requires Toss test keys in staging and live keys in production", () => {
  const productionWithTestKeys = runPreflight({
    ...readyBillingEnvironment,
    APP_ENV: "production",
    SENTRY_SERVER_ENABLED: "true",
    SENTRY_DSN: "https://example.invalid/1",
  });
  assert.equal(productionWithTestKeys.status, 1);
  assert.match(productionWithTestKeys.stderr, /TOSS_CLIENT_KEY must start with live_ck_ for production/u);
  assert.match(productionWithTestKeys.stderr, /TOSS_SECRET_KEY must start with live_sk_ for production/u);
  assert.doesNotMatch(productionWithTestKeys.stdout + productionWithTestKeys.stderr, /test_sk_placeholder-never-a-real-key/u);

  const productionWithLiveKeys = runPreflight({
    ...readyBillingEnvironment,
    APP_ENV: "production",
    SENTRY_SERVER_ENABLED: "true",
    SENTRY_DSN: "https://example.invalid/1",
    TOSS_CLIENT_KEY: "live_ck_placeholder",
    TOSS_SECRET_KEY: "live_sk_placeholder-never-a-real-key",
  });
  assert.equal(productionWithLiveKeys.error, undefined);
  assert.equal(productionWithLiveKeys.status, 0, productionWithLiveKeys.stderr);
  assert.doesNotMatch(productionWithLiveKeys.stdout + productionWithLiveKeys.stderr, /live_sk_placeholder-never-a-real-key/u);
});

test("rejects malformed billing flags and cryptographic configuration", () => {
  const malformedFlag = runPreflight({ FEATURE_BILLING: "TRUE" });
  assert.equal(malformedFlag.status, 1);
  assert.match(malformedFlag.stderr, /FEATURE_BILLING must be unset, empty, true, or false/u);

  const malformedKey = runPreflight({
    ...readyBillingEnvironment,
    BILLING_ENCRYPTION_KEY: "not-a-64-character-hex-key",
    BILLING_USER_REF_HMAC_KEY: "short",
  });
  assert.equal(malformedKey.status, 1);
  assert.match(malformedKey.stderr, /BILLING_ENCRYPTION_KEY must be 64 hexadecimal characters/u);
  assert.match(malformedKey.stderr, /BILLING_USER_REF_HMAC_KEY must contain at least 32 bytes/u);
});
