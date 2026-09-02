import type { MetadataRoute } from "next";
import { CHINESE_SIGNS, ZODIAC_SIGNS } from "@engine/horoscope/constants";
import { localizedPath } from "@/lib/seoAlternates";
import { getSiteUrl } from "@/lib/siteUrl";

const PUBLIC_PATHS = [
  "/",
  "/horoscope",
  "/numerology",
  "/psychometrics",
  "/psychometrics/types",
  "/darktriad",
  "/attachment",
  "/eq",
  "/cognitive",
  "/tarot",
  "/compatibility",
  "/characters",
  "/references",
  "/glossary",
  "/methodology",
  "/about",
  "/privacy",
  "/terms",
] as const;

/**
 * 문의 페이지는 공개 이메일이 설정됐을 때만 색인 대상이다(app/contact/page.tsx가
 * 값이 없으면 noindex로 응답한다). 색인하지 않을 URL은 사이트맵에 넣지 않는다.
 */
const CONDITIONAL_PATHS: readonly string[] = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
  ? ["/contact"]
  : [];

/**
 * 경로를 두 언어 URL로 펼친다. HTML의 canonical/hreflang과 같은 규칙(localizedPath)을
 * 써야 사이트맵과 페이지가 서로 다른 URL을 주장하는 일이 없다.
 */
function localizedEntry(pathname: string, siteUrl: URL): MetadataRoute.Sitemap[number] {
  const absolute = (path: string): string => new URL(path, siteUrl).toString();
  const koreanUrl = absolute(localizedPath(pathname, "ko"));

  return {
    url: koreanUrl,
    alternates: {
      languages: {
        ko: koreanUrl,
        en: absolute(localizedPath(pathname, "en")),
        "x-default": koreanUrl,
      },
    },
    changeFrequency: "monthly",
    priority: pathname === "/" ? 1 : 0.7,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publicEntries = [...PUBLIC_PATHS, ...CONDITIONAL_PATHS].map((pathname) =>
    localizedEntry(pathname, siteUrl),
  );
  const horoscopeEntries = [
    ...ZODIAC_SIGNS.map((sign) => `/horoscope/zodiac/${sign.key}`),
    ...CHINESE_SIGNS.map((sign) => `/horoscope/chinese/${sign.key}`),
  ].map((pathname) => localizedEntry(pathname, siteUrl));

  return [...publicEntries, ...horoscopeEntries];
}
