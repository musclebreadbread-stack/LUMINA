import { pathToFileURL } from "node:url";
import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";
import { runRailwayCron } from "./lib/railwayCronRun.mjs";

// billing_reconcile used to run here, but a refund stuck on a Toss timeout could sit
// unrecovered for up to 24 hours on this schedule; it now runs every 10 minutes
// instead (railway-10min-jobs.mjs) so a stuck refund is retried within minutes.
export function createRailwayDailyTasks() {
  return [
    {
      name: "analytics_rollup",
      enabled: true,
      run: () => callRailwayInternalRoute("/api/internal/analytics-rollup", "CRON_SECRET", 30_000),
    },
  ];
}

export async function main() {
  await runRailwayCron({ schedule: "daily", tasks: createRailwayDailyTasks() });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
