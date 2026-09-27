import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./lib/sentryPrivacy";

if (process.env.SENTRY_SERVER_ENABLED === "true" && process.env.SENTRY_DSN?.trim()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    beforeSend: (event) => scrubSentryEvent(event, false),
    beforeSendTransaction: (event) => scrubSentryEvent(event, false),
    beforeBreadcrumb: () => null,
  });
}
