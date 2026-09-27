import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { SurveyForm } from "@/components/attachment/SurveyForm";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { AnalysisEntryTracker } from "@/components/analytics/AnalysisTracker";
import { ATTACHMENT_OVERVIEW_IMAGE, attachmentImagePath } from "@/lib/psychometricsAssets";

const ATTACHMENT_STYLES = ["secure", "anxious", "avoidant", "fearful"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("attachment");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AttachmentPage() {
  const t = await getTranslations("attachment");
  const evidence = analysisDefinition("attachment");

  return (
    <SceneShell tone="attachment">
      <AnalysisEntryTracker analysis="attachment" />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher />
            <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
          </div>
        </header>

        <div className="py-8 sm:py-12">
          {/* 히어로 섹션 */}
          <div className="mb-12 grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(210px,0.62fr)]">
            <div className="space-y-4 sm:text-left">
              <p className="font-mono text-sm text-hobun-dim tracking-wider">
                {t("kicker")}
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-hobun">
                {t("heroTitle")}
              </h1>
              <p className="text-lg text-hobun-dim max-w-2xl leading-relaxed">
                {t("heroDescription")}
              </p>
            </div>
            <div className="assessment-hero-art relative mx-auto aspect-[4/3] w-full max-w-[340px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
              <MotionSafeImage
                src={ATTACHMENT_OVERVIEW_IMAGE}
                alt={t("heroImageAlt")}
                sizes="(min-width: 640px) 340px, 82vw"
                priority
                className="object-cover"
                fallbackLabel={t("heroTitle")}
              />
            </div>
          </div>

          {/* 소개 카드 */}
          <div className="mb-8 border border-ink-700 rounded-xl p-6 bg-ink-900/50 space-y-4">
            <h2 className="text-xl font-semibold text-hobun">
              {t("aboutTitle")}
            </h2>
            <p className="text-base text-hobun-dim leading-relaxed">
              {t("aboutDescription")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="border border-ink-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-hobun mb-2">
                  {t("timeLabel")}
                </h3>
                <p className="text-2xl font-bold text-hobun">
                  {t("timeValue")}
                </p>
              </div>
              <div className="border border-ink-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-hobun mb-2">
                  {t("itemsLabel")}
                </h3>
                <p className="text-2xl font-bold text-hobun">
                  {t("itemsValue")}
                </p>
              </div>
            </div>
          </div>

          {/* 설문 폼 */}
          <section className="mb-10 rounded-[1.5rem] border border-ink-700 bg-ink-900/55 p-5 sm:p-8">
            <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">LUMINA / VISUAL GUIDE</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{t("visualGuideTitle")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("visualGuideBody")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {ATTACHMENT_STYLES.map((style) => {
                const label = t(`styles.${style}.label`);
                return (
                  <article key={style} className="assessment-gallery-card reveal overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-950/70">
                    <div className="assessment-art relative aspect-[4/3] overflow-hidden bg-ink-900">
                      <MotionSafeImage
                        src={attachmentImagePath(style)}
                        alt={t("styleImageAlt", { style: label })}
                        sizes="(min-width: 640px) 320px, 86vw"
                        className="object-cover"
                        fallbackLabel={label}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-base font-medium text-hobun">{label}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-hobun-dim">{t("visualGuideBody")}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <SurveyForm />

          {/* 각주 */}
          <div className="mt-8 text-sm text-hobun-dim space-y-2">
            <p>{t("footerNote1")}</p>
            <p>{t("footerNote2")}</p>
          </div>
          <div className="mt-8">
            <Disclaimer tier={evidence.tier} />
          </div>
        </div>
      </main>
    </SceneShell>
  );
}
