import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isPathForLocale(pathname: string, locale: Locale): boolean {
  const prefix = `/${locale}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function stripLocalePrefix(pathname: string, locale: Locale): string {
  const prefix = `/${locale}`;
  const stripped = pathname.slice(prefix.length);
  return stripped || "/";
}

function detectedLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  return acceptLanguage.toLowerCase().startsWith("en") ? "en" : routing.defaultLocale;
}

function requestWithLocale(request: NextRequest, locale: Locale): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-lumina-locale", locale);
  return headers;
}

function setLocaleCookie(response: NextResponse, locale: Locale): void {
  response.cookies.set({
    name: LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const locale = detectedLocale(request);
  const headers = requestWithLocale(request, locale);

  if (isPathForLocale(pathname, "en")) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocalePrefix(pathname, "en");
    const response = NextResponse.rewrite(url, {
      request: { headers: requestWithLocale(request, "en") },
    });
    setLocaleCookie(response, "en");
    return response;
  }

  if (isPathForLocale(pathname, "ko")) {
    const url = request.nextUrl.clone();
    url.pathname = stripLocalePrefix(pathname, "ko");
    const response = NextResponse.redirect(url);
    setLocaleCookie(response, "ko");
    return response;
  }

  if (locale === "en") {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
