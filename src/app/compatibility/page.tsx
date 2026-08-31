import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CompatibilityForm } from "@/components/synastry/CompatibilityForm";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer, TierBadge } from "@/components/ui/Chrome";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { COMPATIBILITY_OVERVIEW_IMAGE, compatibilityToneImagePath } from "@/lib/compatibilityAssets";
import { ResultSceneLayer } from "@/components/scene3d/ResultSceneLayer";

const COMPATIBILITY_TONES = ["supportive", "challenging", "mixed", "quiet"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compatibility");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function CompatibilityPage() {
  const t = await getTranslations("compatibility");
  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <div className="no-print flex items-center gap-3">
            <LocaleSwitcher />
            <TierBadge tier="cultural" />
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.62fr)]">
            <div className="space-y-4">
              <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{t("kicker")}</p>
              <h1 className="max-w-[18ch] text-[clamp(2rem,5vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-hobun">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-hobun-dim">{t("body")}</p>
            </div>
            <div className="assessment-hero-art relative mx-auto aspect-[4/3] w-full max-w-[360px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
              <MotionSafeImage
                src={COMPATIBILITY_OVERVIEW_IMAGE}
                alt={t("heroImageAlt")}
                sizes="(min-width: 640px) 360px, 86vw"
                priority
                className="object-cover"
                fallbackLabel={t("title")}
              />
              <ResultSceneLayer preset="relationship" />
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-[1.5rem] border border-ink-700 bg-ink-900/55 p-5 sm:p-8">
          <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">LUMINA / RELATIONSHIP MAP</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{t("visualGuideTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">{t("visualGuideBody")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMPATIBILITY_TONES.map((tone) => {
              const label = t(tone);
              return (
                <article key={tone} className="assessment-gallery-card reveal overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-950/70">
                  <div className="assessment-art relative aspect-[4/3] overflow-hidden bg-ink-900">
                    <MotionSafeImage
                      src={compatibilityToneImagePath(tone)}
                      alt={t("toneImageAlt", { tone: label })}
                      sizes="(min-width: 1024px) 210px, (min-width: 640px) 320px, 86vw"
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

        <section className="border-t border-ink-700 pt-8" aria-labelledby="compatibility-input-heading">
          <h2 id="compatibility-input-heading" className="mb-7 text-lg font-medium text-hobun">{t("sectionInput")}</h2>
          <CompatibilityForm />
        </section>

        <footer className="mt-14 border-t border-ink-700 pt-8">
          <Disclaimer tier="cultural" />
        </footer>
      </main>
    </SceneShell>
  );
}
