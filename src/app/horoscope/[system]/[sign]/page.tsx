import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { TodaySync } from "@/components/horoscope/TodaySync";
import { ElementAffinity } from "@/components/horoscope/ElementAffinity";
import { EvidenceTable } from "@/components/horoscope/EvidenceTable";
import { PersonalizeCta } from "@/components/horoscope/PersonalizeCta";
import { ReadingNotes } from "@/components/horoscope/ReadingNotes";
import { ShareBar } from "@/components/report/ShareBar";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { buildHoroscopeView, formatHoroscopeDate, isDateString, utcToday } from "@/lib/horoscopeModel";
import { buildAlternates } from "@/lib/seoAlternates";
import type { Locale } from "@/i18n/locale";
import type { HoroscopeSystem } from "@engine/horoscope";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";

/** 요청마다 새로 계산한다 — 방문자의 로컬 날짜가 매번 다를 수 있기 때문이다. */
export const dynamic = "force-dynamic";

interface Params {
  readonly system: string;
  readonly sign: string;
}
interface Query {
  readonly d?: string;
}

function isSystem(value: string): value is HoroscopeSystem {
  return value === "zodiac" || value === "chinese";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { system, sign } = await params;
  const { d } = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("horoscope");
  if (!isSystem(system)) return { title: t("resultTitleSuffix") };

  try {
    const view = buildHoroscopeView(system, sign, isDateString(d) ? d : utcToday());
    const signName = locale === "en" ? view.sign.en : view.sign.ko;
    return {
      // 날짜 쿼리(?d=)가 붙어도 대표 URL은 하나로 모은다. 헬퍼가 쿼리를 떼고
      // 두 언어의 hreflang까지 함께 만들어 준다.
      alternates: await buildAlternates(`/horoscope/${system}/${sign}`),
      title: `${signName} ${t("resultTitleSuffix")}`,
      description: locale === "en" ? view.mood.en : view.mood.ko,
    };
  } catch {
    return { title: t("resultTitleSuffix") };
  }
}

export default async function HoroscopeResultPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const { system, sign } = await params;
  const { d } = await searchParams;
  if (!isSystem(system)) notFound();

  const locale = (await getLocale()) as Locale;
  const [t, tReading, tCommon, tNav] = await Promise.all([
    getTranslations("horoscope"),
    getTranslations("horoscopeReading"),
    getTranslations("common"),
    getTranslations("nav"),
  ]);
  const serverDate = isDateString(d) ? d : utcToday();

  let view;
  try {
    view = buildHoroscopeView(system, sign, serverDate);
  } catch {
    notFound();
  }

  const signName = locale === "en" ? view.sign.en : view.sign.ko;
  const systemLabel = t(system === "zodiac" ? "systemZodiac" : "systemChinese");
  const dateLabel = formatHoroscopeDate(serverDate, locale);
  const mood = locale === "en" ? view.mood.en : view.mood.ko;
  const relationship = locale === "en" ? view.relationship.en : view.relationship.ko;
  const work = locale === "en" ? view.work.en : view.work.ko;
  const tip = locale === "en" ? view.tip.en : view.tip.ko;

  return (
    <SceneShell tone="horoscope">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="horoscope" />
        <AnalysisResultTracker analysis="horoscope" />
      <TodaySync serverDate={serverDate} />
      <Breadcrumbs
        label={tNav("breadcrumb")}
        items={[
          { href: "/", label: "LUMINA" },
          { href: "/horoscope", label: systemLabel },
          { label: signName },
        ]}
      />

      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
        <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
          LUMINA
        </Link>
        <div className="no-print flex flex-wrap items-center justify-end gap-3">
          <LocaleSwitcher />
          <TierBadge tier={view.tier} />
        </div>
      </header>

      <div className="py-8 sm:py-10">
        <ResultCover
          eyebrow={`${dateLabel} · ${systemLabel}`}
          title={`${view.sign.symbol} ${signName}`}
          summary={mood}
          imageSrc={view.imageSrc ?? undefined}
          imageAlt={signName}
          imageLabel={signName}
          tier={view.tier}
        />
      </div>

      <Section index="01" title={t("sectionToday")}>
        <div className="space-y-6">
          <p className="text-base leading-relaxed text-hobun">{mood}</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[13px] text-hobun-faint">{t("relationshipLabel")}</p>
              <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{relationship}</p>
            </div>
            <div>
              <p className="font-mono text-[13px] text-hobun-faint">{t("workLabel")}</p>
              <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{work}</p>
            </div>
          </div>

          <p className="border-l border-ink-600 pl-4 text-sm leading-relaxed text-hobun-dim">
            {tip}
          </p>
        </div>
      </Section>

      <ElementAffinity dayElement={view.dayElement} />

      <Section index="02" title={tReading("sectionEvidence")}>
        <EvidenceTable evidence={view.evidence} lines={view.reading.lines} />
        <ReadingNotes notes={view.reading.notes} />
      </Section>

      <div className="mb-10">
        <PersonalizeCta />
      </div>

      <AdSlot slot="horoscope-mid" label={tCommon("adLabel")} />

      <footer className="space-y-8 border-t border-ink-700 pt-8">
        <ShareBar
          title={`${signName} ${t("resultTitleSuffix")} · LUMINA`}
          restartHref="/horoscope"
          restartLabel={t("otherSigns")}
        />
        <Disclaimer tier={view.tier} />
      </footer>
      </main>
    </SceneShell>
  );
}
