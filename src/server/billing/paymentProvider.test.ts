import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { flags } = vi.hoisted(() => ({ flags: { lemonSqueezy: false } }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: flags }));
vi.mock("./toss", () => ({ tossPaymentProvider: { id: "toss" } }));

import { getPaymentProvider } from "./paymentProvider";

describe("billing provider selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flags.lemonSqueezy = false;
    vi.stubEnv("BILLING_PROVIDER", "");
    vi.stubEnv("APP_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to Toss", async () => {
    await expect(getPaymentProvider()).resolves.toMatchObject({ id: "toss" });
  });

  it("rejects the fake provider in production", async () => {
    vi.stubEnv("BILLING_PROVIDER", "fake");
    vi.stubEnv("APP_ENV", "production");

    await expect(getPaymentProvider()).rejects.toThrow("The fake payment provider is disabled in production");
  });

  it("loads the fake provider only in development", async () => {
    vi.stubEnv("BILLING_PROVIDER", "fake");

    await expect(getPaymentProvider()).resolves.toMatchObject({ id: "fake" });
  });

  it("keeps Lemon Squeezy disabled until its approval flag is enabled", async () => {
    vi.stubEnv("BILLING_PROVIDER", "lemonsqueezy");

    await expect(getPaymentProvider()).rejects.toThrow("Lemon Squeezy is disabled until written approval is recorded");
  });

  it("fails closed for providers without an implementation", async () => {
    vi.stubEnv("BILLING_PROVIDER", "unknown-provider");

    await expect(getPaymentProvider()).rejects.toThrow("The configured payment provider is unavailable");

    flags.lemonSqueezy = true;
    vi.stubEnv("BILLING_PROVIDER", "lemonsqueezy");
    await expect(getPaymentProvider()).rejects.toThrow("The configured payment provider is unavailable");
  });
});
