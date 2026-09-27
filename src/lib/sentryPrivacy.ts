import { loadConsent } from "./consent";
import { scrubAnalyticsUrl } from "./analyticsScrub";

interface SentryEventWithRequest {
  readonly request?: { readonly url?: string };
  readonly transaction?: string;
  readonly user?: unknown;
  readonly extra?: unknown;
  readonly breadcrumbs?: readonly unknown[];
}

/** Removes identifying request fields and forwards only the allowlisted, scrubbed path. */
export function scrubSentryEvent<T extends SentryEventWithRequest>(event: T, requireConsent = true) {
  if (requireConsent && loadConsent() === null) return null;
  const rawUrl = event.request?.url;
  const url = typeof rawUrl === "string" ? scrubAnalyticsUrl(rawUrl) : null;
  if (typeof rawUrl === "string" && url === null) return null;
  return {
    ...event,
    request: url === null ? undefined : { url },
    transaction: url ?? undefined,
    user: undefined,
    extra: undefined,
    breadcrumbs: undefined,
  };
}
