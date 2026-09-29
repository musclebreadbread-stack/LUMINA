import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  betterAuth: vi.fn((options: unknown) => ({ options })),
  captcha: vi.fn((options: unknown) => ({ id: "captcha", options })),
  emailOTP: vi.fn((options: unknown) => ({ id: "emailOTP", options })),
  nextCookies: vi.fn(() => ({ id: "nextCookies" })),
  send: vi.fn(),
  resendCtor: vi.fn(),
  flags: { memberAuth: true },
  getActiveConsentVersions: vi.fn(),
  pool: { name: "identity-pool" },
}));

vi.mock("server-only", () => ({}));
vi.mock("better-auth", () => ({ betterAuth: hoisted.betterAuth }));
vi.mock("better-auth/plugins", () => ({ captcha: hoisted.captcha, emailOTP: hoisted.emailOTP }));
vi.mock("better-auth/next-js", () => ({ nextCookies: hoisted.nextCookies }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: hoisted.send };
    constructor(key: string) {
      hoisted.resendCtor(key);
    }
  },
}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: hoisted.flags }));
vi.mock("@/server/member/consents", () => ({ getActiveConsentVersions: hoisted.getActiveConsentVersions }));
vi.mock("./consentGate", () => ({ memberConsentGate: { id: "consent-gate" } }));
vi.mock("./database", () => ({ getIdentityPool: () => hoisted.pool }));

import {
  getMemberAuth,
  getMemberAuthCaptchaSiteKey,
  getMemberSocialProviders,
  isMemberAuthConfigured,
} from "./index";

const BASE_ENV: Record<string, string> = {
  MEMBER_LEGAL_DOCUMENTS_APPROVED: "true",
  BETTER_AUTH_SECRET: "unit-test-secret-that-is-32-characters-long",
  IDENTITY_DATABASE_URL: "postgres://identity.invalid/db",
  MEMBER_DATABASE_URL: "postgres://member.invalid/db",
  RESEND_API_KEY: "resend-test-key",
  AUTH_EMAIL_FROM: "LUMINA <auth@example.test>",
  MEMBER_AUTH_TURNSTILE_SECRET_KEY: "turnstile-secret",
  MEMBER_AUTH_TURNSTILE_SITE_KEY: "turnstile-site",
  BETTER_AUTH_URL: "https://lumina.example.test",
  APP_ENV: "production",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  KAKAO_CLIENT_ID: "",
  KAKAO_CLIENT_SECRET: "",
  APPLE_CLIENT_ID: "",
  APPLE_CLIENT_SECRET: "",
};

function setEnv(overrides: Record<string, string> = {}): void {
  for (const [name, value] of Object.entries({ ...BASE_ENV, ...overrides })) vi.stubEnv(name, value);
}

interface CapturedOptions {
  appName: string;
  baseURL: string;
  basePath: string;
  database: unknown;
  socialProviders: Record<string, unknown>;
  trustedOrigins: string[];
  advanced: { defaultCookieAttributes: { secure: boolean } };
  plugins: unknown[];
}

function capturedOptions(): CapturedOptions {
  return hoisted.betterAuth.mock.calls.at(-1)?.[0] as CapturedOptions;
}

