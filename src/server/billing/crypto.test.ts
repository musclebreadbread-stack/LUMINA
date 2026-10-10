import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  decryptBillingValue,
  decryptPaymentKey,
  encryptBillingValue,
  encryptPaymentKey,
  paymentKeyDigest,
} from "./crypto";

const ORDER_ID = "123e4567-e89b-42d3-a456-426614174000";
const ENCRYPTION_KEY = "a".repeat(64);

describe("billing value encryption", () => {
  beforeEach(() => {
    vi.stubEnv("BILLING_ENCRYPTION_KEY", ENCRYPTION_KEY);
    vi.stubEnv("BILLING_ENCRYPTION_KEY_VERSION", "7");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["payment-key", "receipt-email"] as const)("round-trips %s with a versioned authenticated ciphertext", (purpose) => {
    const plaintext = purpose === "payment-key" ? "synthetic-payment-key" : "member@example.test";
    const encrypted = encryptBillingValue(plaintext, purpose, ORDER_ID);

    expect(encrypted.keyVersion).toBe(7);
    expect(encrypted.ciphertext.startsWith("v7.")).toBe(true);
    expect(encrypted.ciphertext).not.toContain(plaintext);
    expect(decryptBillingValue(encrypted.ciphertext, purpose, ORDER_ID, encrypted.keyVersion)).toBe(plaintext);
  });

  it("round-trips an empty plaintext while requiring its payload segment", () => {
    const encrypted = encryptBillingValue("", "receipt-email", ORDER_ID);

    expect(encrypted.ciphertext.endsWith(".")).toBe(true);
    expect(decryptBillingValue(encrypted.ciphertext, "receipt-email", ORDER_ID, encrypted.keyVersion)).toBe("");
    expect(() => decryptBillingValue(encrypted.ciphertext.slice(0, -1), "receipt-email", ORDER_ID, encrypted.keyVersion))
      .toThrow("Stored payment key is invalid");
    expect(() => decryptBillingValue(`${encrypted.ciphertext}A`, "receipt-email", ORDER_ID, encrypted.keyVersion))
      .toThrow("Stored payment key is invalid");
  });

  it("uses version 1 when no explicit encryption key version is configured", () => {
    vi.stubEnv("BILLING_ENCRYPTION_KEY_VERSION", undefined);

    const encrypted = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);

    expect(encrypted.keyVersion).toBe(1);
    expect(decryptBillingValue(encrypted.ciphertext, "payment-key", ORDER_ID, encrypted.keyVersion))
      .toBe("synthetic-payment-key");
  });

  it("uses a fresh IV when encrypting the same value more than once", () => {
    const first = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);
    const second = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(decryptBillingValue(second.ciphertext, "payment-key", ORDER_ID, second.keyVersion))
      .toBe("synthetic-payment-key");
  });

  it.each([
    ["different record", "payment-key", "123e4567-e89b-42d3-a456-426614174001"],
    ["different purpose", "receipt-email", ORDER_ID],
  ] as const)("rejects authenticated ciphertext with a %s", (_label, purpose, recordId) => {
    const encrypted = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);

    expect(() => decryptBillingValue(encrypted.ciphertext, purpose, recordId, encrypted.keyVersion)).toThrow();
  });

  it("rejects ciphertext whose authentication tag was changed", () => {
    const encrypted = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);
    const [marker, iv, tag, data] = encrypted.ciphertext.split(".");
    if (!marker || !iv || !tag || data === undefined) throw new Error("Expected a four-part ciphertext");
    const replacement = tag[0] === "A" ? "B" : "A";
    const tampered = `${marker}.${iv}.${replacement}${tag.slice(1)}.${data}`;

    expect(() => decryptBillingValue(tampered, "payment-key", ORDER_ID, encrypted.keyVersion)).toThrow();
  });

  it.each([
    ["extra segment", (value: string) => `${value}.extra`],
    ["wrong version marker", (value: string) => value.replace(/^v7\./u, "v6.")],
    ["invalid IV size", (value: string) => value.replace(/^(v7\.)[^.]+/u, "$1AQ")],
    ["invalid tag size", (value: string) => value.replace(/^(v7\.[^.]+\.)[^.]+/u, "$1AQ")],
    ["missing encrypted fields", () => "v7"],
  ])("rejects malformed ciphertext with %s", (_label, mutate) => {
    const encrypted = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);

    expect(() => decryptBillingValue(mutate(encrypted.ciphertext), "payment-key", ORDER_ID, encrypted.keyVersion))
      .toThrow("Stored payment key is invalid");
  });

  it.each([
    ["non-numeric version", "invalid", ENCRYPTION_KEY],
    ["version below the supported range", "0", ENCRYPTION_KEY],
    ["version above the supported range", "10000", ENCRYPTION_KEY],
    ["missing key", "7", ""],
    ["short key", "7", "a".repeat(62)],
    ["non-hexadecimal key", "7", "g".repeat(64)],
  ] as const)("rejects invalid encryption configuration for %s", (_label, version, key) => {
    vi.stubEnv("BILLING_ENCRYPTION_KEY_VERSION", version);
    vi.stubEnv("BILLING_ENCRYPTION_KEY", key);

    expect(() => encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID))
      .toThrow("Billing encryption key configuration is invalid");
  });

  it("encrypts and decrypts payment keys through the order-bound helpers", () => {
    const encrypted = encryptPaymentKey("synthetic-payment-key", ORDER_ID);

    expect(decryptPaymentKey(encrypted.ciphertext, ORDER_ID, encrypted.keyVersion)).toBe("synthetic-payment-key");
    expect(() => decryptPaymentKey(encrypted.ciphertext, "123e4567-e89b-42d3-a456-426614174001", encrypted.keyVersion))
      .toThrow();
  });

  it("returns a stable SHA-256 digest without returning the source payment key", () => {
    const first = paymentKeyDigest("synthetic-payment-key");

    expect(first).toHaveLength(32);
    expect(first.toString("hex")).toBe("f7d7ab8c7cabdffe22bcf450744dee154893281d43964a97d80a568b41e456e5");
    expect(first).toEqual(paymentKeyDigest("synthetic-payment-key"));
    expect(first).not.toEqual(paymentKeyDigest("another-synthetic-key"));
    expect(first.toString("utf8")).not.toContain("synthetic-payment-key");
  });

  it("decrypts older ciphertext after rotation when its versioned key is retained", () => {
    const encrypted = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);
    vi.stubEnv("BILLING_ENCRYPTION_KEY", "b".repeat(64));
    vi.stubEnv("BILLING_ENCRYPTION_KEY_VERSION", "8");
    vi.stubEnv("BILLING_ENCRYPTION_KEY_V7", ENCRYPTION_KEY);

    expect(decryptBillingValue(encrypted.ciphertext, "payment-key", ORDER_ID, encrypted.keyVersion))
      .toBe("synthetic-payment-key");
    const current = encryptBillingValue("new-synthetic-payment-key", "payment-key", ORDER_ID);
    expect(current.keyVersion).toBe(8);
    expect(decryptBillingValue(current.ciphertext, "payment-key", ORDER_ID, current.keyVersion))
      .toBe("new-synthetic-payment-key");
  });

  it("fails closed when the retained key for an older version is unavailable", () => {
    const encrypted = encryptBillingValue("synthetic-payment-key", "payment-key", ORDER_ID);
    vi.stubEnv("BILLING_ENCRYPTION_KEY", "b".repeat(64));
    vi.stubEnv("BILLING_ENCRYPTION_KEY_VERSION", "8");

    expect(() => decryptBillingValue(encrypted.ciphertext, "payment-key", ORDER_ID, encrypted.keyVersion))
      .toThrow("Billing encryption key configuration is invalid");
  });
});
