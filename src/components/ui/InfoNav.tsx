import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";

/** 참고문헌·용어집·검증 페이지에서 공통으로 쓰는 읽기용 보조 내비게이션. */
export async function InfoNav() {
  const t = await getTranslations("nav");
  return (
    <header className="site-header flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
      <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
        LUMINA
      </Link>
      <nav className="no-print flex flex-wrap items-center justify-end gap-2">
        <Link href="/references" className="theme-control inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim hover:border-ink-600 hover:text-hobun">
          {t("references")}
        </Link>
        <Link href="/glossary" className="theme-control inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim hover:border-ink-600 hover:text-hobun">
          {t("glossary")}
        </Link>
        <Link href="/methodology" className="theme-control inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim hover:border-ink-600 hover:text-hobun">
          {t("methodology")}
        </Link>
        <Link href="/characters" className="theme-control inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim hover:border-ink-600 hover:text-hobun">
          {t("characters")}
        </Link>
        <Link href="/about" className="theme-control inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim hover:border-ink-600 hover:text-hobun">
          {t("about")}
        </Link>
        <LocaleSwitcher />
      </nav>
    </header>
  );
}
