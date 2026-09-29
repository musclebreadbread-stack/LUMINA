import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/member/consents", () => ({ getActiveConsentVersions: vi.fn() }));

import { createHmac } from "node:crypto";
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
