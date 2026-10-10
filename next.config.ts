import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";
import { createPrivateShareHeaderRules } from "./src/lib/privateShareHeaders";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDevelopment = process.env.NODE_ENV === "development";
function httpsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.origin : null;
  } catch {
    return null;
  }
}

function sentryOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

const umamiOrigin = httpsOrigin(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL);
const sentryIngestOrigin = sentryOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);
const scriptSources = [
  "'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : []),
  "https://challenges.cloudflare.com", "https://pagead2.googlesyndication.com",
  "https://t1.kakaocdn.net", "https://www.google.com",
  "https://www.gstatic.com", "https://*.tosspayments.com",
  ...(umamiOrigin ? [umamiOrigin] : []),
];
const connectSources = [
  "'self'", "https://challenges.cloudflare.com",
  "https://*.googlesyndication.com", "https://googleads.g.doubleclick.net",
  "https://*.tosspayments.com",
  ...(umamiOrigin ? [umamiOrigin] : []), ...(sentryIngestOrigin ? [sentryIngestOrigin] : []),
];
// Keep this nonce-free and static; nonce CSP requires dynamic rendering in Next.js.
// Kakao/Google/Apple sign-in are excluded on purpose: SignInPanel.tsx drives them
// with a plain window.location.assign() top-level navigation (confirmed by
// reading the code), which CSP's fetch/frame directives don't govern — this repo
// has no navigate-to directive, so there's nothing for those origins to unblock.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  `script-src ${scriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  "font-src 'self' data:",
  `connect-src ${connectSources.join(" ")}`,
  "media-src 'self' data: blob:",
  "frame-src 'self' https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.tosspayments.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
      ...createPrivateShareHeaderRules(),
    ];
  },
  images: {
    // AVIF 우선, 지원하지 않는 브라우저에는 WebP로 응답한다.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 480, 640, 768, 1024, 1280, 1536, 2048],
    imageSizes: [24, 32, 48, 64, 96, 128, 180, 220, 384, 640],
    qualities: [50, 60, 75, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // 폰트 서브셋·OG용 PNG 파생본은 .gitignore 대상이라 파일 추적기가 자동으로
  // 못 찾는다. 라우트 키는 실제 URL이 아니라 picomatch로 매칭되는 파일시스템
  // 라우트 패턴이라 대괄호 동적 세그먼트는 이스케이프해야 한다.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.pnpm/next@*/node_modules/@swc/helpers/**/*"],
    "/r/\\[data\\]": ["./public/fonts/og/**/*", "./public/og/**/*"],
    "/psychometrics/types/**": ["./public/fonts/og/**/*", "./public/og/**/*"],
    "/s/\\[kind\\]/\\[code\\]": ["./public/fonts/og/**/*", "./public/og/**/*"],
    "/tarot/\\[spread\\]/\\[seed\\]": ["./public/fonts/og/**/*", "./public/tarot/cards/**/*"],
    "/horoscope/\\[system\\]/\\[sign\\]": [
      "./public/fonts/og/**/*",
      "./public/horoscope/zodiac/**/*",
      "./public/saju/zodiac/**/*",
    ],
  },
};

const intlConfig = withNextIntl(nextConfig);

export default withSentryConfig(intlConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});
