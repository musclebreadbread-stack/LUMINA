import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import Script from "next/script";
import { Suspense } from "react";
import { AnalyticsGate } from "@/components/analytics/AnalyticsGate";
import { ConsentBanner } from "@/components/ads/ConsentBanner";
import { BgmControl } from "@/components/audio/BgmControl";
import { PlatformAtmosphere } from "@/components/scene3d/PlatformAtmosphere";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildAlternates } from "@/lib/seoAlternates";
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
    // 모든 페이지가 이 canonical/hreflang을 물려받는다. 페이지가 직접 alternates를
    // 지정하면 그 값이 이긴다(동적 세그먼트 페이지가 자기 경로를 넘기는 경우).
    alternates: await buildAlternates(),
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
  const t = await getTranslations();
  const siteUrl = getSiteUrl().toString().replace(/\/$/u, "");

  // 화면에 실제로 있는 것만 기술한다 — 사이트 이름, 발행 주체, 사용 언어.
  // 사이트 내 검색(SearchAction)·평점·저자는 이 사이트에 없으므로 넣지 않는다.
  const organizationId = `${siteUrl}/#organization`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "LUMINA",
        url: siteUrl,
        logo: `${siteUrl}/icon.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "LUMINA",
        url: siteUrl,
        description: t("metaHome.description"),
        inLanguage: locale === "ko" ? "ko-KR" : "en-US",
        publisher: { "@id": organizationId },
      },
    ],
  };

  return (
    <html
      lang={locale}
      className={`${plexKr.variable} ${plexMono.variable} ${notoSerifKr.variable} h-full`}
    >
      <body className="lumina-app relative min-h-full">
        <JsonLd data={structuredData} />
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
          <Suspense fallback={null}>
            <BgmControl />
          </Suspense>
          <ConsentBanner />
          <AnalyticsGate />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
