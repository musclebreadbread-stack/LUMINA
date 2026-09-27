import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { decodeProfile } from "@/lib/share";
import { memberProfileSchema, type MemberProfile } from "@/server/member/profileSchema";

const COOKIE_NAMES = {
  birth: "lumina-report-profile",
  compatibility: "lumina-compatibility-profiles",
} as const;
const SESSION_AAD = "lumina-report-session:v1";

export type ReportProfilePayload =
  | Readonly<{ kind: "birth"; profile: MemberProfile }>
  | Readonly<{ kind: "compatibility"; first: MemberProfile; second: MemberProfile }>;

function sessionKey(): Buffer {
  const rawKey = process.env.REPORT_SESSION_ENCRYPTION_KEY;
  if (!rawKey || !/^[a-fA-F0-9]{64}$/u.test(rawKey)) {
    throw new Error("REPORT_SESSION_ENCRYPTION_KEY must be a 32-byte hex key");
  }
  return Buffer.from(rawKey, "hex");
}

export function encryptReportProfileSession(payload: ReportProfilePayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  cipher.setAAD(Buffer.from(`${SESSION_AAD}:${payload.kind}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptReportProfileSession(value: string, expectedKind: ReportProfilePayload["kind"]): ReportProfilePayload | null {
  if (value.length > 8_192) return null;
  const [ivValue, tagValue, ciphertextValue, ...extra] = value.split(".");
  if (extra.length !== 0) return null;
  const iv = Buffer.from(ivValue ?? "", "base64url");
  const tag = Buffer.from(tagValue ?? "", "base64url");
  const ciphertext = Buffer.from(ciphertextValue ?? "", "base64url");
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length > 6_144) return null;

  try {
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), iv);
    decipher.setAAD(Buffer.from(`${SESSION_AAD}:${expectedKind}`, "utf8"));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(plaintext);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const record = parsed as Readonly<Record<string, unknown>>;

    if (expectedKind === "birth" && record.kind === "birth") {
      const profile = memberProfileSchema.safeParse(record.profile);
      return profile.success ? { kind: "birth", profile: profile.data } : null;
    }
    if (expectedKind === "compatibility" && record.kind === "compatibility") {
      const first = memberProfileSchema.safeParse(record.first);
      const second = memberProfileSchema.safeParse(record.second);
      return first.success && second.success
        ? { kind: "compatibility", first: first.data, second: second.data }
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveBirthReportProfile(data: string): Promise<MemberProfile | ReturnType<typeof decodeProfile>> {
  if (data !== "current") return decodeProfile(data);
  const cookie = (await cookies()).get(COOKIE_NAMES.birth)?.value;
  if (!cookie) return null;
  const payload = decryptReportProfileSession(cookie, "birth");
  return payload?.kind === "birth" ? payload.profile : null;
}

export async function resolveCompatibilityReportProfiles(
  left: string,
  right: string,
): Promise<Readonly<{ first: MemberProfile; second: MemberProfile }> | null> {
  if (left === "current" || right === "current") {
    if (left !== "current" || right !== "current") return null;
    const cookie = (await cookies()).get(COOKIE_NAMES.compatibility)?.value;
    if (!cookie) return null;
    const payload = decryptReportProfileSession(cookie, "compatibility");
    return payload?.kind === "compatibility" ? { first: payload.first, second: payload.second } : null;
  }

  const first = decodeProfile(left);
  const second = decodeProfile(right);
  if (!first || !second) return null;
  const parsedFirst = memberProfileSchema.safeParse(first);
  const parsedSecond = memberProfileSchema.safeParse(second);
  return parsedFirst.success && parsedSecond.success
    ? { first: parsedFirst.data, second: parsedSecond.data }
    : null;
}

export function reportProfileCookieName(kind: ReportProfilePayload["kind"]): string {
  return COOKIE_NAMES[kind];
}
