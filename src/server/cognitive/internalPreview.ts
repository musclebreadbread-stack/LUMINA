import "server-only";

import { timingSafeEqual } from "node:crypto";

const MINIMUM_TOKEN_LENGTH = 32;

function configuredToken(): string | null {
  const value = process.env.COGNITIVE_INTERNAL_PREVIEW_TOKEN;
  return typeof value === "string" && value.length >= MINIMUM_TOKEN_LENGTH ? value : null;
}

/** 내부 미리보기는 서버에 토큰이 설정된 배포에서만 존재한다 — 그 외에는 라우트가 없는 것과 같다. */
export function isInternalPreviewEnabled(): boolean {
  return configuredToken() !== null;
}

export function hasValidInternalPreviewToken(candidate: string | undefined): boolean {
  const expected = configuredToken();
  if (expected === null || candidate === undefined || candidate.length === 0) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  return expectedBytes.length === candidateBytes.length && timingSafeEqual(expectedBytes, candidateBytes);
}
