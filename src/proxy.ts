import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { LOCALE_HEADER, LOCALE_PATH_HEADER } from "@/lib/seoAlternates";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 검색·SNS 크롤러. 이들에게는 Accept-Language 기반 자동 전환을 걸지 않는다 —
 * 구글은 "감지된 언어로 자동 리다이렉트"를 권장하지 않고, 무엇보다 en 헤더를 보내는
 * 크롤러가 한국어 원본 URL에 영영 도달하지 못하면 그 URL이 색인되지 않는다.
 * 사람이 쓰는 브라우저의 자동 전환 동작은 그대로 둔다.
 */
const CRAWLER_PATTERN =
  /bot|crawler|spider|crawling|googlebot|bingbot|yeti|daum|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|kakaotalk|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|applebot|petalbot|lighthouse|gptbot|claudebot|perplexitybot/i;

function isCrawler(request: NextRequest): boolean {
  return CRAWLER_PATTERN.test(request.headers.get("user-agent") ?? "");
}

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

/**
 * 서버 컴포넌트가 읽을 요청 헤더. 로케일과 함께 "로케일을 뗀 논리 경로"를 넘긴다 —
 * `/en/*`는 rewrite로 들어오기 때문에 페이지는 원래 URL을 알 수 없고, canonical과
 * hreflang을 만들려면 이 두 값이 모두 필요하다(seoAlternates.ts).
 */
function requestWithLocale(request: NextRequest, locale: Locale, logicalPath: string): Headers {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  headers.set(LOCALE_PATH_HEADER, logicalPath);
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

  if (isPathForLocale(pathname, "en")) {
    const logicalPath = stripLocalePrefix(pathname, "en");
    const url = request.nextUrl.clone();
    url.pathname = logicalPath;
    const response = NextResponse.rewrite(url, {
      request: { headers: requestWithLocale(request, "en", logicalPath) },
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

  // 크롤러(카카오톡·X 링크 미리보기 봇)가 Accept-Language: en 을 보내면 og 이미지가
  // 307 리다이렉트로 응답해 미리보기 카드가 깨진다 — 확장자 없는 메타데이터 라우트라
  // matcher 에서 걸러지지 않으므로 여기서 직접 우회한다.
  if (pathname.endsWith("/opengraph-image") || pathname.endsWith("/twitter-image")) {
    return NextResponse.next({ request: { headers: requestWithLocale(request, locale, pathname) } });
  }

  // 크롤러는 요청한 URL을 그대로 받아야 한다 — 한국어 원본 경로도 색인될 수 있도록.
  if (locale === "en" && !isCrawler(request)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return NextResponse.redirect(url);
  }

  // 접두사 없는 경로는 한국어 문서다. en으로 판정된 크롤러가 여기 도달했더라도
  // 이 URL이 대표하는 언어(한국어)로 응답해야 canonical/hreflang과 어긋나지 않는다.
  const servedLocale = locale === "en" ? routing.defaultLocale : locale;
  return NextResponse.next({
    request: { headers: requestWithLocale(request, servedLocale, pathname) },
  });
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
