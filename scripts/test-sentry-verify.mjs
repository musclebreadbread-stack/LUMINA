import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptPath = fileURLToPath(new URL("./sentry-verify.mjs", import.meta.url));
const windowsEnvironmentKeys = ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"];
const syntheticDsn = "https://synthetic-public-key@example.invalid/123";

function run(overrides = {}, args = []) {
  const env = Object.fromEntries(
    windowsEnvironmentKeys.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]),
  );
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8", env: { ...env, ...overrides } });
}

test("refuses to verify without a DSN, environment, or enabled server reporting", () => {
  const result = run();

  assert.equal(result.status, 1);
  assert.match(result.stderr, /SENTRY_DSN must be configured/u);
  assert.match(result.stderr, /APP_ENV must be staging or production/u);
  assert.match(result.stderr, /SENTRY_SERVER_ENABLED must be true/u);
});

test("rejects non-https DSNs without printing them", () => {
  const result = run({ SENTRY_DSN: "http://leaky-key@example.invalid/1", APP_ENV: "production", SENTRY_SERVER_ENABLED: "true" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /https DSN/u);
  assert.doesNotMatch(result.stdout + result.stderr, /leaky-key/u);
});

test("only checks configuration and sends nothing unless --send is given", () => {
  const result = run({ SENTRY_DSN: syntheticDsn, APP_ENV: "staging", SENTRY_SERVER_ENABLED: "true" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /rerun with --send/u);
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-public-key/u);
});

test("rejects unknown arguments", () => {
  const result = run({}, ["--dsn=anything"]);

  assert.equal(result.status, 64);
});
