import type { Metadata } from "next";
import Link from "next/link";
import { DateTime } from "luxon";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { buildAstroView } from "@/lib/astroModel";
import { buildHoroscopeView } from "@/lib/horoscopeModel";
import { buildNumerologyView } from "@/lib/numerologyModel";
import { buildReportView, formatBirthLabel } from "@/lib/reportModel";
import { decodeProfile } from "@/lib/share";
import { placeDisplayLabel, type StoredProfile } from "@/lib/profile";
import { DAILY_READING_TIER } from "@engine/horoscope";
import type { Locale } from "@/i18n/locale";
import { IntegratedReportTracker } from "@/components/analytics/AnalysisTracker";

export const dynamic = "force-dynamic";

interface Params {
  readonly data: string;
}

async function buildViews(profile: StoredProfile, referenceDate: Date) {
  const [saju, astro] = await Promise.all([
    Promise.resolve(buildReportView(profile, referenceDate)),
    Promise.resolve(buildAstroView(profile, referenceDate)),
  ]);
  const numerology =
    profile.calendar === "solar"
      ? buildNumerologyView(
          { year: profile.year, month: profile.month, day: profile.day },
          null,
        )
      : null;
  const zodiacKey = astro.planets.find((planet) => planet.key === "sun")?.signEn.toLowerCase();
  const date = DateTime.now().setZone(profile.timeZone).toISODate();
  const horoscope = zodiacKey && date
    ? buildHoroscopeView("zodiac", zodiacKey, date, { timeZone: profile.timeZone })
    : null;

  return { saju, astro, numerology, horoscope };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { data } = await params;
  const profile = decodeProfile(data);
  const t = await getTranslations("nav");
  if (!profile) return { title: t("saju"), robots: { index: false, follow: false } };
  return { title: `${t("saju")} · LUMINA`, robots: { index: false, follow: false } };
}

