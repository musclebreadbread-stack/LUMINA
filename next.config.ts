import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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

export default withNextIntl(nextConfig);
