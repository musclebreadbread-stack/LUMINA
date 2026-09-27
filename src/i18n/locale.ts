/**
 * 지원 로케일.
 *
 * 기본 한국어 경로는 기존 공유 링크 모양을 유지하고, 그 밖의 언어는 언어 접두사를
 * 사용한다. 쿠키는 다음 방문의 언어 선택을 기억하는 보조 수단이다.
 */
export const LOCALES = ["ko", "en", "ja", "zh-Hant", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const CONTENT_LOCALES = ["ko", "en"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_COOKIE = "lumina.locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function contentLocaleFor(locale: Locale): ContentLocale {
  return locale === "ko" ? "ko" : "en";
}

export function localeFromAcceptLanguage(value: string): Locale {
  const parsedCandidates = value.split(",")
    .map((part, index) => {
      const [range = "", ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) => /^q\s*=/iu.test(parameter.trim()));
      const qualityValue = qualityParameter?.split("=", 2)[1]?.trim();
      const quality = qualityValue === undefined ? 1 : Number(qualityValue);
      return { range: range.trim().toLowerCase(), quality, index };
    });
  const candidates = parsedCandidates
    .filter((candidate) => candidate.range !== "" && candidate.quality > 0 && candidate.quality <= 1)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const { range: candidate } of candidates) {
    if (candidate === "ko" || candidate.startsWith("ko-")) return "ko";
    if (candidate === "en" || candidate.startsWith("en-")) return "en";
    if (candidate === "ja" || candidate.startsWith("ja-")) return "ja";
    if (candidate === "es" || candidate.startsWith("es-")) return "es";
    if (candidate === "zh-hant" || /^zh-(tw|hk|mo)(-|$)/u.test(candidate)) return "zh-Hant";
    if (candidate === "zh" || candidate.startsWith("zh-")) return "en";
  }
  if (parsedCandidates.some(({ range, quality }) => quality === 0 && (range === "ko" || range.startsWith("ko-")))) {
    return "en";
  }
  return DEFAULT_LOCALE;
}

export function localePath(path: string, locale: Locale): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return normalizedPath;
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function intlLocale(locale: Locale): string {
  switch (locale) {
    case "ko": return "ko-KR";
    case "en": return "en-US";
    case "ja": return "ja-JP";
    case "zh-Hant": return "zh-TW";
    case "es": return "es-ES";
  }
}

export function openGraphLocale(locale: Locale): string {
  switch (locale) {
    case "ko": return "ko_KR";
    case "en": return "en_US";
    case "ja": return "ja_JP";
    case "zh-Hant": return "zh_TW";
    case "es": return "es_ES";
  }
}
