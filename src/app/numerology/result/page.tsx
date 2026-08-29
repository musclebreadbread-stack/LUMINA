import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { NumberPlate } from "@/components/numerology/NumberPlate";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { MethodNote } from "@/components/ui/MethodNote";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { buildNumerologyView, formatNumerologyDate } from "@/lib/numerologyModel";
import type { Locale } from "@/i18n/locale";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { toNumerologySnapshot } from "@/lib/integratedPortrait/adapters";

interface Query {
  readonly year?: string;
  readonly month?: string;
  readonly day?: string;
  readonly name?: string;
}

function parseDate(query: Query): { year: number; month: number; day: number } | null {
  const year = Number(query.year);
  const month = Number(query.month);
  const day = Number(query.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return { year, month, day };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const query = await searchParams;
  const date = parseDate(query);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("numerology");

  if (!date) return { title: t("pageTitle"), robots: { index: false } };

  try {
    const view = buildNumerologyView(date, query.name ?? null);
    const dateLabel = formatNumerologyDate(view.date, locale);
    const lifePathGloss = locale === "en" ? view.lifePath.meaning.glossEn : view.lifePath.meaning.gloss;
    const title = view.destiny
      ? `${t("lifePath")} ${view.lifePath.value} · ${t("destiny")} ${view.destiny.value}`
      : `${t("lifePath")} ${view.lifePath.value}`;
    return {
      robots: { index: false, follow: false },
      title,
      description: t("resultMetaDescription", { date: dateLabel, gloss: lifePathGloss }),
    };
  } catch {
    return { title: t("pageTitle"), robots: { index: false } };
  }
}

export default async function NumerologyResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const date = parseDate(query);
  const locale = (await getLocale()) as Locale;
  const [t, tCommon] = await Promise.all([
    getTranslations("numerology"),
    getTranslations("common"),
  ]);

  if (!date) {
    return <ErrorShell message={t("brokenLink")} restartLabel={t("restartCta")} />;
  }

  let view;
  try {
    view = buildNumerologyView(date, query.name?.trim() || null);
  } catch (error) {
    return (
      <ErrorShell
        message={
          error instanceof Error && error.name === "NumerologyInputError"
            ? t("invalidName")
            : t("cannotCompute")
        }
        detail={error instanceof Error ? error.message : undefined}
        restartLabel={t("restartCta")}
      />
    );
  }

  const dateLabel = formatNumerologyDate(view.date, locale);
  const integratedSnapshot = toNumerologySnapshot({
    locale,
    lifePath: view.lifePath.value,
    destinyPresent: view.destiny !== null,
  });

  return (
    <SceneShell tone="numerology">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="numerology" />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />
      <ReportHeader />

      <div className="py-8 sm:py-10">
        <ResultCover
          eyebrow={t("pageTitle")}
          title={dateLabel}
          summary={t("heroBody")}
          imageSrc={view.lifePath.imageSrc}
          imageAlt={`${t("lifePath")} ${view.lifePath.value}`}
          imageLabel={`${view.lifePath.value}`}
          tier="cultural"
        />
        {view.name && <p className="mt-3 font-mono text-[13px] text-hobun-faint">{view.name}</p>}
      </div>

      <Section
        index="01"
        title={t("sectionNumbers")}
        aside={view.destiny ? <>{t("asideBoth")}</> : <>{t("asideLifePathOnly")}</>}
      >
        <div className={`grid gap-5 ${view.destiny ? "sm:grid-cols-2" : "max-w-xs"}`}>
          <NumberPlate card={view.lifePath} order={0} />
          {view.destiny && <NumberPlate card={view.destiny} order={1} />}
        </div>

        {view.ignoredCharacters > 0 && (
          <p className="mt-6 text-xs leading-relaxed text-hobun-faint">
            {t("ignoredNote", { n: view.ignoredCharacters })}
          </p>
        )}
        {!view.destiny && (
          <p className="mt-6 text-xs leading-relaxed text-hobun-faint">
            {t("noDestinyNote")}{" "}
            <Link href="/numerology" className="underline underline-offset-4">
              {t("noDestinyCta")}
            </Link>
          </p>
        )}
      </Section>

      <div id="calculation-numerology-calculation-record" className="mt-8">
        <MethodNote locale={locale} title={tCommon("methodNote")} block={view.method} />
      </div>

      <IntegratedReportEntry />

      <AdSlot slot="numerology-mid" label={tCommon("adLabel")} />

      <footer className="space-y-8 border-t border-ink-700 pt-8">
        <ShareBar
          title={`${t("lifePath")} ${view.lifePath.value} · LUMINA ${t("pageTitle")}`}
          restartHref="/numerology"
          restartLabel={t("restartCta")}
        />
        <Disclaimer />
      </footer>
      </main>
    </SceneShell>
  );
}

function ErrorShell({
  message,
  detail,
  restartLabel,
}: {
  readonly message: string;
  readonly detail?: string;
  readonly restartLabel: string;
}) {
  return (
    <SceneShell tone="numerology">
      <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
      <ReportHeader />
      <div className="py-24 text-center">
        <p className="text-sm text-hobun-dim">{message}</p>
        {detail && <p className="mt-2 font-mono text-[13px] text-hobun-faint">{detail}</p>}
        <Link
          href="/numerology"
          className="mt-6 inline-block bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
        >
          {restartLabel}
        </Link>
      </div>
      </main>
    </SceneShell>
  );
}

function ReportHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
      <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
        LUMINA
      </Link>
      <div className="no-print flex items-center gap-3">
        <LocaleSwitcher />
        <TierBadge tier="cultural" />
      </div>
    </header>
  );
}
