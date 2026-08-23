import type { MetadataRoute } from "next";
import { CHINESE_SIGNS, ZODIAC_SIGNS } from "@engine/horoscope/constants";
import { getSiteUrl } from "@/lib/siteUrl";

const PUBLIC_PATHS = [
  "/",
  "/saju",
  "/horoscope",
  "/numerology",
  "/psychometrics",
  "/psychometrics/types",
  "/tarot",
  "/compatibility",
  "/characters",
  "/references",
  "/glossary",
  "/methodology",
  "/privacy",
  "/terms",
] as const;

function localizedEntry(pathname: string, siteUrl: URL): MetadataRoute.Sitemap[number] {
  const defaultUrl = new URL(pathname, siteUrl).toString();
  const englishPath = pathname === "/" ? "/en" : `/en${pathname}`;

  return {
    url: defaultUrl,
    alternates: {
      languages: {
        ko: defaultUrl,
        en: new URL(englishPath, siteUrl).toString(),
      },
    },
    changeFrequency: "monthly",
    priority: pathname === "/" ? 1 : 0.7,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const publicEntries = PUBLIC_PATHS.map((pathname) => localizedEntry(pathname, siteUrl));
  const horoscopeEntries = [
    ...ZODIAC_SIGNS.map((sign) => `/horoscope/zodiac/${sign.key}`),
    ...CHINESE_SIGNS.map((sign) => `/horoscope/chinese/${sign.key}`),
  ].map((pathname) => localizedEntry(pathname, siteUrl));

  return [...publicEntries, ...horoscopeEntries];
}
