import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRailway10MinTasks } from "./railway-10min-jobs.mjs";
import { createRailwayDailyTasks } from "./railway-daily-jobs.mjs";
import { runRailwayCron } from "./lib/railwayCronRun.mjs";
import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";

const TEST_SECRET = "unit-test-only-secret-value-long-enough";

test("Docker runtime dispatches Railway cron services and packages their shared imports", () => {
  const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");

  assert.match(dockerfile, /\/app\/scripts\/lib\/railway\*\.mjs \.\/scripts\/lib\//);
  assert.match(dockerfile, /RAILWAY_SERVICE_NAME/);
  assert.match(dockerfile, /cron-10min\) exec node scripts\/railway-10min-jobs\.mjs/);
  assert.match(dockerfile, /cron-daily\) exec node scripts\/railway-daily-jobs\.mjs/);
  assert.match(dockerfile, /web\) node scripts\/railway-preflight\.mjs && exec node server\.js/);
  assert.match(dockerfile, /Unsupported LUMINA Railway service name/);
});

async function withInternalRequestEnvironment(overrides, run) {
  const values = {
    APP_ENV: "production",
    INTERNAL_WEB_ORIGIN: "https://web.example.com",
    CRON_SECRET: TEST_SECRET,
    ...overrides,
  };
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("logs a structured completion summary with enabled and skipped task counts", async () => {
  const entries = [];
  let currentTime = 1_000;
  await runRailwayCron({
    schedule: "test",
    tasks: [
      { name: "analytics_rollup", enabled: true, run: async () => { currentTime += 8; } },
      {
        name: "billing_reconcile",
        enabled: false,
        disabledBy: ["BILLING_RECONCILE_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"],
        run: async () => assert.fail("disabled job ran"),
      },
    ],
    log: (line) => entries.push(JSON.parse(line)),
    now: () => currentTime,
  });

  assert.deepEqual(entries.map((entry) => entry.event), [
    "run_started",
    "task_started",
    "task_completed",
    "run_completed",
  ]);
  assert.deepEqual(
    (({ scheduledTaskCount, enabledTaskCount, skippedTaskCount }) => ({
      scheduledTaskCount,
      enabledTaskCount,
      skippedTaskCount,
    }))(entries[0]),
    { scheduledTaskCount: 2, enabledTaskCount: 1, skippedTaskCount: 1 },
  );
  assert.deepEqual(
    (({ succeededTaskCount, skippedTaskCount }) => ({ succeededTaskCount, skippedTaskCount }))(entries.at(-1)),
    { succeededTaskCount: 1, skippedTaskCount: 1 },
  );
  assert.deepEqual(entries[0].skippedTasks, [{
    name: "billing_reconcile",
    disabledBy: ["BILLING_RECONCILE_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"],
  }]);
  assert.deepEqual(entries.at(-1).skippedTasks, entries[0].skippedTasks);
  assert.equal(entries[2].durationMs, 8);
});

test("logs task failure without serializing the thrown error and stops later jobs", async () => {
  const entries = [];
  const attempted = [];
  const privateFailureDetail = new Error("sensitive-url-and-token-must-not-be-logged");

  await assert.rejects(runRailwayCron({
    schedule: "test",
    tasks: [
      { name: "disabled_job", enabled: false, disabledBy: ["POLICY_APPROVAL_VARIABLE"] },
      { name: "analytics_rollup", enabled: true, run: async () => attempted.push("analytics") },
      { name: "billing_reconcile", enabled: true, run: async () => { throw privateFailureDetail; } },
      { name: "later_job", enabled: true, run: async () => attempted.push("later") },
    ],
    log: (line) => entries.push(JSON.parse(line)),
    now: () => 2_000,
  }), (error) => error === privateFailureDetail);

  assert.deepEqual(attempted, ["analytics"]);
  assert.deepEqual(entries.map((entry) => entry.event), [
    "run_started",
    "task_started",
    "task_completed",
    "task_started",
    "task_failed",
    "run_failed",
  ]);
  assert.equal(entries.at(-1).succeededTaskCount, 1);
  assert.equal(entries.at(-1).notStartedTaskCount, 1);
  assert.deepEqual(entries.at(-1).skippedTasks, [{
    name: "disabled_job",
    disabledBy: ["POLICY_APPROVAL_VARIABLE"],
  }]);
  assert.equal(JSON.stringify(entries).includes("sensitive-url-and-token-must-not-be-logged"), false);
});

test("10-minute jobs remain disabled unless every required product and legal gate is true", () => {
  const baseline = createRailway10MinTasks({});
  assert.deepEqual(baseline.map((task) => task.enabled), [false, false, false]);
  assert.deepEqual(baseline.map((task) => task.disabledBy), [
    ["BILLING_RECEIPTS_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"],
    [
      "FEATURE_AI_NARRATIVE",
      "AI_NARRATIVE_LEGAL_APPROVED",
      "AI_GOLDEN_SET_APPROVED",
      "AI_FACT_SOURCES_APPROVED",
      "AI_LICENSE_APPROVED",
      "YEAR_FORECAST_EXPERT_REVIEW_APPROVED",
    ],
    ["SUBSCRIPTION_ENABLED", "SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", "TOSS_BILLING_APPROVED"],
  ]);

  const fullyApproved = createRailway10MinTasks({
    BILLING_RECEIPTS_ENABLED: "true",
    BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
    FEATURE_AI_NARRATIVE: "true",
    AI_NARRATIVE_LEGAL_APPROVED: "true",
    AI_GOLDEN_SET_APPROVED: "true",
    AI_FACT_SOURCES_APPROVED: "true",
    AI_LICENSE_APPROVED: "true",
    YEAR_FORECAST_EXPERT_REVIEW_APPROVED: "true",
    SUBSCRIPTION_ENABLED: "true",
    SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED: "true",
    TOSS_BILLING_APPROVED: "true",
  });
  assert.deepEqual(fullyApproved.map((task) => task.enabled), [true, true, true]);
  assert.deepEqual(fullyApproved.map((task) => task.disabledBy), [[], [], []]);

  const allEnabledEnvironment = {
    BILLING_RECEIPTS_ENABLED: "true",
    BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
    FEATURE_AI_NARRATIVE: "true",
    AI_NARRATIVE_LEGAL_APPROVED: "true",
    AI_GOLDEN_SET_APPROVED: "true",
    AI_FACT_SOURCES_APPROVED: "true",
    AI_LICENSE_APPROVED: "true",
    YEAR_FORECAST_EXPERT_REVIEW_APPROVED: "true",
    SUBSCRIPTION_ENABLED: "true",
    SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED: "true",
    TOSS_BILLING_APPROVED: "true",
  };

  const gates = [
    ["BILLING_RECEIPTS_ENABLED", "billing_receipts"],
    ["BILLING_LEGAL_DOCUMENTS_APPROVED", "billing_receipts"],
    ["FEATURE_AI_NARRATIVE", "ai_sweeper"],
    ["AI_NARRATIVE_LEGAL_APPROVED", "ai_sweeper"],
    ["AI_GOLDEN_SET_APPROVED", "ai_sweeper"],
    ["AI_FACT_SOURCES_APPROVED", "ai_sweeper"],
    ["AI_LICENSE_APPROVED", "ai_sweeper"],
    ["YEAR_FORECAST_EXPERT_REVIEW_APPROVED", "ai_sweeper"],
    ["SUBSCRIPTION_ENABLED", "subscription_sweeper"],
    ["SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED", "subscription_sweeper"],
    ["TOSS_BILLING_APPROVED", "subscription_sweeper"],
  ];

  for (const [gate, taskName] of gates) {
    const environment = { ...allEnabledEnvironment };
    delete environment[gate];
    const task = createRailway10MinTasks(environment).find((item) => item.name === taskName);
    assert.equal(task?.enabled, false, `${gate} must keep ${taskName} disabled when missing`);
  }
});

test("cron skip summaries expose gate names without logging environment values", async () => {
  const privateGateValue = "environment-value-must-not-be-logged";
  const entries = [];
  const tasks = createRailway10MinTasks({
    BILLING_RECEIPTS_ENABLED: privateGateValue,
    BILLING_LEGAL_DOCUMENTS_APPROVED: "false",
  });

  await runRailwayCron({
    schedule: "10min",
    tasks,
    log: (line) => entries.push(JSON.parse(line)),
  });

  const serializedLogs = JSON.stringify(entries);
  assert.match(serializedLogs, /BILLING_RECEIPTS_ENABLED/u);
  assert.equal(serializedLogs.includes(privateGateValue), false);
  assert.deepEqual(entries[0].skippedTasks[0], {
    name: "billing_receipts",
    disabledBy: ["BILLING_RECEIPTS_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"],
  });
});

test("daily analytics always runs while billing reconciliation keeps its approval gate", () => {
  const baseline = createRailwayDailyTasks({});
  assert.deepEqual(baseline.map((task) => task.enabled), [true, false]);
  assert.deepEqual(
    createRailwayDailyTasks({
      BILLING_RECONCILE_ENABLED: "true",
      BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
    }).map((task) => task.enabled),
    [true, true],
  );
  assert.deepEqual(createRailwayDailyTasks({}).map((task) => task.disabledBy ?? []), [[], [
    "BILLING_RECONCILE_ENABLED",
    "BILLING_LEGAL_DOCUMENTS_APPROVED",
  ]]);
  for (const missingGate of ["BILLING_RECONCILE_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"]) {
    const environment = {
      BILLING_RECONCILE_ENABLED: "true",
      BILLING_LEGAL_DOCUMENTS_APPROVED: "true",
    };
    delete environment[missingGate];
    assert.equal(createRailwayDailyTasks(environment)[1]?.enabled, false, `${missingGate} is required`);
  }
});

test("internal request rejects non-production, invalid secrets, unsafe origins, and unapproved routes before fetch", async () => {
  const cases = [
    { overrides: { APP_ENV: "staging" }, path: "/api/internal/analytics-rollup" },
    { overrides: { CRON_SECRET: "short" }, path: "/api/internal/analytics-rollup" },
    { overrides: { CRON_SECRET: `${TEST_SECRET}\n` }, path: "/api/internal/analytics-rollup" },
    { overrides: { INTERNAL_WEB_ORIGIN: "http://web.example.com" }, path: "/api/internal/analytics-rollup" },
    { overrides: { INTERNAL_WEB_ORIGIN: "https://web.example.com/private" }, path: "/api/internal/analytics-rollup" },
    { overrides: { INTERNAL_WEB_ORIGIN: "https://user:password@web.example.com" }, path: "/api/internal/analytics-rollup" },
    { overrides: {}, path: "/api/internal/analytics-rollup?token=private" },
  ];

  for (const { overrides, path } of cases) {
    await withInternalRequestEnvironment(overrides, async () => {
      let fetchCount = 0;
      await assert.rejects(callRailwayInternalRoute(path, "CRON_SECRET", 1_000, async () => {
        fetchCount += 1;
        return Response.json({ ok: true });
      }));
      assert.equal(fetchCount, 0, `${path} must be rejected before fetch`);
    });
  }
});

test("internal request uses only the validated route and does not read or log response bodies", async () => {
  await withInternalRequestEnvironment({}, async () => {
    let request;
    const response = new Response("private response data", { status: 200 });
    const logged = [];
    const originalLog = console.log;
    console.log = (...args) => logged.push(args);

    try {
      await callRailwayInternalRoute(
        "/api/internal/analytics-rollup",
        "CRON_SECRET",
        1_000,
        async (input, init) => {
          request = { url: new URL(input), init };
          return response;
        },
      );
    } finally {
      console.log = originalLog;
    }

    assert.equal(request?.url.href, "https://web.example.com/api/internal/analytics-rollup");
    assert.equal(request?.init.method, "POST");
    assert.equal(request?.init.headers.authorization, `Bearer ${TEST_SECRET}`);
    assert.equal(request?.init.redirect, "error");
    assert.equal(request?.init.cache, "no-store");
    assert.ok(request?.init.signal instanceof AbortSignal);
    assert.equal(response.bodyUsed, false);
    assert.deepEqual(logged, []);
  });
});

test("internal request hides fetch details and response bodies when a request fails", async () => {
  await withInternalRequestEnvironment({}, async () => {
    const failureDetail = "private-target-and-token-detail";
    await assert.rejects(
      callRailwayInternalRoute("/api/internal/analytics-rollup", "CRON_SECRET", 1_000, async () => {
        throw new Error(failureDetail);
      }),
      { message: "Railway internal job request failed" },
    );

    const response = new Response(failureDetail, { status: 503 });
    await assert.rejects(
      callRailwayInternalRoute("/api/internal/analytics-rollup", "CRON_SECRET", 1_000, async () => response),
      { message: "Railway internal job returned HTTP 503" },
    );
    assert.equal(response.bodyUsed, false);
  });
});
