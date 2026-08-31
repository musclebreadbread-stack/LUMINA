import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import Script from "next/script";
import { AnalyticsGate } from "@/components/analytics/AnalyticsGate";
import { ConsentBanner } from "@/components/ads/ConsentBanner";
import { PlatformAtmosphere } from "@/components/scene3d/PlatformAtmosphere";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

/* 본문·UI — 계측기 눈금판의 서체. 한글 전 굵기를 갖춘다. */
const plexKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

/* 수치·시각·좌표 — 자릿수가 흔들리지 않아야 하는 모든 값. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

/* 여덟 글자 — 한자 자형 자체가 이 화면의 주인공이다. */
const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  subsets: ["latin"],
  weight: ["500", "900"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();

  return {
    metadataBase: getSiteUrl(),
    title: {
      default: t("metaHome.title"),
      template: "%s · LUMINA",
    },
    description: t("metaHome.description"),
    applicationName: "LUMINA",
    openGraph: {
      title: t("metaHome.title"),
      description: t("metaHome.ogDescription"),
      siteName: "LUMINA",
      locale: locale === "ko" ? "ko_KR" : "en_US",
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0D1118",
  colorScheme: "dark",
};

const adSenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${plexKr.variable} ${plexMono.variable} ${notoSerifKr.variable} h-full`}
    >
      <body className="lumina-app relative min-h-full">
        {/* 게시자 ID가 없으면(지금 상태) 이 스크립트는 아예 렌더되지 않는다. */}
        {adSenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adSenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PlatformAtmosphere />
          <div className="lumina-app-shell relative z-10">{children}</div>
          <ConsentBanner />
          <AnalyticsGate />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
