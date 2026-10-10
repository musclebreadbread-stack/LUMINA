import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ConsentVersions = Readonly<{
  terms: string;
  privacy: string;
  overseas_transfer: string;
}> | null;

const TEST_SECRET = "synthetic-member-auth-secret-with-32-bytes";
const ACTIVE_VERSIONS = Object.freeze({
  terms: "terms-v1",
  privacy: "privacy-v1",
  overseas_transfer: "transfer-v1",
});

const { getActiveConsentVersionsMock } = vi.hoisted(() => ({
  getActiveConsentVersionsMock: vi.fn<() => ConsentVersions>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/member/consents", () => ({
  getActiveConsentVersions: getActiveConsentVersionsMock,
}));

import {
  createMemberConsentGrant,
  hasValidMemberConsentGrant,
  memberConsentGrantCookie,
  MEMBER_CONSENT_GRANT_COOKIE,
} from "./consentGrant";

function cookieHeader(grant: string): string {
  return `${MEMBER_CONSENT_GRANT_COOKIE}=${grant}`;
}

function signedGrant(payload: string): string {
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signature = createHmac("sha256", TEST_SECRET).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

describe("member consent grants", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T00:00:00.000Z"));
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    getActiveConsentVersionsMock.mockReset().mockReturnValue(ACTIVE_VERSIONS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("issues a signed grant and reads it from a cookie header", () => {
    const grant = createMemberConsentGrant();

    expect(hasValidMemberConsentGrant(`analytics=enabled; ${cookieHeader(grant)}`)).toBe(true);
  });

  it("accepts an independently signed payload with the active policy versions", () => {
    const grant = signedGrant(JSON.stringify({
      expiresAt: Date.now() + 60_000,
      versions: ACTIVE_VERSIONS,
    }));

    expect(hasValidMemberConsentGrant(cookieHeader(grant))).toBe(true);
  });

  it("rejects absent, malformed, tampered, and invalidly shaped grants", () => {
    const grant = createMemberConsentGrant();
    const [payload, signature] = grant.split(".");
    const alteredSignature = `${signature?.[0] === "A" ? "B" : "A"}${signature?.slice(1) ?? ""}`;

    expect(hasValidMemberConsentGrant(null)).toBe(false);
    expect(hasValidMemberConsentGrant("analytics=enabled; broken-cookie")).toBe(false);
    expect(hasValidMemberConsentGrant(cookieHeader("malformed"))).toBe(false);
    expect(hasValidMemberConsentGrant(cookieHeader(`${payload}.${alteredSignature}`))).toBe(false);
    expect(hasValidMemberConsentGrant(cookieHeader(signedGrant("{")))).toBe(false);
    expect(hasValidMemberConsentGrant(cookieHeader(signedGrant(JSON.stringify({
      expiresAt: Date.now() + 60_000,
      versions: ACTIVE_VERSIONS,
      unexpected: true,
    }))))).toBe(false);
  });

  it.each([
    { field: "terms" as const, value: "terms-v2" },
    { field: "privacy" as const, value: "privacy-v2" },
    { field: "overseas_transfer" as const, value: "transfer-v2" },
  ])("rejects grants after the $field policy version changes", ({ field, value }) => {
    const grant = createMemberConsentGrant();
    getActiveConsentVersionsMock.mockReturnValue({ ...ACTIVE_VERSIONS, [field]: value });
    expect(hasValidMemberConsentGrant(cookieHeader(grant))).toBe(false);
  });

  it("rejects grants after expiry or when active consent versions become unavailable", () => {
    const grant = createMemberConsentGrant();
    getActiveConsentVersionsMock.mockReturnValue(null);
    expect(hasValidMemberConsentGrant(cookieHeader(grant))).toBe(false);

    getActiveConsentVersionsMock.mockReturnValue(ACTIVE_VERSIONS);
    vi.advanceTimersByTime(10 * 60 * 1_000);
    expect(hasValidMemberConsentGrant(cookieHeader(grant))).toBe(false);
  });

  it("fails closed when consent versions or the signing secret are unavailable", () => {
    getActiveConsentVersionsMock.mockReturnValue(null);
    expect(() => createMemberConsentGrant()).toThrow("Current member consent versions are not configured");

    getActiveConsentVersionsMock.mockReturnValue(ACTIVE_VERSIONS);
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    expect(() => createMemberConsentGrant()).toThrow("BETTER_AUTH_SECRET is not configured");
    expect(hasValidMemberConsentGrant(cookieHeader(signedGrant("{}")))).toBe(false);
  });

  it("sets an auth-scoped HttpOnly cookie and supports secure and cleared variants", () => {
    expect(memberConsentGrantCookie("signed.grant", true)).toBe(
      `${MEMBER_CONSENT_GRANT_COOKIE}=signed.grant; Path=/api/account/auth; HttpOnly; SameSite=Lax; Max-Age=600; Secure`,
    );
    expect(memberConsentGrantCookie(null, false)).toBe(
      `${MEMBER_CONSENT_GRANT_COOKIE}=; Path=/api/account/auth; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
  });
});
