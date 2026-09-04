import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FACTORS } from "@engine/eq/items";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SurveyForm } from "@/components/eq/SurveyForm";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { AnalysisEntryTracker } from "@/components/analytics/AnalysisTracker";
import { EQ_OVERVIEW_IMAGE, eqImagePath } from "@/lib/psychometricsAssets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("eq");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function EqPage() {
  const t = await getTranslations("eq");
  const evidence = analysisDefinition("eq");

  return (
    <SceneShell tone="eq">
      <AnalysisEntryTracker analysis="eq" />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="no-print flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher />
            <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <div className="reading-panel overflow-hidden rounded-[1.75rem] border border-ink-700 p-5 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
            <div className="relative z-10 grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.58fr)]">
              <div>
                <p className="font-mono text-[13px] tracking-wide text-ink-700/75">{t("kicker")}</p>
                <h1 className="mt-5 max-w-[18ch] text-[clamp(1.9rem,5.5vw,3.4rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-ink-950">
                  {t("heroTitle")}
                </h1>
                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-800/85">{t("heroBody")}</p>
                <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-ink-700/80">{t("selfReportNotice")}</p>
              </div>
              <div className="assessment-hero-art relative mx-auto aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
                <MotionSafeImage
                  src={EQ_OVERVIEW_IMAGE}
                  alt={t("heroImageAlt")}
                  sizes="(min-width: 640px) 360px, 82vw"
                  priority
                  className="object-cover"
                  fallbackLabel={t("heroTitle")}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-[1.5rem] border border-ink-700 bg-ink-950/75 p-5 sm:p-8">
          <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">LUMINA / VISUAL GUIDE</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{t("visualGuideTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("visualGuideBody")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FACTORS.map((factor) => {
              const label = t(`factors.${factor}.label`);
              return (
                <article key={factor} className="assessment-gallery-card reveal overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900/75">
                  <div className="assessment-art relative aspect-[4/3] overflow-hidden bg-ink-900">
                    <MotionSafeImage
                      src={eqImagePath(factor)}
                      alt={t("factorImageAlt", { factor: label })}
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 44vw, 86vw"
                      className="object-cover"
                      fallbackLabel={label}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-medium text-hobun">{label}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-hobun-dim">{t(`factors.${factor}.blurb`)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-ink-700 bg-ink-950/90 p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] sm:p-8">
          <SurveyForm />
          <p className="mt-6 text-xs leading-relaxed text-hobun-faint">{t("reliabilityNote")}</p>
        </section>

        <footer className="mt-16 border-t border-ink-700 pt-8">
          <Disclaimer tier="scientific" />
        </footer>
      </main>
    </SceneShell>
  );
}
