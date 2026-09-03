import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { ChartWheel } from "@/components/astro/ChartWheel";
import { PlacementGuide } from "@/components/astro/PlacementGuide";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { DataRow, Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { MethodNote } from "@/components/ui/MethodNote";
import { OverflowFade } from "@/components/ui/OverflowFade";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { Tilt } from "@/components/ui/Tilt";
import { buildAstroView, formatPlanetPosition, type AstroNote } from "@/lib/astroModel";
import { ASTRO_OVERVIEW_IMAGE } from "@/lib/astroAssets";
import { formatBirthLabel } from "@/lib/reportModel";
import { placeDisplayLabel } from "@/lib/profile";
import { decodeProfile } from "@/lib/share";
import type { Locale } from "@/i18n/locale";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";
import type { HouseSystem, Modality, ZodiacElement } from "@engine/astro";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { toAstroSnapshot, type AstroSnapshotNote } from "@/lib/integratedPortrait/adapters";

interface Query {
  readonly houses?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ data: string }>;
}): Promise<Metadata> {
  const { data } = await params;
  const profile = decodeProfile(data);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("astro");

  if (!profile) return { title: t("navLabel"), robots: { index: false } };

  const view = buildAstroView(profile, new Date());
  const sunSign = locale === "en" ? view.bigThree.sun.en : view.bigThree.sun.ko;
  const moonSign = locale === "en" ? view.bigThree.moon.en : view.bigThree.moon.ko;
  const risingSign = view.bigThree.rising
    ? locale === "en"
      ? view.bigThree.rising.en
      : view.bigThree.rising.ko
    : null;
  const risingPart = risingSign ? ` · ${t("rising")} ${risingSign}` : "";
  const birthLabel = formatBirthLabel(view.birthLocalISO, view.timeUnknown, locale);

  return {
    robots: { index: false, follow: false },
    title: `${t("sun")} ${sunSign} · ${t("moon")} ${moonSign}${risingPart}`,
    description: t("metaDescription", { birthLabel }),
  };
}

const ELEMENT_LABEL_KEY: Record<ZodiacElement, string> = {
  fire: "elementFire",
  earth: "elementEarth",
  air: "elementAir",
  water: "elementWater",
};
const MODALITY_LABEL_KEY: Record<Modality, string> = {
  cardinal: "modalityCardinal",
  fixed: "modalityFixed",
  mutable: "modalityMutable",
};

function noteText(note: AstroNote, t: Awaited<ReturnType<typeof getTranslations<"astro">>>): string {
  switch (note.key) {
    case "timeUnknown":
      return t("noteTimeUnknown");
    case "moonSignAmbiguous":
      return t("noteMoonSignAmbiguous");
    case "polarLatitude":
      return t("notePolarLatitude");
    case "dst":
      return t("noteDst");
    case "houseSystem":
      return t("noteHouseSystem");
    case "houseFallback":
      return t("noteHouseFallback");
  }
}

function parseHouseSystem(value: string | undefined): HouseSystem {
  return value === "equal" || value === "placidus" ? value : "whole";
}

