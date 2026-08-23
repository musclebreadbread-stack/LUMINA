/**
 * 지원 로케일.
 *
 * 기본 한국어 경로는 기존 공유 링크 모양을 유지하고, 영어는 `/en` 접두사를
 * 선택적으로 사용한다. 쿠키는 다음 방문의 언어 선택을 기억하는 보조 수단이다.
 */
export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_COOKIE = "lumina.locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ko" || value === "en";
}
