import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getActiveConsentVersions } from "@/server/member/consents";

export const MEMBER_CONSENT_GRANT_COOKIE = "lumina_member_consent";
const GRANT_TTL_SECONDS = 10 * 60;

const grantPayloadSchema = z.object({
  expiresAt: z.number().int().positive(),
  versions: z.object({
    terms: z.string(),
    privacy: z.string(),
    overseas_transfer: z.string(),
  }).strict(),
}).strict();

function signingSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET is not configured");
  return secret;
}

function signatureFor(payload: string): Buffer {
  return createHmac("sha256", signingSecret()).update(payload).digest();
}

function readCookie(cookieHeader: string | null): string | null {
  for (const part of cookieHeader?.split(";") ?? []) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0 || part.slice(0, separatorIndex).trim() !== MEMBER_CONSENT_GRANT_COOKIE) continue;
    return part.slice(separatorIndex + 1).trim() || null;
  }
  return null;
}

export function createMemberConsentGrant(): string {
  const versions = getActiveConsentVersions();
  if (!versions) throw new Error("Current member consent versions are not configured");

  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + GRANT_TTL_SECONDS * 1_000,
    versions,
  }), "utf8").toString("base64url");
  const signature = signatureFor(payload).toString("base64url");
  return `${payload}.${signature}`;
}

export function hasValidMemberConsentGrant(cookieHeader: string | null): boolean {
  const grant = readCookie(cookieHeader);
  const separatorIndex = grant?.lastIndexOf(".") ?? -1;
  if (!grant || separatorIndex < 1) return false;

  const payload = grant.slice(0, separatorIndex);
  const providedSignature = Buffer.from(grant.slice(separatorIndex + 1), "base64url");
  if (providedSignature.length !== 32) return false;

  let expectedSignature: Buffer;
  try {
    expectedSignature = signatureFor(payload);
  } catch {
    return false;
  }
  if (!timingSafeEqual(providedSignature, expectedSignature)) return false;

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
  } catch {
    return false;
  }

  const parsed = grantPayloadSchema.safeParse(value);
  const activeVersions = getActiveConsentVersions();
  return Boolean(
    parsed.success &&
    activeVersions &&
    parsed.data.expiresAt > Date.now() &&
    parsed.data.versions.terms === activeVersions.terms &&
    parsed.data.versions.privacy === activeVersions.privacy &&
    parsed.data.versions.overseas_transfer === activeVersions.overseas_transfer,
  );
}

export function memberConsentGrantCookie(token: string | null, secure: boolean): string {
  const attributes = [
    `${MEMBER_CONSENT_GRANT_COOKIE}=${token ?? ""}`,
    "Path=/api/account/auth",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${token ? GRANT_TTL_SECONDS : 0}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
