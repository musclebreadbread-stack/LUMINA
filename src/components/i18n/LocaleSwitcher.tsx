"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/locale";

/**
 * 로케일 전환.
 *
 * 공개 URL 규약은 ko를 루트에, en을 /en/ 아래에 둔다. 쿠키도 함께 기록해 다음
 * 루트 이동에서 선택을 유지하고, 전체 경로 전환으로 Next 프록시가 새 로케일을
 * 서버 렌더링에 확실히 반영하게 한다.
 */
/** 컴포넌트 함수 바깥에 둔다 — 렌더 순수성을 가정하는 린트 규칙이 컴포넌트
 * 본문에서의 전역 객체(document) 변형을 허용하지 않기 때문이다. */
function setLocaleCookie(next: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("localeSwitch");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    setLocaleCookie(next);
    const currentPath = window.location.pathname;
    const currentPathWithoutLocale = currentPath === "/en" || currentPath.startsWith("/en/")
      ? currentPath.slice(3) || "/"
      : currentPath;
    const nextPath = next === "en"
      ? currentPathWithoutLocale === "/" ? "/en" : `/en${currentPathWithoutLocale}`
      : currentPathWithoutLocale;
    // 쿠키를 갱신한 뒤 새 URL을 라우팅하고 RSC 트리를 명시적으로 새로고침한다.
    // 프록시 rewrite가 기존 클라이언트 트리에 재사용되지 않도록 한다.
    startTransition(() => {
      router.push(`${nextPath}${window.location.search}`);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-px" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() => choose(l)}
          className={`inline-flex min-h-11 items-center px-3 font-mono text-[12px] whitespace-nowrap tracking-wide transition-colors disabled:opacity-50 ${
            l === locale
              ? "border border-hobun bg-hobun text-ink-900"
              : "border border-ink-700 text-hobun-faint hover:border-ink-600"
          }`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
