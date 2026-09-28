import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureException }));

import { captureServerError } from "../captureServerError";

const ENV_KEYS = ["SENTRY_SERVER_ENABLED", "SENTRY_DSN"] as const;

describe("captureServerError", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    captureException.mockClear();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("does nothing when Sentry is not enabled", async () => {
    delete process.env.SENTRY_SERVER_ENABLED;
    process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
    await captureServerError(new Error("boom"), "billing-order");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does nothing when no DSN is configured", async () => {
    process.env.SENTRY_SERVER_ENABLED = "true";
    delete process.env.SENTRY_DSN;
    await captureServerError(new Error("boom"), "billing-order");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports the error tagged with the given area when Sentry is configured", async () => {
    process.env.SENTRY_SERVER_ENABLED = "true";
    process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
    const error = new Error("boom");
    await captureServerError(error, "billing-webhook");
    expect(captureException).toHaveBeenCalledWith(error, { tags: { area: "billing-webhook" } });
  });

  it("never throws, even if the reporter itself fails", async () => {
    process.env.SENTRY_SERVER_ENABLED = "true";
    process.env.SENTRY_DSN = "https://example.ingest.sentry.io/1";
    captureException.mockImplementationOnce(() => {
      throw new Error("sentry transport is down");
    });
    await expect(captureServerError(new Error("boom"), "ai-narrative")).resolves.toBeUndefined();
  });
});
