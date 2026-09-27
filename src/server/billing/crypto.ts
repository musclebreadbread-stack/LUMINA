import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type Ciphertext = Readonly<{ ciphertext: string; keyVersion: number }>;

function billingKey(): Readonly<{ key: Buffer; version: number }> {
  const version = Number(process.env.BILLING_ENCRYPTION_KEY_VERSION ?? "1");
  const raw = process.env.BILLING_ENCRYPTION_KEY;
  if (!Number.isSafeInteger(version) || version < 1 || version > 9999 || !raw || !/^[a-fA-F0-9]{64}$/u.test(raw)) {
    throw new Error("Billing encryption key configuration is invalid");
  }
  return { key: Buffer.from(raw, "hex"), version };
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
  if (rest.length > 0 || marker !== `v${version}`) throw new Error("Stored payment key is invalid");
  const { key } = billingKey();
  const iv = Buffer.from(ivValue ?? "", "base64url");
  const tag = Buffer.from(tagValue ?? "", "base64url");
  const data = Buffer.from(dataValue ?? "", "base64url");
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
