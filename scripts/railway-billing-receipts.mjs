import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";

await callRailwayInternalRoute("/api/internal/billing-receipts", "BILLING_CRON_SECRET", 45_000);
