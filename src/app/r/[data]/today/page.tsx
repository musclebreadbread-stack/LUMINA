import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { computeChart } from "@engine/astro";
import { branchAt, computeSaju } from "@engine/saju";
import { EvidenceTable } from "@/components/horoscope/EvidenceTable";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { SceneShell } from "@/components/ui/SceneShell";
import { computeDailyReading, type HoroscopeSystem } from "@engine/horoscope";
import { decodeProfile } from "@/lib/share";
import { assetPath } from "@/lib/assets";
import { toBirthInput } from "@/lib/profile";
import type { Locale } from "@/i18n/locale";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";

export const dynamic = "force-dynamic";

interface Params {
  readonly data: string;
}

function localToday(timeZone: string): string {
  return DateTime.now().setZone(timeZone).toISODate() ?? new Date().toISOString().slice(0, 10);
}

function signKeyForProfile(system: HoroscopeSystem, profile: ReturnType<typeof toBirthInput>): string {
  if (system === "zodiac") {
    const chart = computeChart(profile);
    return chart.bigThree.sun.en.toLowerCase();
  }

  const saju = computeSaju(profile);
  return branchAt(saju.pillars.year.branch).zodiacEn.toLowerCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { data } = await params;
  const profile = decodeProfile(data);
  const t = await getTranslations("horoscope");
  if (!profile) return { title: t("resultTitleSuffix"), robots: { index: false, follow: false } };

  return {
    title: t("resultTitleSuffix"),
    robots: { index: false, follow: false },
  };
}

export default async function PersonalTodayPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { data } = await params;
  const profile = decodeProfile(data);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("horoscope");
  const tNav = await getTranslations("nav");
  const tReading = await getTranslations("horoscopeReading");
  const tCommon = await getTranslations("common");

  if (!profile) {
    return (
      <SceneShell tone="horoscope">
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
        </header>
        <div className="py-24 text-center">
          <p className="text-sm text-hobun-dim">{t("brokenLink")}</p>
          <Link href="/" className="mt-6 inline-block bg-hobun px-6 py-3 text-sm text-ink-900">
            {t("otherSigns")}
          </Link>
        </div>
        </main>
      </SceneShell>
    );
  }

  const birthInput = toBirthInput(profile);
  const system: HoroscopeSystem = "zodiac";
  const signKey = signKeyForProfile(system, birthInput);
  const chart = computeChart(birthInput);
  const date = localToday(profile.timeZone);
  const reading = computeDailyReading(system, signKey, date, {
    personalized: true,
    timeZone: profile.timeZone,
    natalPositions: chart.planets.map((planet) => ({ key: planet.key, longitude: planet.longitude })),
  });
  const signName = locale === "en" ? reading.sign.en : reading.sign.ko;

  return (
    <SceneShell tone="horoscope">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <AnalysisResultTracker analysis="horoscope" />
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <nav className="no-print flex flex-wrap items-center gap-2">
          <Link href={`/r/${data}`} className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim">
            {tNav("saju")}
          </Link>
          <Link href={`/r/${data}/astro`} className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim">
            {tNav("astro")}
          </Link>
          <span className="inline-flex min-h-11 items-center border border-hobun bg-hobun px-3 text-[13px] text-ink-900">
            {t("resultTitleSuffix")}
          </span>
        </nav>
        <div className="no-print flex flex-wrap items-center justify-end gap-3">
          <LocaleSwitcher />
          <TierBadge tier={reading.tier} />
        </div>
      </header>

      <div className="py-10">
        <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.42fr)]">
          <div>
            <p className="font-mono text-[13px] text-hobun-faint">{date}</p>
            <h1 className="mt-3 text-[clamp(1.5rem,4.5vw,2rem)] leading-tight font-medium tracking-tight">
              {signName} · {tReading("personalizeTitle")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
              {profile.placeLabel} · {profile.timeZone}
            </p>
          </div>
          <div className="assessment-result-art relative mx-auto aspect-[2/3] w-full max-w-[190px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
            <MotionSafeImage
              src={assetPath("horoscope/zodiac", reading.sign.key)}
              alt={t("personalImageAlt", { sign: signName })}
              sizes="(min-width: 640px) 190px, 46vw"
              priority
              className="object-cover"
              fallbackLabel={signName}
            />
          </div>
        </div>
      </div>

      <Section index="01" title={t("sectionToday")}>
        <div className="space-y-6">
          <p className="text-base leading-relaxed text-hobun">{locale === "en" ? reading.lines.mood.en : reading.lines.mood.ko}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[13px] text-hobun-faint">{t("relationshipLabel")}</p>
              <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
                {locale === "en" ? reading.lines.relationship.en : reading.lines.relationship.ko}
              </p>
            </div>
            <div>
              <p className="font-mono text-[13px] text-hobun-faint">{t("workLabel")}</p>
              <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
                {locale === "en" ? reading.lines.work.en : reading.lines.work.ko}
              </p>
            </div>
          </div>
          <p className="border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-dim">
            {locale === "en" ? reading.lines.tip.en : reading.lines.tip.ko}
          </p>
        </div>
      </Section>

      <Section index="02" title={tReading("sectionEvidence")}>
        <EvidenceTable evidence={reading.evidence} lines={reading.lines} />
      </Section>

      <AdSlot slot="personal-today-mid" label={tCommon("adLabel")} />
      <ShareBar title={`${signName} · ${tReading("personalizeTitle")}`} restartHref="/horoscope" />

      <footer className="border-t border-ink-700 pt-8">
        <Disclaimer tier={reading.tier} />
      </footer>
      </main>
    </SceneShell>
  );
}
