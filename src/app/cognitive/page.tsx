import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { DOMAINS } from "@engine/cognitive/items";
import { CognitivePilotStart } from "@/components/cognitive/CognitivePilotStart";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { COGNITIVE_OVERVIEW_IMAGE, cognitiveImagePath } from "@/lib/psychometricsAssets";
import type { Locale } from "@/i18n/locale";
import { ResultSceneLayer } from "@/components/scene3d/ResultSceneLayer";

const STANDARDIZED_ITEM_COUNT = 20;

/**
 * 인지능력 탐색 랜딩.
 *
 * metaTitle은 사람들이 실제로 검색하는 말("IQ 테스트")을 포함하되 그 자리에서 곧장 아니라고
 * 말한다 — 찾을 수는 있게 두되 제목부터 오해를 만들지 않기 위해서다. 화면 본문은 히어로 바로 아래,
 * 문항을 만나기 전에 이 검사가 무엇이고 무엇이 아닌지를 먼저 밝힌다.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cognitive");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CognitivePage() {
  const [t, locale] = await Promise.all([getTranslations("cognitive"), getLocale()]);
  const evidence = analysisDefinition("cognitive");

  return (
    <SceneShell tone="cognitive">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="no-print flex items-center gap-3">
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
                <Link
                  href="#standardized-pilot"
                  className="mt-6 inline-flex min-h-11 items-center border border-ink-950 px-5 py-3 text-sm font-medium text-ink-950 transition-colors hover:bg-ink-950 hover:text-hobun"
                >
                  {t("runStart")}
                </Link>
              </div>
              <div className="assessment-hero-art relative mx-auto aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
                <MotionSafeImage
                  src={COGNITIVE_OVERVIEW_IMAGE}
                  alt={t("heroImageAlt")}
                  sizes="(min-width: 640px) 360px, 82vw"
                  priority
                  className="object-cover"
                  fallbackLabel={t("heroTitle")}
                />
                <ResultSceneLayer preset="evidence" />
              </div>
            </div>
          </div>
        </section>

        {/* 문항을 만나기 전에 읽어야 하는 것 — 그래서 폼보다 위, 갤러리보다 위에 둔다. */}
        <section className="mb-10 rounded-[1.5rem] border border-ink-700 bg-ink-950/75 p-5 sm:p-8">
          <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">LUMINA / WHAT THIS IS</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{t("notAnIqTitle")}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("notAnIqBody")}</p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("estimateNotice")}</p>
          <p className="mt-4 max-w-2xl border-l border-ink-600 pl-3 text-xs leading-relaxed text-hobun-faint">
            {t("provenanceBody")}
          </p>
          <p className="tabular mt-4 font-mono text-[13px] text-hobun-faint">
            {t("itemCountLabel", { n: STANDARDIZED_ITEM_COUNT })}
            <span className="mx-2 text-ink-600">·</span>
            {t("durationLabel", { minutes: evidence.durationMinutes })}
          </p>
        </section>

        <section className="mb-10 rounded-[1.5rem] border border-ink-700 bg-ink-950/75 p-5 sm:p-8">
          <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">LUMINA / PRACTICE FORMATS</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{t("formatsTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("formatsBody")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAINS.map((domain) => {
              const label = t(`domains.${domain}.label`);
              return (
                <article
                  key={domain}
                  className="assessment-gallery-card reveal overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900/75"
                >
                  <div className="assessment-art relative aspect-[4/3] overflow-hidden bg-ink-900">
                    <MotionSafeImage
                      src={cognitiveImagePath(domain)}
                      alt={t("domainImageAlt", { domain: label })}
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 44vw, 86vw"
                      className="object-cover"
                      fallbackLabel={label}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-medium text-hobun">{label}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-hobun-dim">{t(`domains.${domain}.blurb`)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="standardized-pilot" className="scroll-mt-6 rounded-[1.5rem] border border-ink-700 bg-ink-950/90 p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] sm:p-8">
          <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{t("standardizedKicker")}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{t("standardizedTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("standardizedBody")}</p>
          <p className="mt-4 max-w-2xl border-l border-hobun pl-3 text-sm leading-relaxed text-hobun">{t("pilotNotice")}</p>
          <div className="mt-6">
            <CognitivePilotStart
              locale={locale as Locale}
              labels={{
                setupRequired: t("setupRequired"),
                starting: t("runStart"),
                ineligible: t("deviceUnsupported"),
              }}
            />
          </div>
          <Link href="/cognitive/practice" className="mt-6 inline-block min-h-11 border border-hobun px-5 py-3 text-sm text-hobun transition-colors hover:bg-hobun hover:text-ink-900">
            {t("practiceLink")}
          </Link>
        </section>

        <footer className="mt-16 border-t border-ink-700 pt-8">
          <Disclaimer tier="scientific" />
        </footer>
      </main>
    </SceneShell>
  );
}
