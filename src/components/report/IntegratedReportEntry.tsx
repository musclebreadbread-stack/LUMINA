"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/** 개별 결과의 방법 설명 뒤에 놓이는 통합 자기초상 진입점. */
export function IntegratedReportEntry() {
  const t = useTranslations("integratedPortrait");

  return (
    <section
      className="integrated-report-entry no-print"
      data-integrated-report-entry
      aria-labelledby="integrated-report-entry-heading"
    >
      <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{t("entry.kicker")}</p>
      <h2 id="integrated-report-entry-heading" className="mt-2 text-lg font-medium text-hobun">
        {t("entry.title")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("entry.body")}</p>
      <Link
        href="/integrated-report"
        className="mt-4 inline-flex min-h-11 items-center border border-hobun/60 px-4 text-sm text-hobun transition-colors hover:bg-hobun/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
      >
        {t("entry.cta")}
      </Link>
    </section>
  );
}
