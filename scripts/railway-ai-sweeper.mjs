import { callRailwayInternalRoute } from "./lib/railwayInternalRequest.mjs";

await callRailwayInternalRoute("/api/internal/ai-sweeper", "AI_CRON_SECRET", 90_000);
