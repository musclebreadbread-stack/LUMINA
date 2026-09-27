import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.SENTRY_SERVER_ENABLED !== "true" || !process.env.SENTRY_DSN?.trim()) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.SENTRY_SERVER_ENABLED !== "true" || !process.env.SENTRY_DSN?.trim()) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(error, request, context);
};
