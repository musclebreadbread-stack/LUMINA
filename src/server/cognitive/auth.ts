import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export interface CognitiveSubject {
  readonly id: string;
  readonly isAnonymous: boolean;
}

export class CognitiveAuthError extends Error {
  constructor(message = "cognitive authentication is required") {
    super(message);
    this.name = "CognitiveAuthError";
  }
}

const COGNITIVE_SUBJECT_COOKIE = "lumina-cognitive-subject";
const SUBJECT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredCookieSecret(): string {
  const value = process.env.COGNITIVE_SUBJECT_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new CognitiveAuthError("COGNITIVE_SUBJECT_COOKIE_SECRET must contain at least 32 characters");
  }
  return value;
}

function signatureFor(subjectId: string): string {
  return createHmac("sha256", requiredCookieSecret()).update(subjectId).digest("base64url");
}

function isValidSignature(subjectId: string, signature: string): boolean {
  const expectedBytes = Buffer.from(signatureFor(subjectId), "utf8");
  const actualBytes = Buffer.from(signature, "utf8");
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function parseSubjectCookie(value: string | undefined): string | null {
  if (value === undefined) return null;
  const separator = value.indexOf(".");
  if (separator <= 0) return null;
  const subjectId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!UUID_PATTERN.test(subjectId) || signature.length === 0) return null;
  return isValidSignature(subjectId, signature) ? subjectId : null;
}

export interface RequireCognitiveSubjectOptions {
  /** Server Action에서 최초 익명 파일럿 주체를 만들 때만 사용한다. */
  readonly createIfMissing?: boolean;
}

/** Neon Auth 계정 세션과 분리된 파일럿용 익명 주체 경계. */
export async function requireCognitiveSubject(
  options: RequireCognitiveSubjectOptions = {},
): Promise<CognitiveSubject> {
  const cookieStore = await cookies();
  const existingSubjectId = parseSubjectCookie(cookieStore.get(COGNITIVE_SUBJECT_COOKIE)?.value);
  if (existingSubjectId !== null) {
    return { id: existingSubjectId, isAnonymous: true };
  }

  if (options.createIfMissing !== true) throw new CognitiveAuthError();

  const subjectId = randomUUID();
  cookieStore.set(COGNITIVE_SUBJECT_COOKIE, `${subjectId}.${signatureFor(subjectId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SUBJECT_COOKIE_MAX_AGE_SECONDS,
  });

  return { id: subjectId, isAnonymous: true };
}
