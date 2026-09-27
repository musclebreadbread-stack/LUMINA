import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SignPicker } from "@/components/horoscope/SignPicker";
import { PersonalizeCta } from "@/components/horoscope/PersonalizeCta";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { Disclaimer, TierBadge } from "@/components/ui/Chrome";
import { SceneShell } from "@/components/ui/SceneShell";
import { AnalysisEntryTracker } from "@/components/analytics/AnalysisTracker";
import { HOROSCOPE_OVERVIEW_IMAGE } from "@/lib/horoscopeAssets";
import { DAILY_READING_TIER } from "@engine/horoscope";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("horoscope");
  return {
    title: t("resultTitleSuffix"),
    description: t("metaDescription"),
  };
}

export default async function HoroscopePage() {
  const t = await getTranslations("horoscope");

  return (
    <SceneShell tone="horoscope">
      <AnalysisEntryTracker analysis="horoscope" />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">

      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <div className="no-print flex flex-wrap items-center justify-end gap-3">
          <LocaleSwitcher />
          <TierBadge tier={DAILY_READING_TIER} />
        </div>
      </header>

      <section className="py-10 sm:py-14">
        <div className="reading-panel overflow-hidden rounded-[1.75rem] border border-ink-700 p-5 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
          <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.42fr)]">
            <div>
              <p className="font-mono text-[13px] tracking-wide text-ink-700/75">{t("kicker")}</p>
              <h1 className="mt-5 max-w-[18ch] text-[clamp(1.9rem,5.5vw,3.4rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-ink-950">
                {t("heroTitle1")}
                <br />
                {t("heroTitle2")}
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-800/85">{t("heroBody")}</p>
            </div>
            <div className="result-cover-art relative mx-auto aspect-[2/3] w-full max-w-[190px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
              <MotionSafeImage
                src={HOROSCOPE_OVERVIEW_IMAGE}
                alt={t("heroImageAlt")}
                sizes="(min-width: 640px) 190px, 46vw"
                priority
                className="object-cover"
                fallbackLabel={t("resultTitleSuffix")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-ink-700 bg-ink-900/68 p-5 pt-8 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.95)] sm:p-8">
        <h2 className="mb-8 flex items-baseline gap-3">
          <span className="font-mono text-[13px] text-hobun-faint">01</span>
          <span className="text-base font-medium tracking-tight">{t("sectionPick")}</span>
        </h2>
        <SignPicker />
      </section>

      <section className="mt-10 border-t border-ink-700 pt-10">
        <PersonalizeCta />
      </section>

      <footer className="mt-16 border-t border-ink-700 pt-8">
        <Disclaimer tier={DAILY_READING_TIER} />
      </footer>
      </main>
    </SceneShell>
  );
}