export default async function AllReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { data } = await params;
  const profile = decodeProfile(data);
  const locale = (await getLocale()) as Locale;
  const tNav = await getTranslations("nav");
  const tSaju = await getTranslations("saju");
  const tAstro = await getTranslations("astro");
  const tNumerology = await getTranslations("numerology");
  const tPsychometrics = await getTranslations("psychometrics");
  const tHoroscope = await getTranslations("horoscope");
  const tCommon = await getTranslations("common");

  if (!profile) {
    return (
      <SceneShell>
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
        </header>
        <div className="py-24 text-center">
          <p className="text-sm text-hobun-dim">{tNav("saju")}</p>
          <Link href="/" className="mt-6 inline-block bg-hobun px-6 py-3 text-sm text-ink-900">
            {tNav("saju")}
          </Link>
        </div>
        </main>
      </SceneShell>
    );
  }

  const { saju, astro, numerology, horoscope } = await buildViews(profile, new Date());
  const birthLabel = formatBirthLabel(saju.birthLocalISO, saju.precision.timeUnknown, locale);
  const dayMaster = locale === "en" ? saju.dayMaster.en : saju.dayMaster.ko;
  const sun = locale === "en" ? astro.bigThree.sun.en : astro.bigThree.sun.ko;
  const moon = locale === "en" ? astro.bigThree.moon.en : astro.bigThree.moon.ko;
  const lifePath = numerology?.lifePath ?? null;
  const yearPillar = saju.pillars.find((pillar) => pillar.key === "year");
  const characterName = locale === "en" ? saju.character.def.nameEn : saju.character.def.name;
  const characterTagline = locale === "en" ? saju.character.def.taglineEn : saju.character.def.tagline;

  return (
    <SceneShell tone="saju">
      <IntegratedReportTracker />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <div className="no-print flex flex-wrap items-center justify-end gap-3">
          <LocaleSwitcher />
          <TierBadge tier="cultural" />
        </div>
      </header>

      <div className="py-10">
        <ResultCover
          eyebrow={birthLabel}
          title={characterName}
          summary={characterTagline}
          imageSrc={yearPillar?.zodiacImageSrc}
          imageAlt={characterName}
          imageLabel={characterName}
          tier="cultural"
        />
        <p className="mt-3 font-mono text-[13px] text-hobun-faint">
          {tNav("saju")} · {tNav("astro")} · {tNumerology("pageTitle")} · {tHoroscope("resultTitleSuffix")}
        </p>
        <p className="mt-3 text-sm text-hobun-dim">{placeDisplayLabel(profile.placeLabel, profile.placeLabelEn, locale)}</p>
      </div>

      <Section index="01" title={tNav("saju")} aside={<TierBadge tier="cultural" />}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="border border-ink-700 p-5">
            <p className="font-mono text-[13px] text-hobun-faint">{tSaju("spiritLabel")}</p>
            <p className="mt-3 font-hanja text-3xl text-hobun">{saju.dayMaster.hanja}</p>
            <p className="mt-2 text-sm text-hobun-dim">{dayMaster}</p>
          </div>
          <div className="border border-ink-700 p-5">
            <p className="font-mono text-[13px] text-hobun-faint">{tSaju("sectionElements")}</p>
            <p className="mt-3 text-sm text-hobun-dim">{saju.elements.missing.length}</p>
          </div>
        </div>
        <Link href={`/r/${data}`} className="mt-5 inline-block text-xs text-hobun underline underline-offset-4">
          {tSaju("resultTitleSuffix")}
        </Link>
      </Section>

      <Section index="02" title={tNav("astro")} aside={<TierBadge tier="cultural" />}>
        <div className="grid gap-px border border-ink-700 bg-ink-700 sm:grid-cols-3">
          <div className="bg-ink-850/70 p-5">
            <p className="font-mono text-[13px] text-hobun-faint">{tAstro("sun")}</p>
            <p className="mt-2 text-lg text-hobun">{sun}</p>
          </div>
          <div className="bg-ink-850/70 p-5">
            <p className="font-mono text-[13px] text-hobun-faint">{tAstro("moon")}</p>
            <p className="mt-2 text-lg text-hobun">{moon}</p>
          </div>
          <div className="bg-ink-850/70 p-5">
            <p className="font-mono text-[13px] text-hobun-faint">{tAstro("rising")}</p>
            <p className="mt-2 text-lg text-hobun">
              {astro.bigThree.rising
                ? locale === "en"
                  ? astro.bigThree.rising.en
                  : astro.bigThree.rising.ko
                : "—"}
            </p>
          </div>
        </div>
        <Link href={`/r/${data}/astro`} className="mt-5 inline-block text-xs text-hobun underline underline-offset-4">
          {tAstro("navLabel")}
        </Link>
      </Section>

      <Section index="03" title={tNumerology("pageTitle")} aside={<TierBadge tier="cultural" />}>
        {lifePath ? (
          <div className="border border-ink-700 p-5">
            <p className="font-mono text-[13px] text-hobun-faint">{tNumerology("lifePath")}</p>
            <p className="mt-3 text-3xl font-medium text-hobun">{lifePath.value}</p>
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
              {locale === "en" ? lifePath.meaning.en : lifePath.meaning.ko}
            </p>
          </div>
        ) : (
          <p className="border border-ink-700 p-5 text-sm leading-relaxed text-hobun-dim">
            {tNumerology("solarOnlyNote")}
          </p>
        )}
        <Link href="/psychometrics" className="mt-5 inline-block text-xs text-hobun underline underline-offset-4">
          {tPsychometrics("metaTitle")}
        </Link>
      </Section>

      <Section index="04" title={tHoroscope("resultTitleSuffix")} aside={<TierBadge tier={horoscope?.tier ?? DAILY_READING_TIER} />}>
        {horoscope ? (
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[13px] text-hobun-faint">{horoscope.reading.date}</p>
              <p className="mt-2 text-lg text-hobun">
                {locale === "en" ? horoscope.sign.en : horoscope.sign.ko}
              </p>
            </div>
            <p className="text-base leading-relaxed text-hobun">{locale === "en" ? horoscope.mood.en : horoscope.mood.ko}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[13px] text-hobun-faint">{tHoroscope("relationshipLabel")}</p>
                <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
                  {locale === "en" ? horoscope.relationship.en : horoscope.relationship.ko}
                </p>
              </div>
              <div>
                <p className="font-mono text-[13px] text-hobun-faint">{tHoroscope("workLabel")}</p>
                <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
                  {locale === "en" ? horoscope.work.en : horoscope.work.ko}
                </p>
              </div>
            </div>
            <p className="border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-dim">
              {locale === "en" ? horoscope.tip.en : horoscope.tip.ko}
            </p>
            <Link href="/horoscope" className="inline-block text-xs text-hobun underline underline-offset-4">
              {tHoroscope("otherSigns")}
            </Link>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-hobun-dim">{tHoroscope("cannotCompute")}</p>
        )}
      </Section>

      <footer className="space-y-6 border-t border-ink-700 pt-8">
        <AdSlot slot="all-bottom" label={tCommon("adLabel")} />
        <ShareBar title={`${birthLabel} · LUMINA`} />
        <p className="text-xs leading-relaxed text-hobun-faint">{tSaju("calcNote")}</p>
        <Disclaimer tier="cultural" />
      </footer>
      </main>
    </SceneShell>
  );
}
