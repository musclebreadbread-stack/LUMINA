import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ConsentVersions = Readonly<{
  terms: string;
  privacy: string;
  overseas_transfer: string;
}> | null;

const { getActiveConsentVersionsMock } = vi.hoisted(() => ({
  getActiveConsentVersionsMock: vi.fn<() => ConsentVersions>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/member/consents", () => ({
  getActiveConsentVersions: getActiveConsentVersionsMock,
}));

import { getActiveConsentVersions } from "@/server/member/consents";
import {
  MEMBER_CONSENT_GRANT_COOKIE,
  createMemberConsentGrant,
  hasValidMemberConsentGrant,
  memberConsentGrantCookie,
} from "./consentGrant";

const SECRET = "unit-test-signing-secret-with-32-plus-chars";
const VERSIONS = { terms: "t1", privacy: "p1", overseas_transfer: "o1" };
const NOW = new Date("2026-08-10T00:00:00.000Z");

function sign(payload: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function forge(value: unknown, secret = SECRET): string {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function header(token: string): string {
  return `${MEMBER_CONSENT_GRANT_COOKIE}=${token}`;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
  vi.mocked(getActiveConsentVersions).mockReturnValue(VERSIONS);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("createMemberConsentGrant", () => {
  it("creates a signed token that carries the active versions and a 10 minute expiry", () => {
    const token = createMemberConsentGrant();
    const [payload = "", signature] = token.split(".");
    expect(signature).toBe(sign(payload));
    expect(JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))).toEqual({
      expiresAt: NOW.getTime() + 600_000,
      versions: VERSIONS,
    });
  });

  it("refuses to sign without configured consent versions or a strong secret", () => {
    vi.mocked(getActiveConsentVersions).mockReturnValue(null);
    expect(() => createMemberConsentGrant()).toThrow("consent versions are not configured");
    vi.mocked(getActiveConsentVersions).mockReturnValue(VERSIONS);
    vi.stubEnv("BETTER_AUTH_SECRET", "short");
    expect(() => createMemberConsentGrant()).toThrow("BETTER_AUTH_SECRET is not configured");
  });
});

describe("hasValidMemberConsentGrant", () => {
  it("accepts a freshly created grant among other cookies", () => {
    const token = createMemberConsentGrant();
    expect(hasValidMemberConsentGrant(`a=b; ${header(token)}; c=d`)).toBe(true);
  });

  it("rejects missing, empty or malformed cookies", () => {
    expect(hasValidMemberConsentGrant(null)).toBe(false);
    expect(hasValidMemberConsentGrant("")).toBe(false);
    expect(hasValidMemberConsentGrant("novalue; other=1")).toBe(false);
    expect(hasValidMemberConsentGrant(`${MEMBER_CONSENT_GRANT_COOKIE}=`)).toBe(false);
    expect(hasValidMemberConsentGrant(header("nodot"))).toBe(false);
    expect(hasValidMemberConsentGrant(header(".onlysig"))).toBe(false);
    expect(hasValidMemberConsentGrant(header("payload.short"))).toBe(false);
  });

  it("rejects a tampered payload or a signature from another secret", () => {
    const valid = { expiresAt: NOW.getTime() + 1000, versions: VERSIONS };
    expect(hasValidMemberConsentGrant(header(forge(valid)))).toBe(true);
    expect(hasValidMemberConsentGrant(header(forge(valid, "another-secret-with-more-than-32-chars")))).toBe(false);

    const [payload = "", signature = ""] = forge(valid).split(".");
    const tampered = Buffer.from(JSON.stringify({ ...valid, expiresAt: valid.expiresAt + 1 }), "utf8").toString("base64url");
    expect(tampered).not.toBe(payload);
    expect(hasValidMemberConsentGrant(header(`${tampered}.${signature}`))).toBe(false);
  });

  it("rejects when the signing secret is not configured", () => {
    const token = createMemberConsentGrant();
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    expect(hasValidMemberConsentGrant(header(token))).toBe(false);
  });

  it("rejects signed payloads that are not valid JSON or fail the schema", () => {
    const rawPayload = Buffer.from("not json", "utf8").toString("base64url");
    expect(hasValidMemberConsentGrant(header(`${rawPayload}.${sign(rawPayload)}`))).toBe(false);
    expect(hasValidMemberConsentGrant(header(forge({ expiresAt: NOW.getTime() + 1000 })))).toBe(false);
    expect(hasValidMemberConsentGrant(header(forge({ expiresAt: NOW.getTime() + 1000, versions: VERSIONS, extra: 1 })))).toBe(false);
    expect(hasValidMemberConsentGrant(header(forge({ expiresAt: 1.5, versions: VERSIONS })))).toBe(false);
    expect(hasValidMemberConsentGrant(header(forge({ expiresAt: NOW.getTime() + 1000, versions: { ...VERSIONS, extra: "x" } })))).toBe(false);
  });

  it("rejects expired grants and grants issued for other consent versions", () => {
    const token = createMemberConsentGrant();
    vi.advanceTimersByTime(600_001);
    expect(hasValidMemberConsentGrant(header(token))).toBe(false);

    vi.setSystemTime(NOW);
    const fresh = createMemberConsentGrant();
    for (const key of ["terms", "privacy", "overseas_transfer"] as const) {
      vi.mocked(getActiveConsentVersions).mockReturnValue({ ...VERSIONS, [key]: "changed" });
      expect(hasValidMemberConsentGrant(header(fresh))).toBe(false);
    }
    vi.mocked(getActiveConsentVersions).mockReturnValue(null);
    expect(hasValidMemberConsentGrant(header(fresh))).toBe(false);
  });
});

describe("memberConsentGrantCookie", () => {
  it("sets a scoped, http-only cookie with the grant lifetime", () => {
    expect(memberConsentGrantCookie("tok", true)).toBe(
      `${MEMBER_CONSENT_GRANT_COOKIE}=tok; Path=/api/account/auth; HttpOnly; SameSite=Lax; Max-Age=600; Secure`,
    );
  });

  it("omits Secure for insecure origins and expires the cookie without a token", () => {
    expect(memberConsentGrantCookie(null, false)).toBe(
      `${MEMBER_CONSENT_GRANT_COOKIE}=; Path=/api/account/auth; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
  });
});

// Independent coverage from the member-boundary hardening work (HEAD side).
const TEST_SECRET = "synthetic-member-auth-secret-with-32-bytes";
const ACTIVE_VERSIONS = Object.freeze({
  terms: "terms-v1",
  privacy: "privacy-v1",
  overseas_transfer: "transfer-v1",
});

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
});
