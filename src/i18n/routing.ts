import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE } from "./locale";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeCookie: {
    name: LOCALE_COOKIE,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  },
  alternateLinks: false,
});
