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
};

export default withNextIntl(nextConfig);
