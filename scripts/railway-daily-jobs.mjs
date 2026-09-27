import { pathToFileURL } from "node:url";
import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";
import { createRailwayGatedTask, runRailwayCron } from "./lib/railwayCronRun.mjs";

export function createRailwayDailyTasks(environment = process.env) {
  return [
    {
      name: "analytics_rollup",
      enabled: true,
      run: () => callRailwayInternalRoute("/api/internal/analytics-rollup", "CRON_SECRET", 30_000),
    },
    createRailwayGatedTask({
      environment,
      name: "billing_reconcile",
      requiredGateVariables: ["BILLING_RECONCILE_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"],
      run: () => callRailwayInternalRoute("/api/internal/billing-reconcile", "BILLING_CRON_SECRET", 90_000),
    }),
  ];
}

export async function main(environment = process.env) {
  await runRailwayCron({ schedule: "daily", tasks: createRailwayDailyTasks(environment) });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
