"use client";

import { loadConsent } from "./consent";
import { scrubSentryEvent } from "./sentryPrivacy";

let initialization: Promise<void> | null = null;

export function initSentryClient(): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn || loadConsent() === null) return Promise.resolve();
  if (initialization !== null) return initialization;

  initialization = import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.APP_ENV ?? process.env.NODE_ENV,
        sendDefaultPii: false,
        tracesSampleRate: 0.05,
        beforeSend: (event) => scrubSentryEvent(event),
        beforeSendTransaction: (event) => scrubSentryEvent(event),
        beforeBreadcrumb: () => null,
      });
    })
    .catch(() => {
      initialization = null;
    });
  return initialization;
}
