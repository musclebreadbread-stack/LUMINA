import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { IntegratedReportClient } from "@/components/integratedPortrait/IntegratedReportClient";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SceneShell } from "@/components/ui/SceneShell";
import { IntegratedReportTracker } from "@/components/analytics/AnalysisTracker";

/**
 * 통합 자기초상 진입점.
 * 서버는 브라우저 보관함을 읽지 않고 제목·저장 경계·빈 상태 안내를 먼저 렌더한다.
 */
/**
 * 색인하지 않는다. 이 페이지의 내용은 방문자 브라우저 보관함에 있는 개인 결과라서
 * 크롤러에게는 빈 상태 안내만 보인다 — 검색 결과에 올릴 고유 콘텐츠가 아니다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("integratedPortrait");
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function IntegratedReportPage() {
  const t = await getTranslations("integratedPortrait");

  return (
    <SceneShell tone="neutral">
      <IntegratedReportTracker />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="no-print flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher />
            <span className="border border-ink-700 px-2 py-1 font-mono text-[11px] tracking-wide text-hobun-faint">
              {t("headerBadge")}
            </span>
          </div>
        </header>

        <section className="integrated-portrait-intro pt-12 pb-8 sm:pt-16" aria-labelledby="integrated-report-heading">
          <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("eyebrow")}</p>
          <h1 id="integrated-report-heading" className="mt-5 max-w-3xl text-[clamp(2.25rem,7vw,4.5rem)] leading-[1.04] font-medium tracking-[-0.045em] text-hobun">
            {t("title")}
          </h1>
          <p className="mt-3 font-mono text-sm tracking-[0.12em] text-hobun-faint">{t("englishTitle")}</p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-hobun-dim">{t("intro")}</p>
          <p className="mt-5 max-w-2xl border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">{t("localOnlyNotice")}</p>
        </section>

        <section
          className="integrated-portrait-ssr-state border-t border-ink-700 pt-8"
          data-testid="integrated-report-ssr-state"
          data-state="empty"
          aria-labelledby="integrated-report-ssr-heading"
        >
          <h2 id="integrated-report-ssr-heading" className="text-xl font-medium text-hobun">{t("states.emptyTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("states.emptyBody")}</p>
          <noscript>
            <p className="mt-4 text-xs leading-relaxed text-hobun-faint">{t("noscript")}</p>
          </noscript>
        </section>

        <IntegratedReportClient />
      </main>
    </SceneShell>
  );
}
