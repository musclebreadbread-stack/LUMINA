import { DEFAULT_LOCALE, LOCALES } from "../i18n/locale";

const PRIVATE_SHARE_PATHS = ["/r/:path*", "/p/:path*"] as const;

export const PRIVATE_SHARE_HEADER_SOURCES = Object.freeze([
  ...PRIVATE_SHARE_PATHS,
  ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)
    .flatMap((locale) => PRIVATE_SHARE_PATHS.map((path) => `/${locale}${path}`)),
]);

export function createPrivateShareHeaderRules() {
  return PRIVATE_SHARE_HEADER_SOURCES.map((source) => ({
    source,
    headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
    ],
  }));
}