beforeEach(() => {
  hoisted.flags.memberAuth = true;
  hoisted.getActiveConsentVersions.mockReturnValue({ terms: "t", privacy: "p", overseas_transfer: "o" });
  hoisted.send.mockResolvedValue({ error: null });
  setEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("isMemberAuthConfigured", () => {
  it("is true when everything is configured", () => {
    expect(isMemberAuthConfigured()).toBe(true);
  });

  it("is false when the feature flag is off or legal documents are not approved", () => {
    hoisted.flags.memberAuth = false;
    expect(isMemberAuthConfigured()).toBe(false);
    hoisted.flags.memberAuth = true;
    setEnv({ MEMBER_LEGAL_DOCUMENTS_APPROVED: "false" });
    expect(isMemberAuthConfigured()).toBe(false);
  });

  it.each([
    "BETTER_AUTH_SECRET",
    "IDENTITY_DATABASE_URL",
    "MEMBER_DATABASE_URL",
    "RESEND_API_KEY",
    "AUTH_EMAIL_FROM",
    "MEMBER_AUTH_TURNSTILE_SECRET_KEY",
    "MEMBER_AUTH_TURNSTILE_SITE_KEY",
  ])("is false when %s is blank", (name) => {
    setEnv({ [name]: "   " });
    expect(isMemberAuthConfigured()).toBe(false);
  });

  it("is false for a short secret or missing consent versions", () => {
    setEnv({ BETTER_AUTH_SECRET: "too-short" });
    expect(isMemberAuthConfigured()).toBe(false);
    setEnv();
    hoisted.getActiveConsentVersions.mockReturnValue(null);
    expect(isMemberAuthConfigured()).toBe(false);
  });

  it.each([
    ["missing base URL", { BETTER_AUTH_URL: "" }],
    ["relative base URL", { BETTER_AUTH_URL: "/relative" }],
    ["base URL with path", { BETTER_AUTH_URL: "https://lumina.example.test/app" }],
    ["base URL with credentials", { BETTER_AUTH_URL: "https://u:p@lumina.example.test" }],
    ["base URL with query", { BETTER_AUTH_URL: "https://lumina.example.test/?a=1" }],
    ["base URL with hash", { BETTER_AUTH_URL: "https://lumina.example.test/#a" }],
    ["http outside development", { BETTER_AUTH_URL: "http://lumina.example.test" }],
    ["half-configured google", { GOOGLE_CLIENT_ID: "id" }],
    ["half-configured kakao", { KAKAO_CLIENT_SECRET: "secret" }],
    ["half-configured apple", { APPLE_CLIENT_ID: "id" }],
  ])("is false for %s", (_label, overrides) => {
    setEnv(overrides);
    expect(isMemberAuthConfigured()).toBe(false);
  });

  it("allows http for local development", () => {
    setEnv({ BETTER_AUTH_URL: "http://localhost:3000", APP_ENV: "development" });
    expect(isMemberAuthConfigured()).toBe(true);
  });
});

describe("getMemberSocialProviders", () => {
  it("reports only fully configured providers", () => {
    setEnv({ GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsecret", APPLE_CLIENT_ID: " aid ", APPLE_CLIENT_SECRET: "asecret" });
    expect(getMemberSocialProviders()).toEqual({ google: true, kakao: false, apple: true });
  });

  it("throws when a provider is only half configured", () => {
    setEnv({ KAKAO_CLIENT_ID: "kid" });
    expect(() => getMemberSocialProviders()).toThrow("KAKAO_CLIENT_ID and KAKAO_CLIENT_SECRET must be configured together");
  });
});

describe("getMemberAuth", () => {
  it("refuses to build when member auth is not configured", () => {
    hoisted.flags.memberAuth = false;
    expect(() => getMemberAuth()).toThrow("Member authentication is not configured");
    expect(hoisted.betterAuth).not.toHaveBeenCalled();
  });

  it("rejects an unsafe sender address", () => {
    setEnv({ AUTH_EMAIL_FROM: "a@example.test\nBcc: x@example.test" });
    expect(() => getMemberAuth()).toThrow("AUTH_EMAIL_FROM is invalid");
  });

  it("configures better-auth with hardened cookie, origin and captcha settings", () => {
    setEnv({ GOOGLE_CLIENT_ID: "gid", GOOGLE_CLIENT_SECRET: "gsecret" });
    getMemberAuth();

    const options = capturedOptions();
    expect(options).toMatchObject({
      appName: "LUMINA",
      basePath: "/api/account/auth",
      baseURL: "https://lumina.example.test",
      database: hoisted.pool,
      trustedOrigins: ["https://lumina.example.test"],
      socialProviders: { google: { clientId: "gid", clientSecret: "gsecret" } },
      emailAndPassword: { enabled: false },
      rateLimit: { enabled: true, storage: "database" },
    });
    expect(Object.keys(options.socialProviders)).toEqual(["google"]);
    expect(options.advanced.defaultCookieAttributes.secure).toBe(true);
    expect(hoisted.resendCtor).toHaveBeenCalledWith("resend-test-key");
    expect(hoisted.captcha).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "cloudflare-turnstile",
        secretKey: "turnstile-secret",
        endpoints: expect.arrayContaining(["/sign-in/email-otp", "/sign-in/social"]),
      }),
    );
    expect(options.plugins.at(-1)).toEqual({ id: "consent-gate" });
  });

  it("uses insecure cookies only for a local http origin", () => {
    setEnv({ BETTER_AUTH_URL: "http://localhost:3000", APP_ENV: "development" });
    getMemberAuth();
    expect(capturedOptions().advanced.defaultCookieAttributes.secure).toBe(false);
  });

  it("sends localized OTP emails and hides provider errors", async () => {
    getMemberAuth();
    const otpOptions = hoisted.emailOTP.mock.calls[0]?.[0] as {
      sendVerificationOTP(input: { email: string; otp: string; type: string }): Promise<void>;
      otpLength: number;
      storeOTP: string;
    };
    expect(otpOptions).toMatchObject({ otpLength: 6, storeOTP: "hashed" });

    await otpOptions.sendVerificationOTP({ email: "user@example.test", otp: "123456", type: "sign-in" });
    expect(hoisted.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        from: "LUMINA <auth@example.test>",
        to: "user@example.test",
        subject: "LUMINA 로그인 인증 코드",
        text: expect.stringContaining("123456"),
      }),
    );

    await otpOptions.sendVerificationOTP({ email: "user@example.test", otp: "654321", type: "email-verification" });
    expect(hoisted.send).toHaveBeenLastCalledWith(expect.objectContaining({ subject: "LUMINA 이메일 인증 코드" }));

    hoisted.send.mockResolvedValue({ error: { message: "provider detail" } });
    await expect(otpOptions.sendVerificationOTP({ email: "user@example.test", otp: "1", type: "sign-in" })).rejects.toThrow(
      "Could not send the authentication email",
    );
  });
});

describe("getMemberAuthCaptchaSiteKey", () => {
  it("returns the trimmed site key", () => {
    setEnv({ MEMBER_AUTH_TURNSTILE_SITE_KEY: "  site-key  " });
    expect(getMemberAuthCaptchaSiteKey()).toBe("site-key");
  });

  it("returns null when blank or containing line breaks", () => {
    setEnv({ MEMBER_AUTH_TURNSTILE_SITE_KEY: "" });
    expect(getMemberAuthCaptchaSiteKey()).toBeNull();
    setEnv({ MEMBER_AUTH_TURNSTILE_SITE_KEY: "a\nb" });
    expect(getMemberAuthCaptchaSiteKey()).toBeNull();
  });
});
