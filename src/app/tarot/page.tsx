import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SpreadPicker } from "@/components/tarot/SpreadPicker";
import { Disclaimer, TierBadge } from "@/components/ui/Chrome";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { assetPath } from "@/lib/assets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tarot");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TarotPage() {
  const t = await getTranslations("tarot");

  return (
    <SceneShell tone="tarot">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">

      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <div className="no-print flex items-center gap-3">
          <LocaleSwitcher />
          <TierBadge tier="cultural" />
        </div>
      </header>

      <section className="py-10 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.48fr)] lg:gap-16">
          <div>
            <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("landingKicker")}</p>
            <h1 className="mt-5 max-w-[12ch] text-[clamp(2.2rem,7vw,4.3rem)] leading-[1.03] font-semibold tracking-[-0.055em]">
              {t("heroTitle1")}
              <br />
              {t("heroTitle2")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-hobun-dim">{t("heroBody")}</p>
          </div>

          <div className="tarot-hero-stage relative mx-auto aspect-[2/3] w-full max-w-[255px] overflow-hidden rounded-[1.5rem] border border-ink-600 bg-ink-850 shadow-[0_32px_80px_-35px_rgba(0,0,0,0.95)]">
            <MotionSafeImage
              src={assetPath("tarot/cards", "00")}
              alt={t("heroTitle1")}
              sizes="255px"
              priority
              className="object-cover"
              fallbackLabel={t("metaTitle")}
            />
            <span className="tarot-hero-seal" aria-hidden>
              LUMINA
            </span>
          </div>
        </div>
      </section>

      <section className="reading-panel rounded-[1.75rem] border border-ink-700 p-5 text-ink-900 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
        <h2 className="mb-8 flex items-baseline gap-3">
          <span className="font-mono text-[13px] text-ink-700/70">01</span>
          <span className="text-lg font-semibold tracking-tight">{t("sectionPick")}</span>
        </h2>
        <SpreadPicker />
      </section>

      <footer className="mt-16 border-t border-ink-700 pt-8">
        <Disclaimer />
      </footer>
      </main>
    </SceneShell>
  );
}