export default async function AstroPage({
  params,
  searchParams,
}: {
  params: Promise<{ data: string }>;
  searchParams: Promise<Query>;
}) {
  const { data } = await params;
  const { houses } = await searchParams;
  const selectedHouseSystem = parseHouseSystem(houses);
  const profile = decodeProfile(data);
  const locale = (await getLocale()) as Locale;
  const [t, tCommon] = await Promise.all([getTranslations("astro"), getTranslations("common")]);

  if (!profile) {
    return (
      <SceneShell>
        <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <ReportHeader data={data} />
          <div className="py-24 text-center">
            <p className="text-sm text-hobun-dim">{t("brokenLink")}</p>
            <Link
              href="/"
              className="mt-6 inline-block bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
            >
              {t("restartCta")}
            </Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  const view = buildAstroView(profile, new Date(), selectedHouseSystem);
  const birthLabel = formatBirthLabel(view.birthLocalISO, view.timeUnknown, locale);
  const integratedSnapshot = toAstroSnapshot({
    locale,
    sunSignIndex: view.bigThree.sun.signIndex,
    moonSignIndex: view.bigThree.moon.signIndex,
    risingSignIndex: view.bigThree.rising?.signIndex ?? null,
    notes: view.notes.flatMap((note): readonly AstroSnapshotNote[] =>
      note.key === "timeUnknown" || note.key === "moonSignAmbiguous" || note.key === "houseFallback"
        ? [note.key]
        : [],
    ),
  });

  const bigThree: readonly {
    readonly label: string;
    readonly ko: string;
    readonly en: string;
    readonly symbol: string;
    readonly gloss: string;
  }[] = [
    {
      label: t("sun"),
      ko: view.bigThree.sun.ko,
      en: view.bigThree.sun.en,
      symbol: view.bigThree.sun.symbol,
      gloss: t("sunGloss"),
    },
    {
      label: t("moon"),
      ko: view.bigThree.moon.ko,
      en: view.bigThree.moon.en,
      symbol: view.bigThree.moon.symbol,
      gloss: t("moonGloss"),
    },
    view.bigThree.rising
      ? {
          label: t("rising"),
          ko: view.bigThree.rising.ko,
          en: view.bigThree.rising.en,
          symbol: view.bigThree.rising.symbol,
          gloss: t("risingGloss"),
        }
      : { label: t("rising"), ko: "—", en: "—", symbol: "", gloss: t("risingMissing") },
  ];

  return (
    <SceneShell>
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="astro" />
        <AnalysisResultTracker analysis="astro" />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />
        <ReportHeader data={data} />

      <div className="py-10">
        <ResultCover
          eyebrow={t("navLabel")}
          title={birthLabel}
          summary={t("metaDescription", { birthLabel })}
          imageSrc={ASTRO_OVERVIEW_IMAGE}
          imageAlt={t("heroImageAlt")}
          imageFrameClassName="aspect-[4/3] max-w-[260px]"
          tier="cultural"
        />
        <p className="mt-3 font-mono text-[13px] text-hobun-faint">
          {placeDisplayLabel(view.placeLabel, locale)} · {t("navLabel")}
        </p>
      </div>

      {/* 해 · 달 · 상승궁 */}
      <div className="mb-12 grid gap-px border border-ink-700 bg-ink-700 sm:grid-cols-3">
        {bigThree.map((item, i) => (
          <div key={i} className="bg-ink-850/70 px-5 py-6 text-center">
            <p className="font-mono text-[13px] text-hobun-faint">{item.label}</p>
            <p className="mt-3 flex items-center justify-center gap-2">
              <span className="text-2xl leading-none text-hobun-dim">{item.symbol}</span>
              <span className="text-xl leading-none font-medium text-hobun">
                {locale === "en" ? item.en : item.ko}
              </span>
            </p>
            <p className="mt-3 text-[13px] text-hobun-faint">{item.gloss}</p>
          </div>
        ))}
      </div>

      <div className="mb-12 border border-ink-700 bg-ink-950/45 p-5 sm:p-6">
        <p className="text-[13px] text-hobun-faint">{t("housePickerTitle")}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("housePickerTitle")}>
          {(["whole", "equal", "placidus"] as const).map((system) => (
            <Link
              key={system}
              href={`/r/${data}/astro?houses=${system}`}
              aria-current={view.wheel.houseSystem === system ? "page" : undefined}
              className={`border px-3 py-2 text-[13px] transition-colors ${
                view.wheel.houseSystem === system
                  ? "border-hobun bg-hobun text-ink-900"
                  : "border-ink-700 text-hobun-dim hover:border-ink-600 hover:text-hobun"
              }`}
            >
              {t(system === "whole" ? "houseWhole" : system === "equal" ? "houseEqual" : "housePlacidus")}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{t("housePickerNote")}</p>
      </div>

      <div className="mb-12 border-t border-ink-800 pt-5">
        <h2 className="text-sm font-medium text-hobun">{t("bigThreeInterpretationTitle")}</h2>
        <div className="mt-3">
          {["sun", "moon", "rising"].map((key) => {
            const signIndex = key === "sun"
              ? view.bigThree.sun.signIndex
              : key === "moon"
                ? view.bigThree.moon.signIndex
                : view.bigThree.rising
                  ? view.bigThree.rising.signIndex
                  : undefined;
            const block = signIndex === undefined
              ? null
              : view.explanations.bigThree.find((item) => item.id === `astro-big-three-${key}-${signIndex}`);
            return block ? (
              <ProgressiveBlock
                key={block.id}
                block={block}
                locale={locale}
                detailLabel={tCommon("explanationDetails")}
                methodLabel={tCommon("explanationMethod")}
                evidenceLabel={tCommon("evidenceView")}
                citationLabel={tCommon("citationLabel")}
              />
            ) : null;
          })}
        </div>
      </div>

      <Section index="01" title={t("sectionWheel")} aside={<>{t("wheelAside")}</>}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,420px)_1fr] md:items-start">
          <div id="calculation-astro-chart-placements">
            <Tilt amount={6}>
              <ChartWheel wheel={view.wheel} />
            </Tilt>
          </div>

          <div className="min-w-0">
            <h3 className="mb-3 text-xs text-hobun-dim">{t("elementsLabel")}</h3>
            <ul className="mb-6 space-y-2">
              {view.balance.elements.map((e) => (
                <BalanceRow key={e.key} label={t(ELEMENT_LABEL_KEY[e.key])} count={e.count} total={10} />
              ))}
            </ul>
            <h3 className="mb-3 text-xs text-hobun-dim">{t("modalitiesLabel")}</h3>
            <ul className="space-y-2">
              {view.balance.modalities.map((m) => (
                <BalanceRow key={m.key} label={t(MODALITY_LABEL_KEY[m.key])} count={m.count} total={10} />
              ))}
            </ul>
            <p className="mt-5 text-[13px] leading-relaxed text-hobun-faint">{t("balanceNote")}</p>
          </div>
        </div>
      </Section>

      <Section index="02" title={t("sectionPlanets")} aside={<>{t("planetsAside")}</>}>
        <OverflowFade className="overflow-x-auto print-scroll">
          <table className="w-full min-w-[440px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-700 text-[13px] text-hobun-faint">
                <th className="py-2 pr-3 font-normal">{t("colHeadPlanet")}</th>
                <th className="py-2 pr-3 font-normal">{t("colHeadPosition")}</th>
                <th className="py-2 pr-3 font-normal">{t("colHeadElement")}</th>
                <th className="py-2 pr-3 text-right font-normal">{t("colHeadHouse")}</th>
                <th className="tabular py-2 text-right font-normal">{t("colHeadSpeed")}</th>
              </tr>
            </thead>
            <tbody>
              {view.planets.map((p) => (
                <tr id={`calculation-astro-placement-${p.key}-${p.signIndex}`} key={p.key} className="border-b border-ink-800">
                  <td className="py-2.5 pr-3">
                    <span className="mr-2 text-base text-hobun-dim">{p.symbol}</span>
                    <span className="text-xs text-hobun">{locale === "en" ? p.en : p.ko}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-hobun-dim">
                    {formatPlanetPosition(p, locale)}
                  </td>
                  <td className="py-2.5 pr-3 text-[13px] text-hobun-faint">
                    {t(ELEMENT_LABEL_KEY[p.element])} · {t(MODALITY_LABEL_KEY[p.modality])}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right font-mono text-xs text-hobun-dim">
                    {p.house ?? "—"}
                  </td>
                  <td className="tabular py-2.5 text-right font-mono text-xs text-hobun-faint">
                    {p.speedPerDay >= 0 ? "+" : "−"}
                    {Math.abs(p.speedPerDay).toFixed(2)}°
                  </td>
                </tr>
              ))}
          </tbody>
          </table>
        </OverflowFade>
        <PlacementGuide planets={view.planets} explanations={view.explanations} />
      </Section>

      <Section
        index="03"
        title={t("sectionAspects")}
        aside={<>{t("aspectCount", { n: view.aspects.length })}</>}
      >
        <div id="calculation-astro-aspects">
          {view.aspects.length === 0 ? (
            <p className="text-xs text-hobun-faint">{t("aspectsEmpty")}</p>
          ) : (
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {view.aspects.map((a, i) => (
                <li
                  key={`${a.aKo}-${a.bKo}-${i}`}
                  className="grid gap-2 border-b border-ink-800 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="flex items-center gap-2 text-xs text-hobun-dim">
                    <span className="text-base">{a.aSymbol}</span>
                    <span className="text-hobun-faint">{locale === "en" ? a.en : a.ko}</span>
                    <span className="text-base">{a.bSymbol}</span>
                  </span>
                  <span className="tabular shrink-0 font-mono text-[13px] text-hobun-faint">
                    {a.angle}° ±{a.orb}
                  </span>
                  <p className="col-span-full text-xs leading-relaxed text-hobun-faint">
                    {t(`aspectReadings.${a.key}`)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{t("aspectsNote")}</p>
          {Array.from(new Set(view.aspects.map((aspect) => aspect.key))).map((key) => {
            const block = view.explanations.aspects.find(
              (item) => item.id === `astro-aspect-${key}`,
            );
            if (!block) return null;
            return (
              <ProgressiveBlock
                key={block.id}
                block={block}
                locale={locale}
                detailLabel={tCommon("explanationDetails")}
                methodLabel={tCommon("explanationMethod")}
                evidenceLabel={tCommon("evidenceView")}
                citationLabel={tCommon("citationLabel")}
              />
            );
          })}
        </div>
      </Section>

      <Section index="04" title={t("sectionCalc")}>
        <div id="calculation-astro-calculation-record">
          <dl>
            <DataRow
              label={t("labelTimezone")}
              value={`${view.precision.timeZone} ${view.precision.offsetLabel}`}
            />
            <DataRow label={t("labelDst")} value={view.precision.isDST ? t("dstOn") : t("dstOff")} />
            <DataRow label={t("labelInstant")} value={view.precision.instantISO} />
            <DataRow label={t("labelObliquity")} value={view.precision.obliquity} />
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{t("calcNote")}</p>
        </div>
        <div id="calculation-astro-house-system" className="mt-6">
          <MethodNote locale={locale} title={tCommon("methodNote")} block={view.explanations.method} />
        </div>
        <IntegratedReportEntry />
      </Section>

      <Section index="05" title={t("sectionNotes")}>
        <ul className="space-y-3">
          {view.notes.map((note, i) => (
            <li key={i} className="border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-dim">
              {noteText(note, t)}
            </li>
          ))}
        </ul>
      </Section>

      <AdSlot slot="astro-mid" label={tCommon("adLabel")} />

      <footer className="space-y-8 border-t border-ink-700 pt-8">
        <ShareBar title={`${birthLabel} ${t("navLabel")} · LUMINA`} />
        <Disclaimer />
      </footer>
      </main>
    </SceneShell>
  );
}

function BalanceRow({
  label,
  count,
  total,
}: {
  readonly label: string;
  readonly count: number;
  readonly total: number;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 shrink-0 text-xs text-hobun-dim">{label}</span>
      <span className="h-0.5 flex-1 bg-ink-800">
        <span
          className="block h-0.5 bg-hobun-dim"
          style={{ width: `${(count / total) * 100}%` }}
        />
      </span>
      <span className="tabular w-6 shrink-0 text-right font-mono text-xs text-hobun-faint">
        {count}
      </span>
    </li>
  );
}

async function ReportHeader({ data }: { readonly data: string }) {
  const t = await getTranslations("nav");
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
      <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
        LUMINA
      </Link>
      <nav className="no-print flex items-center gap-2">
        <Link
          href={`/r/${data}`}
          className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
        >
          {t("saju")}
        </Link>
        <Link
          href={`/r/${data}/all`}
          className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
        >
          {t("all")}
        </Link>
        <span className="inline-flex min-h-11 items-center border border-hobun bg-hobun px-3 text-[13px] text-ink-900">
          {t("astro")}
        </span>
      </nav>
      <div className="no-print flex items-center gap-3">
        <LocaleSwitcher />
        <TierBadge tier="cultural" />
      </div>
    </header>
  );
}
