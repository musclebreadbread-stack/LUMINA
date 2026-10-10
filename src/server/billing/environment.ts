import "server-only";

function tossKeyEnvironment(key: string | undefined): "live" | "test" | null {
  const trimmed = key?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("live_")) return "live";
  if (trimmed.startsWith("test_")) return "test";
  return null;
}

/**
 * Guards every billing cron job (receipts, reconcile, subscription sweeper) against
 * running with a mismatched environment/key pair — a staging deploy holding a live
 * Toss key, or a production deploy still on a test key. Previously these jobs only
 * checked `APP_ENV === "production"`, which also meant staging could never run them
 * at all, even safely with a `test_` key — blocking any pre-launch rehearsal of the
 * 10-minute cron path (Track F's staging rehearsal explicitly needs this).
 */
export function billingJobsAllowed(): boolean {
  const appEnvironment = process.env.APP_ENV;
  const keyEnvironment = tossKeyEnvironment(process.env.TOSS_SECRET_KEY);
  if (appEnvironment === "production") return keyEnvironment === "live";
  if (appEnvironment === "staging") return keyEnvironment === "test";
  return false;
}

/**
 * In staging, billing emails (receipts, subscription notices) only ever go to an
 * explicit allowlist — staging may run against production-shaped data, so this is
 * a safety net against ever mailing a real customer as a side effect of a rehearsal.
 * Always true in production, where this restriction does not apply.
 */
export function isBillingEmailRecipientAllowed(recipient: string): boolean {
  if (process.env.APP_ENV !== "staging") return true;
  const allowlist = (process.env.BILLING_STAGING_RECEIPT_ALLOWLIST ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(recipient.trim().toLowerCase());
}
