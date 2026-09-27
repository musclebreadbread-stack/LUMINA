import { pathToFileURL } from "node:url";
import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";
import { createRailwayGatedTask, runRailwayCron } from "./lib/railwayCronRun.mjs";

export function createRailway10MinTasks(environment = process.env) {
  return [
    createRailwayGatedTask({
      environment,
      name: "billing_receipts",
      requiredGateVariables: ["BILLING_RECEIPTS_ENABLED", "BILLING_LEGAL_DOCUMENTS_APPROVED"],
      run: () => callRailwayInternalRoute("/api/internal/billing-receipts", "BILLING_CRON_SECRET", 45_000),
    }),
    createRailwayGatedTask({
      environment,
      name: "ai_sweeper",
      requiredGateVariables: [
        "FEATURE_AI_NARRATIVE",
        "AI_NARRATIVE_LEGAL_APPROVED",
        "AI_GOLDEN_SET_APPROVED",
        "AI_FACT_SOURCES_APPROVED",
        "AI_LICENSE_APPROVED",
        "YEAR_FORECAST_EXPERT_REVIEW_APPROVED",
      ],
      run: () => callRailwayInternalRoute("/api/internal/ai-sweeper", "AI_CRON_SECRET", 90_000),
    }),
    createRailwayGatedTask({
      environment,
      name: "subscription_sweeper",
      requiredGateVariables: [
        "SUBSCRIPTION_ENABLED",
        "SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED",
        "TOSS_BILLING_APPROVED",
      ],
      run: () => callRailwayInternalRoute("/api/internal/subscription-sweeper", "SUBSCRIPTION_CRON_SECRET", 240_000),
    }),
  ];
}

export async function main(environment = process.env) {
  await runRailwayCron({ schedule: "10min", tasks: createRailway10MinTasks(environment) });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
