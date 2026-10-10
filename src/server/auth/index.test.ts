import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captcha, emailOTP } from "better-auth/plugins";

type ActiveConsentVersions = Readonly<{
  terms: string;
  privacy: string;
  overseas_transfer: string;
}> | null;

type ResendEmailMessage = Readonly<{
  from: string;
  to: string;
  subject: string;
  text: string;
}>;

type ResendEmailResult = Readonly<{ error: unknown | null }>;

type EmailOTPOptions = Parameters<typeof emailOTP>[0];
type VerificationOTPInput = Parameters<EmailOTPOptions["sendVerificationOTP"]>[0];

const {
  serverFeatureFlagsMock,
  getActiveConsentVersionsMock,
  betterAuthMock,
  captchaMock,
  emailOTPMock,
  nextCookiesMock,
  getIdentityPoolMock,
  resendEmailSendMock,
  resendConstructorMock,
  authInstance,
  identityPool,
  captchaPlugin,
  emailOTPPlugin,
  nextCookiesPlugin,
  memberConsentGatePlugin,
} = vi.hoisted(() => ({
  serverFeatureFlagsMock: { memberAuth: true },
  getActiveConsentVersionsMock: vi.fn<() => ActiveConsentVersions>(),
  betterAuthMock: vi.fn<(options: unknown) => unknown>(),
  captchaMock: vi.fn<(options: Parameters<typeof captcha>[0]) => unknown>(),
  emailOTPMock: vi.fn<(options: EmailOTPOptions) => unknown>(),
  nextCookiesMock: vi.fn<() => unknown>(),
  getIdentityPoolMock: vi.fn<() => unknown>(),
  resendEmailSendMock: vi.fn<(message: ResendEmailMessage) => Promise<ResendEmailResult>>(),
  resendConstructorMock: vi.fn<(apiKey: string | undefined) => void>(),
  authInstance: Object.freeze({ kind: "test-auth-instance" }),
  identityPool: Object.freeze({ kind: "test-identity-pool" }),
  captchaPlugin: Object.freeze({ kind: "test-captcha-plugin" }),
  emailOTPPlugin: Object.freeze({ kind: "test-email-otp-plugin" }),
  nextCookiesPlugin: Object.freeze({ kind: "test-next-cookies-plugin" }),
  memberConsentGatePlugin: Object.freeze({ kind: "test-member-consent-gate-plugin" }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/flags", () => ({ serverFeatureFlags: serverFeatureFlagsMock }));
vi.mock("@/server/member/consents", () => ({
  getActiveConsentVersions: getActiveConsentVersionsMock,
}));
vi.mock("./consentGate", () => ({ memberConsentGate: memberConsentGatePlugin }));
vi.mock("./database", () => ({ getIdentityPool: getIdentityPoolMock }));
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/plugins", () => ({ captcha: captchaMock, emailOTP: emailOTPMock }));
vi.mock("better-auth/next-js", () => ({ nextCookies: nextCookiesMock }));
vi.mock("resend", () => ({
  Resend: class {
    readonly emails = { send: resendEmailSendMock };

    constructor(apiKey: string | undefined) {
      resendConstructorMock(apiKey);
    }
  },
}));

import {
  getMemberAuth,
  getMemberAuthCaptchaSiteKey,
  getMemberSocialProviders,
  isMemberAuthConfigured,
} from "./index";

describe("member authentication configuration", () => {
  beforeEach(() => {
    serverFeatureFlagsMock.memberAuth = true;
    getActiveConsentVersionsMock.mockReset().mockReturnValue({
      terms: "terms-v1",
      privacy: "privacy-v1",
      overseas_transfer: "transfer-v1",
    });
    betterAuthMock.mockReset().mockReturnValue(authInstance);
    captchaMock.mockReset().mockReturnValue(captchaPlugin);
    emailOTPMock.mockReset().mockReturnValue(emailOTPPlugin);
    nextCookiesMock.mockReset().mockReturnValue(nextCookiesPlugin);
    getIdentityPoolMock.mockReset().mockReturnValue(identityPool);
    resendEmailSendMock.mockReset().mockResolvedValue({ error: null });
    resendConstructorMock.mockReset();
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("MEMBER_LEGAL_DOCUMENTS_APPROVED", "true");
    vi.stubEnv("BETTER_AUTH_SECRET", "synthetic-member-auth-secret-with-32-bytes");
    vi.stubEnv("IDENTITY_DATABASE_URL", "postgresql://identity.invalid/database");
    vi.stubEnv("MEMBER_DATABASE_URL", "postgresql://member.invalid/database");
    vi.stubEnv("RESEND_API_KEY", "synthetic-resend-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "LUMINA <auth@example.test>");
    vi.stubEnv("MEMBER_AUTH_TURNSTILE_SECRET_KEY", "synthetic-turnstile-secret");
    vi.stubEnv("MEMBER_AUTH_TURNSTILE_SITE_KEY", "synthetic-turnstile-site");
    vi.stubEnv("BETTER_AUTH_URL", "https://lumina.example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts complete single-line configuration", () => {
    expect(isMemberAuthConfigured()).toBe(true);
    expect(getMemberAuthCaptchaSiteKey()).toBe("synthetic-turnstile-site");
  });

  it("fails closed when the sender contains a line break", () => {
    vi.stubEnv("AUTH_EMAIL_FROM", "LUMINA <auth@example.test>\r\nBcc: attacker@example.test");

    expect(isMemberAuthConfigured()).toBe(false);
  });

  it("fails closed when the Turnstile secret contains a line break", () => {
    vi.stubEnv("MEMBER_AUTH_TURNSTILE_SECRET_KEY", "synthetic-secret\ninvalid-suffix");

    expect(isMemberAuthConfigured()).toBe(false);
  });

  it("fails closed and hides the site key when it contains a line break", () => {
    vi.stubEnv("MEMBER_AUTH_TURNSTILE_SITE_KEY", "synthetic-site\r\ninvalid-suffix");

    expect(isMemberAuthConfigured()).toBe(false);
    expect(getMemberAuthCaptchaSiteKey()).toBeNull();
  });

  it("keeps authentication disabled until the feature, legal, and consent gates pass", () => {
    serverFeatureFlagsMock.memberAuth = false;
    expect(isMemberAuthConfigured()).toBe(false);

    serverFeatureFlagsMock.memberAuth = true;
    vi.stubEnv("MEMBER_LEGAL_DOCUMENTS_APPROVED", "false");
    expect(isMemberAuthConfigured()).toBe(false);

    vi.stubEnv("MEMBER_LEGAL_DOCUMENTS_APPROVED", "true");
    getActiveConsentVersionsMock.mockReturnValue(null);
    expect(isMemberAuthConfigured()).toBe(false);
  });

  it.each([
    { name: "a relative URL", url: "auth.example.test" },
    { name: "an origin with credentials", url: "https://user:password@lumina.example" },
    { name: "an origin with a path", url: "https://lumina.example/api" },
    { name: "an origin with a query", url: "https://lumina.example?next=/account" },
    { name: "an origin with a fragment", url: "https://lumina.example#account" },
    { name: "HTTP outside development", url: "http://lumina.example" },
  ])("fails closed for $name", ({ url }) => {
    vi.stubEnv("BETTER_AUTH_URL", url);

    expect(isMemberAuthConfigured()).toBe(false);
  });

  it("only enables social providers with complete credential pairs", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-google-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "synthetic-google-secret");

    expect(getMemberSocialProviders()).toEqual({ google: true, kakao: false, apple: false });
    expect(getMemberAuth()).toBe(authInstance);
    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({
      socialProviders: {
        google: { clientId: "synthetic-google-client", clientSecret: "synthetic-google-secret" },
      },
    }));
  });

  it("does not construct auth when a social credential pair is incomplete", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "synthetic-google-client");

    expect(isMemberAuthConfigured()).toBe(false);
    expect(() => getMemberAuth()).toThrow("Member authentication is not configured");
    expect(betterAuthMock).not.toHaveBeenCalled();
    expect(resendConstructorMock).not.toHaveBeenCalled();
  });

  it("builds the protected OTP runtime and sanitizes delivery errors", async () => {
    expect(getMemberAuth()).toBe(authInstance);

    expect(getIdentityPoolMock).toHaveBeenCalledOnce();
    expect(resendConstructorMock).toHaveBeenCalledOnce();
    expect(resendConstructorMock).toHaveBeenCalledWith("synthetic-resend-key");
    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({
      appName: "LUMINA",
      basePath: "/api/account/auth",
      baseURL: "https://lumina.example",
      database: identityPool,
      emailAndPassword: { enabled: false },
      plugins: [captchaPlugin, emailOTPPlugin, nextCookiesPlugin, memberConsentGatePlugin],
      rateLimit: { enabled: true, max: 5, storage: "database", window: 60 },
      session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
      trustedOrigins: ["https://lumina.example"],
      advanced: {
        cookiePrefix: "lumina-member",
        defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: true },
        ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      },
    }));
    expect(captchaMock).toHaveBeenCalledWith({
      provider: "cloudflare-turnstile",
      secretKey: "synthetic-turnstile-secret",
      endpoints: [
        "/email-otp/send-verification-otp",
        "/sign-in/email-otp",
        "/sign-in/social",
      ],
    });
    expect(emailOTPMock).toHaveBeenCalledWith(expect.objectContaining({
      allowedAttempts: 3,
      disableSignUp: false,
      expiresIn: 300,
      otpLength: 6,
      rateLimit: { max: 3, window: 60 },
      storeOTP: "hashed",
    }));
    expect(nextCookiesMock).toHaveBeenCalledOnce();

    const otpOptions = emailOTPMock.mock.calls[0]?.[0];
    if (!otpOptions) throw new Error("Email OTP plugin configuration was not captured");

    await otpOptions.sendVerificationOTP({
      email: "member@example.test",
      otp: "123456",
      type: "sign-in",
    } satisfies VerificationOTPInput);
    expect(resendEmailSendMock).toHaveBeenCalledWith({
      from: "LUMINA <auth@example.test>",
      to: "member@example.test",
      subject: "LUMINA 로그인 인증 코드",
      text: "LUMINA 인증 코드: 123456\n유효 시간은 5분입니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.",
    });

    await otpOptions.sendVerificationOTP({
      email: "member@example.test",
      otp: "654321",
      type: "email-verification",
    });
    expect(resendEmailSendMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subject: "LUMINA 이메일 인증 코드",
      text: expect.stringContaining("654321"),
    }));

    resendEmailSendMock.mockResolvedValueOnce({ error: new Error("synthetic provider detail") });
    await expect(otpOptions.sendVerificationOTP({
      email: "member@example.test",
      otp: "111222",
      type: "sign-in",
    })).rejects.toThrow("Could not send the authentication email");

    resendEmailSendMock.mockRejectedValueOnce(new Error("synthetic provider rejection detail"));
    await expect(otpOptions.sendVerificationOTP({
      email: "member@example.test",
      otp: "333444",
      type: "sign-in",
    })).rejects.toMatchObject({ message: "Could not send the authentication email" });
  });

  it("uses insecure cookies only for an explicit local development origin", () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");

    expect(isMemberAuthConfigured()).toBe(true);
    expect(getMemberAuth()).toBe(authInstance);
    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: "http://localhost:3000",
      advanced: expect.objectContaining({
        defaultCookieAttributes: expect.objectContaining({ secure: false }),
      }),
    }));
  });
});
