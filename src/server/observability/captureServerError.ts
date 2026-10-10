import "server-only";

// A small, fixed vocabulary — never a dynamic string built from request data.
// scrubSentryEvent (src/lib/sentryPrivacy.ts) already strips `extra`, `user`, and
// the request URL from every server-side Sentry event; tags are the one field it
// leaves untouched, so tags must stay restricted to labels like these that can
// never carry an order id, email, or other user data.
export const SERVER_ERROR_AREAS = [
  "billing-order",
  "billing-webhook",
  "billing-refund",
  "billing-subscription",
  "ai-narrative",
  "internal-cron",
] as const;

export type ServerErrorArea = (typeof SERVER_ERROR_AREAS)[number];

/**
 * Reports a caught error to Sentry, tagged with a fixed, non-identifying `area`
 * label, when Sentry is configured. A no-op otherwise (Sentry stays unset in
 * production today), and never throws — reporting an error must never itself
 * break the caller's own error handling.
 *
 * Call this from every catch block that turns a real failure into a generic
 * 503/500 response without reporting it anywhere. Those failures — a bad grant,
 * a Toss timeout, an AI budget error — are otherwise invisible until a person
 * notices missing orders, a stuck refund, or a silently empty report.
 */
export async function captureServerError(error: unknown, area: ServerErrorArea): Promise<void> {
  if (process.env.SENTRY_SERVER_ENABLED !== "true" || !process.env.SENTRY_DSN?.trim()) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, { tags: { area } });
  } catch {
    // Reporting is best-effort; a broken reporter must not mask the original error.
  }
}
