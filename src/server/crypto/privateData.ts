import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const KEY_ENV_PREFIX = "MEMBER_ENCRYPTION_KEY_V";

function currentKeyVersion(): number {
  const rawVersion = process.env.MEMBER_ENCRYPTION_CURRENT_KEY_VERSION;
  if (!rawVersion || !/^[1-9]\d{0,3}$/u.test(rawVersion)) {
    throw new Error("MEMBER_ENCRYPTION_CURRENT_KEY_VERSION is not configured");
  }
  return Number(rawVersion);
}

function keyForVersion(version: number): Buffer {
  if (!Number.isSafeInteger(version) || version < 1 || version > 9999) {
    throw new Error("Unsupported member encryption key version");
  }

  const rawKey = process.env[`${KEY_ENV_PREFIX}${version}`];
  if (!rawKey || !/^[a-fA-F0-9]{64}$/u.test(rawKey)) {
    throw new Error(`A 32-byte ${KEY_ENV_PREFIX}${version} key is required`);
  }
  return Buffer.from(rawKey, "hex");
}

function additionalAuthenticatedData(userId: string, recordId: string): Buffer {
  if (!userId || !recordId || userId.length > 256 || recordId.length > 256) {
    throw new Error("Invalid member encryption context");
  }
  return Buffer.from(`${userId}\u001f${recordId}`, "utf8");
}

export type EncryptedMemberData = Readonly<{ ciphertext: string; keyVersion: number }>;

export function encryptMemberData(plaintext: string, userId: string, recordId: string): EncryptedMemberData {
  const keyVersion = currentKeyVersion();
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyForVersion(keyVersion), iv);
  cipher.setAAD(additionalAuthenticatedData(userId, recordId));

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: `v${keyVersion}.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`,
    keyVersion,
  };
}

export function decryptMemberData(ciphertext: string, userId: string, recordId: string, keyVersion: number): string {
  const [versionSegment, ivSegment, tagSegment, payloadSegment, ...extraSegments] = ciphertext.split(".");
  const parsedVersion = versionSegment?.match(/^v([1-9]\d{0,3})$/u)?.[1];
  if (!parsedVersion || extraSegments.length > 0 || Number(parsedVersion) !== keyVersion) {
    throw new Error("Encrypted member data has an invalid format or key version");
  }

  const iv = Buffer.from(ivSegment ?? "", "base64url");
  const tag = Buffer.from(tagSegment ?? "", "base64url");
  const payload = Buffer.from(payloadSegment ?? "", "base64url");
  if (iv.length !== AES_GCM_IV_BYTES || tag.length !== AES_GCM_TAG_BYTES) {
    throw new Error("Encrypted member data has invalid authentication fields");
  }

  const decipher = createDecipheriv("aes-256-gcm", keyForVersion(keyVersion), iv);
  decipher.setAAD(additionalAuthenticatedData(userId, recordId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}
