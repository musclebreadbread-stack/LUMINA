import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019 } from "@engine/psychometrics/citations";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { MethodNote } from "@/components/ui/MethodNote";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { AnalysisEntryTracker } from "@/components/analytics/AnalysisTracker";
import { JungianLandingActions } from "@/components/psychometrics/JungianLandingActions";
import { assetPath } from "@/lib/assets";
import type { Locale } from "@/i18n/locale";
import { analysisDefinition } from "@/lib/analysisCatalog";

const AXES = ["EI", "SN", "TF", "JP", "AT", "VW"] as const;
const AXIS_IMAGE_POLES = {
  EI: "e",
  SN: "n",
  TF: "f",
  JP: "p",
  AT: "a",
  VW: "v",
} as const;
const BENEFIT_KEYS = ["selfUnderstanding", "relationships", "work"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("jungian");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function JungianTypesPage() {
  const [t, locale] = await Promise.all([getTranslations("jungian"), getLocale()]);
  const resolvedLocale = locale as Locale;
  const evidence = analysisDefinition("jungian");
  const evidenceStatusOverride = t("evidenceStatusOverride");

  return (
    <SceneShell tone="psychometrics">
      <AnalysisEntryTracker analysis="jungian" />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <div className="no-print flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher />
            <EvidenceStatusBadge status={evidence.evidence.validationStatus} derivedOverride={evidenceStatusOverride} />
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <div className="reading-panel overflow-hidden rounded-[1.75rem] border border-ink-700 p-5 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
            <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.5fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-mono text-[13px] tracking-wide text-ink-700/75">{t("kicker")}</p>
                  <EvidenceStatusBadge status={evidence.evidence.validationStatus} tone="light" derivedOverride={evidenceStatusOverride} />
                </div>
                <h1 className="mt-5 max-w-[18ch] text-[clamp(2rem,5.5vw,3.7rem)] leading-[1.04] font-semibold tracking-[-0.05em] text-ink-950">
                  {t("heroTitle")}
                </h1>
                <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-800/85">{t("heroBody")}</p>
                <div className="mt-7">
                  <JungianLandingActions />
                </div>
              </div>
              <div className="result-cover-art relative mx-auto aspect-[3/2] w-full max-w-[300px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
                <MotionSafeImage
                  src={assetPath("psychometrics/types/axes", "ei-e")}
                  alt=""
                  sizes="(min-width: 640px) 300px, 86vw"
                  priority
                  className="object-cover"
                  fallbackLabel="E / I"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-ink-700 pt-10" aria-labelledby="benefits-heading">
          <h2 id="benefits-heading" className="sr-only">{t("benefitsTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {BENEFIT_KEYS.map((key) => (
              <article key={key} className="rounded-[1.1rem] border border-ink-700 bg-ink-950/60 p-5">
                <h3 className="text-base font-semibold text-hobun">{t(`benefits.${key}.title`)}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-hobun-dim">{t(`benefits.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-ink-700 pt-10" aria-labelledby="four-axes-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] tracking-[0.16em] text-hobun-faint">{t("axesKicker")}</p>
              <h2 id="four-axes-heading" className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-medium tracking-tight">{t("axesTitle")}</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-hobun-dim">{t("axesBody")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AXES.map((axis) => (
              <article key={axis} className="jungian-axis-card group overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-950/70">
                <div className="relative aspect-[3/2] overflow-hidden border-b border-ink-700">
                  <MotionSafeImage
                    src={assetPath("psychometrics/types/axes", `${axis.toLowerCase()}-${AXIS_IMAGE_POLES[axis]}`)}
                    alt=""
                    sizes="(min-width: 640px) 44vw, 92vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    fallbackLabel={axis}
                  />
                </div>
                <div className="p-5">
                  <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{axis}</p>
                  <h3 className="mt-2 text-xl font-semibold text-hobun">{t(`jungianAxes.${axis}.label`)}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t(`jungianAxes.${axis}.description`)}</p>
                  <div className="mt-5 flex items-center justify-between gap-3 font-mono text-[12px] text-hobun-faint">
                    <span>{t(`jungianAxes.${axis}.negative`)}</span>
                    <span aria-hidden>—</span>
                    <span>{t(`jungianAxes.${axis}.positive`)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 border-t border-ink-700 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)]">
          <div>
            <p className="font-mono text-[13px] tracking-[0.16em] text-hobun-faint">{t("methodKicker")}</p>
            <h2 className="mt-3 text-[clamp(1.6rem,4vw,2.4rem)] font-medium tracking-tight">{t("methodTitle")}</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("methodBody")}</p>
            <div className="mt-6">
              <p className="font-mono text-[12px] tracking-[0.16em] text-hobun-faint">{t("methodStepsTitle")}</p>
              <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                {(["answer", "map", "reflect"] as const).map((step, index) => (
                  <li key={step} className="rounded-[1.1rem] border border-ink-700 bg-ink-950/60 p-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-ink-600">
                    <span className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 text-sm font-semibold text-hobun">{t(`methodSteps.${step}.title`)}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-hobun-dim">{t(`methodSteps.${step}.body`)}</p>
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-5 border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-faint">{t("trademarkNotice")}</p>
          </div>
          <MethodNote
            locale={resolvedLocale}
            title={t("sourcesTitle")}
            method={{ ko: t("sourceMethod"), en: t("sourceMethod") }}
            citations={[MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019]}
          />
        </section>

        <footer className="mt-12 space-y-6 border-t border-ink-700 pt-8">
          <Disclaimer tier="scientific" />
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-hobun-faint">
            <Link href="/psychometrics" className="underline underline-offset-4 hover:text-hobun">{t("openBigFive")}</Link>
            <Link href="/methodology" className="underline underline-offset-4 hover:text-hobun">{t("openMethodology")}</Link>
            <Link href="/" className="underline underline-offset-4 hover:text-hobun">{t("backHome")}</Link>
          </p>
        </footer>
      </main>
    </SceneShell>
  );
}
