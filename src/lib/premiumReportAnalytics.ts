import { track } from "./analytics";

export type PremiumReportEventName =
  | "premium_report_view"
  | "premium_report_free_analysis_click"
  | "premium_report_checkout_start";

/** Optional telemetry must not interrupt report navigation or checkout. */
export function trackPremiumReportEvent(eventName: PremiumReportEventName): void {
  try {
    track(eventName, { analysis: "saju" });
  } catch {
    // A blocked or unavailable analytics script cannot stop a product action.
  }
}
