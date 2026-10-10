import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { billingJobsAllowed, isBillingEmailRecipientAllowed } from "../environment";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("billingJobsAllowed", () => {
  it("allows production with a live_ key", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("TOSS_SECRET_KEY", "live_sk_test1234");
    expect(billingJobsAllowed()).toBe(true);
  });

  it("allows staging with a test_ key", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_test1234");
    expect(billingJobsAllowed()).toBe(true);
  });

  it("blocks production with a test_ key (mismatched pair)", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_test1234");
    expect(billingJobsAllowed()).toBe(false);
  });

  it("blocks staging with a live_ key (mismatched pair)", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("TOSS_SECRET_KEY", "live_sk_test1234");
    expect(billingJobsAllowed()).toBe(false);
  });

  it("blocks any environment with no key configured", () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("TOSS_SECRET_KEY", "");
    expect(billingJobsAllowed()).toBe(false);
  });

  it("blocks development regardless of key", () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_test1234");
    expect(billingJobsAllowed()).toBe(false);
  });
});

describe("isBillingEmailRecipientAllowed", () => {
  it("allows any recipient outside staging", () => {
    vi.stubEnv("APP_ENV", "production");
    expect(isBillingEmailRecipientAllowed("anyone@example.com")).toBe(true);
  });

  it("blocks a staging recipient not on the allowlist", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("BILLING_STAGING_RECEIPT_ALLOWLIST", "");
    expect(isBillingEmailRecipientAllowed("customer@example.com")).toBe(false);
  });

  it("allows a staging recipient on the allowlist, case-insensitively", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("BILLING_STAGING_RECEIPT_ALLOWLIST", "qa@lumina.jack.ai.kr, Tester@Example.com");
    expect(isBillingEmailRecipientAllowed("tester@example.com")).toBe(true);
    expect(isBillingEmailRecipientAllowed("QA@LUMINA.JACK.AI.KR")).toBe(true);
    expect(isBillingEmailRecipientAllowed("someone-else@example.com")).toBe(false);
  });
});
