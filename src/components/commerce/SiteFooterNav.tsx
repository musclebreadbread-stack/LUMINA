"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AccountMenu } from "@/components/account/AccountMenu";
import { localePath, type Locale } from "@/i18n/locale";

const ADMIN_PATH = /^(?:\/[A-Za-z-]+)?\/admin(?:\/|$)/u;

interface SiteFooterNavProps {
  readonly locale: Locale;
  /** 회원 인증이 꺼진 환경에서는 계정 메뉴가 열어 볼 세션 자체가 없으므로 감춘다. */
  readonly memberAuthEnabled: boolean;
}

/**
 * 모든 페이지 하단의 공통 링크(Track C4). 페이지마다 자기 헤더를 따로 그리는 구조라
 * 전역 헤더를 얹으면 각 헤더의 언어 전환기와 겹치므로, 겹칠 자리가 없는 하단에 둔다.
 * 요금·환불·약관 링크는 결제 심사가 요구하는 "모든 페이지에서 접근 가능한 고지"도 겸한다.
 */
export function SiteFooterNav({ locale, memberAuthEnabled }: SiteFooterNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  if (pathname !== null && ADMIN_PATH.test(pathname)) return null;

  const linkClass = "text-hobun-faint underline-offset-4 hover:text-hobun hover:underline focus-visible:text-hobun";
  return (
    <nav
      aria-label={t("footerLabel")}
      className="no-print mx-auto w-full max-w-4xl px-5 pb-6 pt-10 text-xs leading-6 sm:px-8"
    >
      <ul className="flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-ink-800 pt-5">
        <li><Link href={localePath("/pricing", locale)} className={linkClass}>{t("pricing")}</Link></li>
        <li><Link href={localePath("/refund-policy", locale)} className={linkClass}>{t("refund")}</Link></li>
        <li><Link href={localePath("/terms", locale)} className={linkClass}>{t("terms")}</Link></li>
        <li><Link href={localePath("/privacy", locale)} className={linkClass}>{t("privacy")}</Link></li>
        {memberAuthEnabled ? <li><AccountMenu locale={locale} /></li> : null}
      </ul>
    </nav>
  );
}
