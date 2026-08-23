"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  notifyConsentChanged,
  saveConsent,
  subscribeConsent,
} from "@/lib/consent";

/**
 * 동의 배너.
 *
 * "Google 인증 CMP" 자체는 외부 인증 서비스에 가입해야 얻는 자격이다. 이 배너는
 * 그 자리를 채우는 구조적 준비물이다 — 선택을 로컬에 저장하고 AdSlot 이 그 값을
 * 읽어 개인화·비개인화 광고를 가른다. 실제 인증 CMP를 붙일 때는 이 컴포넌트를
 * 그 SDK가 제공하는 배너로 교체하고, 저장 로직만 유지하면 된다.
 *
 * 선택하기 전에는 광고를 아예 요청하지 않는다 — "거부 시 비개인화 폴백"이 아니라
 * "선택 전에는 요청 자체를 안 함"이 이용자에게 더 안전한 기본값이다.
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const choice = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const bannerRef = useRef<HTMLDivElement>(null);

  /* 고정 배너는 문서 흐름 밖에 있어서 그 높이만큼 마지막 콘텐츠를 영구히 가린다.
     실측 높이를 --consent-banner-h 로 문서 뿌리에 걸어 두면, globals.css 의
     body padding-bottom 이 그만큼 문서 끝에 여백을 확보해 스크롤을 끝까지 내렸을 때
     어떤 내용도 배너 뒤에 남지 않는다. */
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty("--consent-banner-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-banner-h");
    };
  }, []);

  if (choice !== null) return null;

  function choose(value: "accepted" | "rejected") {
    saveConsent(value);
    notifyConsentChanged();
  }

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label={t("ariaLabel")}
      className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-ink-700 bg-ink-900/98 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:px-8"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-hobun-dim">
          {t("message")}{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            {t("learnMore")}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="inline-flex min-h-11 items-center border border-ink-700 px-4 text-xs text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
          >
            {t("reject")}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="inline-flex min-h-11 items-center bg-hobun px-4 text-xs font-medium text-ink-900 transition-opacity hover:opacity-85"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
