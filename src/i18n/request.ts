import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, isLocale, localeFromAcceptLanguage } from "./locale";

/**
 * 로케일 판정 순서: 쿠키(사용자가 고른 값) → Accept-Language 헤더 → 기본값(한국어).
 * URL에는 로케일이 없다 — locale.ts 주석 참고.
 */
export default getRequestConfig(async ({ locale: requestedLocale }) => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const fromProxy = (await headers()).get("x-lumina-locale");

  let locale = isLocale(requestedLocale)
    ? requestedLocale
    : isLocale(fromProxy)
      ? fromProxy
      : isLocale(fromCookie)
        ? fromCookie
        : undefined;

  if (!locale) {
    const acceptLanguage = (await headers()).get("accept-language") ?? "";
    locale = localeFromAcceptLanguage(acceptLanguage);
  }

  const messageLocale = locale === "ko" ? "ko" : "en";
  return {
    locale,
    messages: (await import(`../../messages/${messageLocale}.json`)).default,
  };
});
