import "server-only";

import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let authInstance: NeonAuth | null = null;

function requiredAuthEnv(name: "NEON_AUTH_BASE_URL" | "NEON_AUTH_COOKIE_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  if (name === "NEON_AUTH_COOKIE_SECRET" && value.length < 32) {
    throw new Error("NEON_AUTH_COOKIE_SECRET must contain at least 32 characters");
  }
  return value;
}

/** Neon Auth 서버 인스턴스. 요청 시점에만 환경변수를 검증한다. */
export function getNeonAuth(): NeonAuth {
  if (authInstance === null) {
    authInstance = createNeonAuth({
      baseUrl: requiredAuthEnv("NEON_AUTH_BASE_URL"),
      cookies: {
        secret: requiredAuthEnv("NEON_AUTH_COOKIE_SECRET"),
        sessionDataTtl: 300,
      },
    });
  }
  return authInstance;
}
