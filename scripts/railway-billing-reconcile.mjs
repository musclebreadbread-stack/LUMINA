import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";

await callRailwayInternalRoute("/api/internal/billing-reconcile", "BILLING_CRON_SECRET", 90_000);
