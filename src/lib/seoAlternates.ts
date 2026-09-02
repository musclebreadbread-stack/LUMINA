import "server-only";

import { headers } from "next/headers";
import type { Metadata } from "next";

import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from "@/i18n/locale";

/**
 * canonical·hreflang을 한 곳에서 만든다.
 *
 * 이 사이트의 URL 구조는 한국어가 접두사 없는 원본 경로(`/cognitive`)이고 영어가
 * `/en` 접두사(`/en/cognitive`)다 — proxy.ts가 `/en/*`를 원본 경로로 rewrite 하므로
 * 페이지 컴포넌트는 자기가 어떤 URL로 요청됐는지 알 수 없다. 그래서 proxy가
 * 로케일을 뗀 "논리 경로"를 헤더로 넘겨주고, 여기서 두 언어의 절대 URL을 되짚는다.
 *
 * 상대 경로를 돌려주면 Next가 layout의 metadataBase로 절대 URL을 만들어 준다.
 */
export const LOCALE_PATH_HEADER = "x-lumina-path";
export const LOCALE_HEADER = "x-lumina-locale";

/** 논리 경로(`/cognitive`)를 해당 로케일이 실제로 쓰는 경로로 바꾼다. */
export function localizedPath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** 쿼리스트링(utm 등)은 canonical에서 떨어뜨린다 — 같은 문서를 여러 URL로 만들지 않는다. */
function normalizePath(raw: string | null): string {
  if (!raw) return "/";
  const withoutQuery = raw.split("?")[0]?.split("#")[0] ?? "/";
  if (withoutQuery === "") return "/";
  const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  // 끝의 슬래시는 루트를 제외하고 떼어 canonical이 한 모양만 갖게 한다.
  return withSlash.length > 1 && withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

export async function currentLogicalPath(): Promise<string> {
  return normalizePath((await headers()).get(LOCALE_PATH_HEADER));
}

export async function currentLocale(): Promise<Locale> {
  const raw = (await headers()).get(LOCALE_HEADER);
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/**
 * 지금 요청에 맞는 canonical과 두 언어의 hreflang을 만든다.
 * `path`를 넘기면 헤더 대신 그 경로를 쓴다(동적 세그먼트 페이지에서 직접 지정할 때).
 */
export async function buildAlternates(path?: string): Promise<Metadata["alternates"]> {
  const logicalPath = path === undefined ? await currentLogicalPath() : normalizePath(path);
  const locale = await currentLocale();

  const languages: Record<string, string> = {};
  for (const supported of LOCALES) {
    languages[supported] = localizedPath(logicalPath, supported);
  }
  languages["x-default"] = localizedPath(logicalPath, DEFAULT_LOCALE);

  return { canonical: localizedPath(logicalPath, locale), languages };
}
