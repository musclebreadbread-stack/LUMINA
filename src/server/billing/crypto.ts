import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type Ciphertext = Readonly<{ ciphertext: string; keyVersion: number }>;
const BILLING_KEY_ENV_PREFIX = "BILLING_ENCRYPTION_KEY_V";

function isCanonicalBase64Url(segment: string): boolean {
  return /^[A-Za-z0-9_-]*$/u.test(segment)
    && Buffer.from(segment, "base64url").toString("base64url") === segment;
}

function billingKeyVersion(): number {
  const version = Number(process.env.BILLING_ENCRYPTION_KEY_VERSION ?? "1");
  if (!Number.isSafeInteger(version) || version < 1 || version > 9999) {
    throw new Error("Billing encryption key configuration is invalid");
  }
  return version;
}

function parseBillingKey(raw: string | undefined): Buffer {
  if (!raw || !/^[a-fA-F0-9]{64}$/u.test(raw)) {
    throw new Error("Billing encryption key configuration is invalid");
  }
  return Buffer.from(raw, "hex");
}

function billingKey(): Readonly<{ key: Buffer; version: number }> {
  const version = billingKeyVersion();
  return { key: parseBillingKey(process.env.BILLING_ENCRYPTION_KEY), version };
}

function billingKeyForVersion(version: number): Buffer {
  if (!Number.isSafeInteger(version) || version < 1 || version > 9999) {
    throw new Error("Stored payment key is invalid");
  }

  const currentVersion = billingKeyVersion();
  const raw = version === currentVersion
    ? process.env.BILLING_ENCRYPTION_KEY
    : process.env[`${BILLING_KEY_ENV_PREFIX}${version}`];
  return parseBillingKey(raw);
}

export function encryptBillingValue(value: string, purpose: "payment-key" | "receipt-email", recordId: string): Ciphertext {
  const { key, version } = billingKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`lumina:${purpose}:${recordId}`, "utf8"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: `v${version}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`,
    keyVersion: version,
  };
}

export function decryptBillingValue(value: string, purpose: "payment-key" | "receipt-email", recordId: string, version: number): string {
  const [marker, ivValue, tagValue, dataValue, ...rest] = value.split(".");
  if (
    rest.length > 0
    || !Number.isSafeInteger(version)
    || version < 1
    || version > 9999
    || marker !== `v${version}`
    || ivValue === undefined
    || tagValue === undefined
    || dataValue === undefined
    || !isCanonicalBase64Url(ivValue)
    || !isCanonicalBase64Url(tagValue)
    || !isCanonicalBase64Url(dataValue)
  ) {
    throw new Error("Stored payment key is invalid");
  }
  const key = billingKeyForVersion(version);
  const iv = Buffer.from(ivValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const data = Buffer.from(dataValue, "base64url");
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Stored payment key is invalid");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(`lumina:${purpose}:${recordId}`, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encryptPaymentKey(paymentKey: string, orderId: string): Ciphertext {
  return encryptBillingValue(paymentKey, "payment-key", orderId);
}

export function decryptPaymentKey(value: string, orderId: string, version: number): string {
  return decryptBillingValue(value, "payment-key", orderId, version);
}

export function paymentKeyDigest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
