import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const preflightPath = fileURLToPath(new URL("./railway-preflight.mjs", import.meta.url));
const windowsEnvironmentKeys = ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"];

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

test("reports disabled production Sentry as a structured warning on stdout", () => {
  const result = runPreflight();

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");

  const logLines = result.stdout.trim().split(/\r?\n/u);
  const structuredLogs = logLines.filter((line) => line.startsWith("{"));
  assert.equal(structuredLogs.length, 1);
  assert.deepEqual(JSON.parse(structuredLogs[0]), {
    level: "warn",
    message: "Railway preflight warning: Production server-side Sentry reporting is disabled; this process will not send server errors to Sentry.",
    component: "railway-preflight",
    event: "warning",
  });
  assert.match(logLines.at(-1), /Railway preflight passed for production/u);
});

test("does not emit a Sentry warning when production reporting is configured", () => {
  const result = runPreflight({
    SENTRY_SERVER_ENABLED: "true",
    SENTRY_DSN: "https://example.invalid/1",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.includes('"event":"warning"'), false);
  assert.match(result.stdout, /Railway preflight passed for production/u);
});

test("does not claim startup continues when the Sentry flag is invalid", () => {
  const result = runPreflight({ SENTRY_SERVER_ENABLED: "TRUE" });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.equal(result.stdout.includes('"event":"warning"'), false);
  assert.match(result.stderr, /SENTRY_SERVER_ENABLED must be unset, empty, true, or false/u);
});

test("keeps the Sentry warning accurate when another preflight check blocks startup", () => {
  const result = runPreflight({ FEATURE_DEEP_SAJU: "true" });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /"level":"warn"/u);
  assert.match(result.stdout, /server errors to Sentry/u);
  assert.doesNotMatch(result.stdout, /startup continues/u);
  assert.match(result.stderr, /deepSaju: feature enablement requires explicit policy approval/u);
});
