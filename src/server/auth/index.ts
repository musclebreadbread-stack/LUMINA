import "server-only";

import { betterAuth } from "better-auth";
import { captcha, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { serverFeatureFlags } from "@/lib/flags";
import { getActiveConsentVersions } from "@/server/member/consents";
import { memberConsentGate } from "./consentGate";
import { getIdentityPool } from "./database";

type ProviderCredentials = Readonly<{ clientId: string; clientSecret: string }>;

function readProviderCredentials(idName: string, secretName: string): ProviderCredentials | null {
  const clientId = process.env[idName]?.trim();
  const clientSecret = process.env[secretName]?.trim();

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error(`${idName} and ${secretName} must be configured together`);
  }

  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function memberAuthBaseUrl(): URL {
  const rawValue = process.env.BETTER_AUTH_URL;
  if (!rawValue) throw new Error("BETTER_AUTH_URL is not configured");

  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error("BETTER_AUTH_URL must be an absolute HTTP URL");
  }

  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("BETTER_AUTH_URL must contain only the public origin");
  }
  if (process.env.APP_ENV !== "development" && url.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS outside local development");
  }

  return url;
}

export function isMemberAuthConfigured(): boolean {
  if (!serverFeatureFlags.memberAuth) return false;
  if (process.env.MEMBER_LEGAL_DOCUMENTS_APPROVED !== "true") return false;

  const requiredValues = [
    process.env.BETTER_AUTH_SECRET,
    process.env.IDENTITY_DATABASE_URL,
    process.env.MEMBER_DATABASE_URL,
    process.env.RESEND_API_KEY,
    process.env.AUTH_EMAIL_FROM,
    process.env.MEMBER_AUTH_TURNSTILE_SECRET_KEY,
    process.env.MEMBER_AUTH_TURNSTILE_SITE_KEY,
  ];
  if (requiredValues.some((value) => !value?.trim())) return false;
  if ((process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32) return false;
  if (!getActiveConsentVersions()) return false;

  try {
    memberAuthBaseUrl();
    readProviderCredentials("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
    readProviderCredentials("KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET");
    readProviderCredentials("APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET");
  } catch {
    return false;
  }

  return true;
}

export function getMemberSocialProviders(): Readonly<{ google: boolean; kakao: boolean; apple: boolean }> {
  return {
    google: Boolean(readProviderCredentials("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")),
    kakao: Boolean(readProviderCredentials("KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET")),
    apple: Boolean(readProviderCredentials("APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET")),
  };
}

export function getMemberAuth() {
  if (!isMemberAuthConfigured()) throw new Error("Member authentication is not configured");

  const baseUrl = memberAuthBaseUrl();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const authEmailFrom = process.env.AUTH_EMAIL_FROM;
  if (!authEmailFrom || /[\r\n]/u.test(authEmailFrom)) {
    throw new Error("AUTH_EMAIL_FROM is invalid");
  }

  const google = readProviderCredentials("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  const kakao = readProviderCredentials("KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET");
  const apple = readProviderCredentials("APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET");
  const turnstileSecretKey = process.env.MEMBER_AUTH_TURNSTILE_SECRET_KEY;
  if (!turnstileSecretKey) throw new Error("MEMBER_AUTH_TURNSTILE_SECRET_KEY is not configured");
  const socialProviders = {
    ...(google ? { google } : {}),
    ...(kakao ? { kakao } : {}),
    ...(apple ? { apple } : {}),
  };

  return betterAuth({
    appName: "LUMINA",
    basePath: "/api/account/auth",
    baseURL: baseUrl.origin,
    database: getIdentityPool(),
    emailAndPassword: { enabled: false },
    plugins: [
      captcha({
        provider: "cloudflare-turnstile",
        secretKey: turnstileSecretKey,
        endpoints: [
          "/email-otp/send-verification-otp",
          "/sign-in/email-otp",
          "/sign-in/social",
        ],
      }),
      emailOTP({
        allowedAttempts: 3,
        disableSignUp: false,
        expiresIn: 300,
        otpLength: 6,
        rateLimit: { max: 3, window: 60 },
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          const subject = type === "sign-in" ? "LUMINA 로그인 인증 코드" : "LUMINA 이메일 인증 코드";
          const { error } = await resend.emails.send({
            from: authEmailFrom,
            to: email,
            subject,
            text: `LUMINA 인증 코드: ${otp}\n유효 시간은 5분입니다. 본인이 요청하지 않았다면 이 메일을 무시하세요.`,
          });
          if (error) throw new Error("Could not send the authentication email");
        },
      }),
      nextCookies(),
      memberConsentGate,
    ],
    socialProviders,
    rateLimit: {
      enabled: true,
      max: 5,
      storage: "database",
      window: 60,
    },
    secret: process.env.BETTER_AUTH_SECRET,
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    trustedOrigins: [baseUrl.origin],
    advanced: {
      cookiePrefix: "lumina-member",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: baseUrl.protocol === "https:",
      },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
  });
}

export function getMemberAuthCaptchaSiteKey(): string | null {
  const value = process.env.MEMBER_AUTH_TURNSTILE_SITE_KEY?.trim();
  return value && !/[\r\n]/u.test(value) ? value : null;
}
