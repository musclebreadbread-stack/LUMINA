import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isOneTimeProductKey,
  isProductKey,
  ONE_TIME_PRODUCT_KEYS,
  PRODUCT_CATALOG,
  PRODUCT_KEYS,
  SUBSCRIPTION_PRODUCT_KEYS,
} from "../catalog";

describe("PRODUCT_CATALOG", () => {
  it("has exactly one entry per declared product key, each keyed to itself", () => {
    expect(PRODUCT_KEYS.length).toBe(Object.keys(PRODUCT_CATALOG).length);
    for (const key of PRODUCT_KEYS) {
      expect(PRODUCT_CATALOG[key].key).toBe(key);
    }
  });

  it("only lists LUMINA+ tiers as includedInPlus, never a product itself", () => {
    for (const key of PRODUCT_KEYS) {
      const entry = PRODUCT_CATALOG[key];
      for (const plusKey of entry.includedInPlus) {
        expect(SUBSCRIPTION_PRODUCT_KEYS).toContain(plusKey);
      }
    }
  });

  it("splits cleanly into one-time and subscription keys with no overlap", () => {
    const oneTimeKeys: readonly string[] = ONE_TIME_PRODUCT_KEYS;
    const subscriptionKeys: readonly string[] = SUBSCRIPTION_PRODUCT_KEYS;
    for (const key of oneTimeKeys) expect(subscriptionKeys.includes(key)).toBe(false);
    expect(PRODUCT_KEYS.length).toBe(ONE_TIME_PRODUCT_KEYS.length + SUBSCRIPTION_PRODUCT_KEYS.length);
    for (const key of PRODUCT_KEYS) {
      const type = PRODUCT_CATALOG[key].type;
      expect(type === "one_time" ? oneTimeKeys.includes(key) : subscriptionKeys.includes(key)).toBe(true);
    }
  });
});

describe("isProductKey / isOneTimeProductKey", () => {
  it("accepts every real catalog key and rejects unknown strings", () => {
    for (const key of PRODUCT_KEYS) expect(isProductKey(key)).toBe(true);
    expect(isProductKey("saju-deep")).toBe(false);
    expect(isProductKey("")).toBe(false);
  });

  it("accepts only one-time product keys, rejecting subscription keys", () => {
    for (const key of ONE_TIME_PRODUCT_KEYS) expect(isOneTimeProductKey(key)).toBe(true);
    for (const key of SUBSCRIPTION_PRODUCT_KEYS) expect(isOneTimeProductKey(key)).toBe(false);
  });
});
