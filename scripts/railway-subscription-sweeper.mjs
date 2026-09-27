import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";

if (process.env.SUBSCRIPTION_ENABLED !== "true"
  || process.env.SUBSCRIPTION_LEGAL_DOCUMENTS_APPROVED !== "true"
  || process.env.TOSS_BILLING_APPROVED !== "true") {
  throw new Error("Subscription sweeper requires approved contracts, legal documents, and the explicit feature flag");
}

await callRailwayInternalRoute("/api/internal/subscription-sweeper", "SUBSCRIPTION_CRON_SECRET", 240_000);
