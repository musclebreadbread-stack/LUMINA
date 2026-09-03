import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdSlot } from "@/components/ads/AdSlot";
import { SpiritCard } from "@/components/character/SpiritCard";
import { CollectionTracker } from "@/components/character/CollectionTracker";
import { ElementSpectrum } from "@/components/report/ElementSpectrum";
import { ElementWheel } from "@/components/report/ElementWheel";
import { LuckTimeline } from "@/components/report/LuckTimeline";
import { PillarGrid } from "@/components/report/PillarGrid";
import { ShareBar } from "@/components/report/ShareBar";
import { SolarTermDial } from "@/components/report/SolarTermDial";
import { SajuInterpretationGuide } from "@/components/report/SajuInterpretationGuide";
import { YearlyLuckStrip } from "@/components/report/YearlyLuckStrip";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { DataRow, Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { MethodNote } from "@/components/ui/MethodNote";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { ChapterNav, type Chapter } from "@/components/ui/ChapterNav";
import { Reveal } from "@/components/ui/Reveal";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { Tilt } from "@/components/ui/Tilt";
import { ELEMENT_STYLE } from "@/lib/elements";
import {
  buildReportView,
  formatBirthLabel,
  formatSignedMinutes,
  stageLabel,
  tenGodLabel,
  type ReportNote,
  type ReportView,
} from "@/lib/reportModel";
import { decodeProfile } from "@/lib/share";
import { placeDisplayLabel } from "@/lib/profile";
import { TWELVE_STAGES, branchAt, stageEvidenceRef } from "@engine/saju";
import type { Locale } from "@/i18n/locale";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { toSajuSnapshot } from "@/lib/integratedPortrait/adapters";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ data: string }>;
}): Promise<Metadata> {
  const { data } = await params;
  const profile = decodeProfile(data);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("saju");

  if (!profile) return { title: t("resultTitleSuffix"), robots: { index: false } };

  const view = buildReportView(profile, new Date());
  const spirit = view.character.def;
  const spiritName = locale === "en" ? spirit.nameEn : spirit.name;
  const spiritTagline = locale === "en" ? spirit.taglineEn : spirit.tagline;
  const birthLabel = formatBirthLabel(view.birthLocalISO, view.precision.timeUnknown, locale);

  return {
    // 개인 입력이 담긴 주소이므로 색인하지 않는다. 공유 미리보기는 그대로 동작한다.
    robots: { index: false, follow: false },
    title: `${spiritName} · ${birthLabel}`,
    description:
      locale === "en"
        ? `${birthLabel} Saju chart — ${spiritTagline} Solar terms and true solar time calculated by LUMINA.`
        : `${birthLabel} 사주 원국 — ${spiritTagline} LUMINA에서 절기와 진태양시를 계산했습니다.`,
    openGraph: {
      title: `${spiritName}(${spirit.hanja}) · ${birthLabel}`,
      description: spiritTagline,
      type: "article",
      locale: locale === "en" ? "en_US" : "ko_KR",
    },
    twitter: { card: "summary_large_image" },
  };
}

function noteText(
  note: ReportNote,
  t: Awaited<ReturnType<typeof getTranslations<"saju">>>,
  locale: Locale,
): string {
  switch (note.key) {
    case "timeUnknown":
      return t("noteTimeUnknown");
    case "lateZiHour":
      return t("noteLateZiHour");
    case "trueSolarShift": {
      const clock = branchAt(note.clockBranch);
      const solar = branchAt(note.solarBranch);
      return t("noteTrueSolarShift", {
        clockName: locale === "en" ? clock.en : clock.ko,
        clockHanja: clock.hanja,
        solarName: locale === "en" ? solar.en : solar.ko,
        solarHanja: solar.hanja,
      });
    }
    case "nearTermBoundary":
      return t("noteNearTermBoundary", { hours: note.hours.toFixed(1) });
    case "genderUnspecified":
      return t("noteGenderUnspecified");
    case "dst":
      return t("noteDST");
  }
}

export default async function ReportPage({ params }: { params: Promise<{ data: string }> }) {
  const { data } = await params;
  const profile = decodeProfile(data);
  const locale = (await getLocale()) as Locale;
  const [t, tCommon, tBirthForm] = await Promise.all([
    getTranslations("saju"),
    getTranslations("common"),
    getTranslations("birthForm"),
  ]);

  if (!profile) {
    return (
      <SceneShell tone="saju">
        <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <ReportHeader />
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

  let view: ReportView;
  try {
    view = buildReportView(profile, new Date());
  } catch (error) {
    return (
      <SceneShell tone="saju">
        <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <ReportHeader />
          <div className="py-24">
            <p className="text-sm text-hobun-dim">{t("cannotCompute")}</p>
            <p className="mt-2 font-mono text-[13px] text-hobun-faint">
              {error instanceof Error ? error.message : tCommon("unknownError")}
            </p>
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

  const dayMasterStyle = ELEMENT_STYLE[view.dayMaster.element];
  const dayMasterReading = locale === "en" ? view.dayMaster.en : view.dayMaster.ko;
  const dayMasterElementLabel = locale === "en" ? dayMasterStyle.en : dayMasterStyle.ko;
  const monthColumn = view.pillars.find((p) => p.key === "month");
  const birthLabel = formatBirthLabel(view.birthLocalISO, view.precision.timeUnknown, locale);
  const lunarLabel = view.lunar
    ? t(view.lunar.isLeapMonth ? "lunarLabelLeapFormat" : "lunarLabelFormat", {
        year: view.lunar.year,
        month: view.lunar.month,
        day: view.lunar.day,
      })
    : null;
  const genderKey =
    view.gender === "male" ? "genderMale" : view.gender === "female" ? "genderFemale" : "genderUnspecified";
  const strengthLabel = t(
    view.strength.verdict === "strong"
      ? "strengthStrong"
      : view.strength.verdict === "balanced"
        ? "strengthBalanced"
        : "strengthWeak",
  );
  const strengthNote = t(
    view.strength.verdict === "strong"
      ? "strengthNoteStrong"
      : view.strength.verdict === "balanced"
        ? "strengthNoteBalanced"
        : "strengthNoteWeak",
  );
  const termName = locale === "en" ? view.termEntry.en : view.termEntry.ko;
  const minuteUnit = t("minuteUnit");
  const characterTagline = locale === "en" ? view.character.def.taglineEn : view.character.def.tagline;
  const yearPillar = view.pillars.find((pillar) => pillar.key === "year");
  const integratedSnapshot = toSajuSnapshot({
    locale,
    dominantElement: view.elements.dominant,
    dayMasterElement: view.dayMaster.element,
    strength: view.strength.verdict,
    timeUnknown: view.precision.timeUnknown,
  });
  const chapters: readonly Chapter[] = [
    { id: "section-pillars", label: t("sectionPillars") },
    { id: "section-calc", label: t("sectionCalc") },
    { id: "section-elements", label: t("sectionElements") },
    { id: "section-rarity", label: t("rarityTitle") },
    { id: "section-tengods", label: t("sectionTenGods") },
    { id: "section-luck", label: t("sectionLuck") },
    ...(view.notes.length > 0 ? [{ id: "section-notes", label: t("sectionNotes") }] : []),
  ];

  return (
    <SceneShell tone="saju" tint={ELEMENT_STYLE[view.elements.dominant].cssVar}>
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ReportHeader data={data} />

      {/* 표제 */}
      <div className="py-8 sm:py-10">
        <ResultCover
          eyebrow={t("resultTitleSuffix")}
          title={birthLabel}
          summary={characterTagline}
          imageSrc={yearPillar?.zodiacImageSrc}
          imageAlt={yearPillar ? (locale === "en" ? yearPillar.zodiacEn : yearPillar.zodiacKo) : birthLabel}
          imageLabel={t("resultTitleSuffix")}
          tier="cultural"
        />
        <p className="mt-3 font-mono text-[13px] leading-relaxed text-hobun-faint">
          {lunarLabel ? `${lunarLabel} · ` : ""}
          {placeDisplayLabel(view.placeLabel, view.placeLabelEn, locale)} · {tBirthForm(genderKey)}
        </p>
      </div>

      {/* 요약 — 데이터로 들어가기 전에 한 장으로 */}
      <ChapterNav chapters={chapters} label={tCommon("chapterNavLabel")} />

      <div className="mb-12">
        <SpiritCard character={view.character} />
        <CollectionTracker characterId={view.character.def.id} />
        <ExplorationRecorder analysisKey="saju" />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />
      </div>

      <Section id="section-pillars" index="01" title={t("sectionPillars")} aside={<>{t("pillarsAside")}</>}>
        <div id="calculation-saju-pillars">
          <PillarGrid pillars={view.pillars} voidLabel={view.voidLabel} />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-hobun-dim">
          {t("dayMasterNote", {
            hanja: view.dayMaster.hanja,
            ko: dayMasterReading,
            element: dayMasterElementLabel,
          })}
        </p>

        <div className="mt-8 border-t border-ink-800 pt-2">
          <h3 className="text-sm font-medium text-hobun">{t("interpretationPillarsTitle")}</h3>
          {view.explanations.pillars.map((block, index) => {
            const key = view.pillars[index]?.key;
            const label = key
              ? t(
                  key === "hour"
                    ? "pillarHourLabel"
                    : key === "day"
                      ? "pillarDayLabel"
                      : key === "month"
                        ? "pillarMonthLabel"
                        : "pillarYearLabel",
                )
              : "";
            return (
              <section key={block.id}>
                <h4 className="pt-4 text-sm text-hobun-dim">{label}</h4>
                <ProgressiveBlock
                  block={block}
                  locale={locale}
                  detailLabel={tCommon("explanationDetails")}
                  methodLabel={tCommon("explanationMethod")}
                  evidenceLabel={tCommon("evidenceView")}
                  citationLabel={tCommon("citationLabel")}
                />
              </section>
            );
          })}
        </div>

        <div id="calculation-saju-void" className="mt-8 border-t border-ink-800 pt-2">
          <h3 className="text-sm font-medium text-hobun">{t("interpretationVoidTitle")}</h3>
          <ProgressiveBlock
            block={view.explanations.void}
            locale={locale}
            detailLabel={tCommon("explanationDetails")}
            methodLabel={tCommon("explanationMethod")}
            evidenceLabel={tCommon("evidenceView")}
            citationLabel={tCommon("citationLabel")}
          />
        </div>
      </Section>

      <Section id="section-calc" index="02" title={t("sectionCalc")} aside={<>{t("calcAside")}</>}>
        <div id="calculation-saju-calculation-record">
          <div className="grid gap-10 md:grid-cols-[minmax(0,340px)_1fr] md:items-start">
          {monthColumn && (
            <Tilt amount={7}>
              <SolarTermDial
                dial={view.dial}
                termEntry={view.termEntry}
                monthPillar={{
                  stemHanja: monthColumn.stem.hanja,
                  branchHanja: monthColumn.branch.hanja,
                  stemElement: monthColumn.stem.element,
                  branchElement: monthColumn.branch.element,
                }}
              />
            </Tilt>
          )}

          <dl className="min-w-0">
            <DataRow label={t("labelTimezone")} value={`${view.precision.timeZone} ${view.precision.offsetLabel}`} />
            <DataRow label={t("labelDst")} value={view.precision.isDST ? t("dstOn") : t("dstOff")} />
            <DataRow
              label={t("labelClock")}
              value={view.precision.timeUnknown ? t("clockUnknown") : view.precision.clockLabel}
            />
            <DataRow
              label={t("labelLongitude")}
              value={formatSignedMinutes(view.precision.longitudeCorrectionMinutes, minuteUnit)}
            />
            <DataRow
              label={t("labelEquation")}
              value={formatSignedMinutes(view.precision.equationOfTimeMinutes, minuteUnit)}
            />
            <DataRow
              label={t("labelTrueSolar")}
              value={view.precision.trueSolarLabel}
              note={formatSignedMinutes(view.precision.totalCorrectionMinutes, minuteUnit)}
            />
            {view.precision.kstLabel && (
              <DataRow label={t("labelKst")} value={view.precision.kstLabel} />
            )}
            <DataRow label={t("labelTermEntry")} value={`${termName} ${view.termEntry.instantLabel}`} />
            <DataRow
              label={t("labelDayBoundary")}
              value={t(view.dayBoundaryRule === "zi23" ? "dayBoundaryZi23" : "dayBoundaryMidnight")}
            />
          </dl>

          <p className="mt-3 text-xs leading-relaxed text-hobun-faint">
            {t(view.precision.totalCorrectionMinutes <= 0 ? "placeCorrectionEarlier" : "placeCorrectionLater", {
              place: placeDisplayLabel(view.placeLabel, view.placeLabelEn, locale),
              minutes: Math.round(Math.abs(view.precision.totalCorrectionMinutes)),
            })}
          </p>
          <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{t("calcNote")}</p>
          </div>
        </div>
        <div className="mt-6">
          <MethodNote
            locale={locale}
            title={tCommon("methodNote")}
            block={view.explanations.method}
          />
        </div>
        <IntegratedReportEntry />
      </Section>

      <Section id="section-elements" index="03" title={t("sectionElements")} aside={<>{strengthLabel}</>}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,300px)_1fr] md:items-start">
          <Tilt amount={6}>
            <ElementWheel elements={view.elements} dayElement={view.dayMaster.element} />
          </Tilt>
          <ElementSpectrum elements={view.elements} />
        </div>

          <div id="calculation-saju-strength-ratio" className="mt-8 border-t border-ink-700 pt-6">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span className="text-sm text-hobun">{t("strengthLine", { verdict: strengthLabel })}</span>
            <span className="tabular font-mono text-xs text-hobun-faint">
              {t("supportRatio", { ratio: (view.strength.ratio * 100).toFixed(1) })}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              [t("seasonalTag"), view.strength.seasonal, t("seasonalHint")],
              [t("rootTag"), view.strength.root, t("rootHint")],
              [t("peerTag"), view.strength.peer, t("peerHint")],
            ].map(([label, on, hint]) => (
              <span
                key={label as string}
                title={hint as string}
                className={`border px-3 py-1.5 font-mono text-[13px] ${
                  on
                    ? "border-hobun/40 text-hobun"
                    : "border-ink-700 text-hobun-faint line-through decoration-1"
                }`}
              >
                {label as string}
              </span>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-hobun-faint">
            {strengthNote} {t("strengthFootnote")}
          </p>
          <div className="mt-5">
            <h3 className="text-sm font-medium text-hobun">{t("interpretationStrengthTitle")}</h3>
            <ProgressiveBlock
              block={view.explanations.strength}
              locale={locale}
              detailLabel={tCommon("explanationDetails")}
              methodLabel={tCommon("explanationMethod")}
              evidenceLabel={tCommon("evidenceView")}
              citationLabel={tCommon("citationLabel")}
            />
          </div>
        </div>
      </Section>

      <Section id="section-rarity" index="04" title={t("rarityTitle")}>
        <div id="calculation-saju-rarity" className="border border-ink-800 bg-ink-950/45 p-5 sm:p-6">
          <p className="font-mono text-sm text-hobun">
            {t("rarityStat", {
              sample: view.rarity.sampleSpace.toLocaleString(locale === "en" ? "en-US" : "ko-KR"),
              matching: view.rarity.matchingCombinations.toLocaleString(locale === "en" ? "en-US" : "ko-KR"),
              percent: (view.rarity.probability * 100).toFixed(2),
            })}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-hobun-faint">{t("rarityBody")}</p>
          <div className="mt-5">
            <ProgressiveBlock
              block={view.explanations.rarity}
              locale={locale}
              detailLabel={tCommon("explanationDetails")}
              methodLabel={tCommon("explanationMethod")}
              evidenceLabel={tCommon("evidenceView")}
              citationLabel={tCommon("citationLabel")}
            />
          </div>
        </div>
      </Section>

      {/* 광고 — 게시자 ID가 없으면(지금 상태) 아무것도 렌더되지 않는다 */}
      <AdSlot slot="saju-mid" label={tCommon("adLabel")} />

      <Section id="section-tengods" index="05" title={t("sectionTenGods")} aside={<>{t("tenGodsAside")}</>}>
        <ul className="space-y-px">
          {view.tenGodGroups.map((group) => {
            const style = ELEMENT_STYLE[group.element];
            const empty = group.total === 0;
            const groupLabel = t(`tenGodGroup${capitalize(group.role)}`);
            const groupGloss = t(`tenGodGroup${capitalize(group.role)}Gloss`);
            return (
              <li
                key={group.role}
                className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 border-b border-ink-800 py-3 sm:grid-cols-[auto_1fr_auto]"
              >
                <span
                  aria-hidden
                  className="h-6 w-0.5 shrink-0"
                  style={{
                    backgroundColor: empty ? "var(--color-ink-700)" : style.cssVar,
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm ${empty ? "text-hobun-faint" : "text-hobun"}`}>
                      {groupLabel}
                    </span>
                    <span className={`font-hanja text-xs ${empty ? "text-hobun-faint" : style.text}`}>
                      {style.hanja}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-hobun-faint">{groupGloss}</p>
                </div>
                <div className="col-span-full flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[13px] sm:col-span-1">
                  {group.items.map((item) => (
                    <span
                      key={item.name}
                      className={item.count > 0 ? "text-hobun-dim" : "text-hobun-faint"}
                    >
                      {tenGodLabel(item.name, locale)}
                      <span className="tabular ml-1.5">{item.count}</span>
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{t("tenGodsFootnote")}</p>
        <SajuInterpretationGuide
          explanations={view.explanations.tenGods}
          presentGods={view.tenGodGroups.flatMap((group) =>
            group.items.filter((item) => item.count > 0).map((item) => item.name),
          )}
        />
        <div id="calculation-saju-stages" className="mt-8 border-t border-ink-800 pt-2">
          <h3 className="text-sm font-medium text-hobun">{t("interpretationStagesTitle")}</h3>
          <p className="mt-3 text-[13px] leading-relaxed text-hobun-faint">{t("stageNote")}</p>
          {view.explanations.stages.map((block, index) => (
            <section key={block.id} id={`calculation-${stageEvidenceRef(TWELVE_STAGES[index] ?? "")}`}>
              <h4 className="pt-4 text-sm text-hobun-dim">
                {stageLabel(TWELVE_STAGES[index] ?? "", locale)}
              </h4>
              <ProgressiveBlock
                block={block}
                locale={locale}
                detailLabel={tCommon("explanationDetails")}
                methodLabel={tCommon("explanationMethod")}
                evidenceLabel={tCommon("evidenceView")}
                citationLabel={tCommon("citationLabel")}
              />
            </section>
          ))}
        </div>
      </Section>

      <Section
        id="section-luck"
        index="06"
        title={t("sectionLuck")}
        aside={view.current ? <>{t("currentAgeSuffix", { age: view.current.age })}</> : undefined}
      >
        <LuckTimeline luck={view.luck} />
        <div id="calculation-saju-luck-periods" className="mt-8 border-t border-ink-800 pt-2">
          <h3 className="text-sm font-medium text-hobun">{t("interpretationLuckTitle")}</h3>
          <p className="mt-3 text-[13px] leading-relaxed text-hobun-faint">{t("interpretationLuckNote")}</p>
          {view.explanations.luck.map((block) => (
            <ProgressiveBlock
              key={block.id}
              block={block}
              locale={locale}
              detailLabel={tCommon("explanationDetails")}
              methodLabel={tCommon("explanationMethod")}
              evidenceLabel={tCommon("evidenceView")}
              citationLabel={tCommon("citationLabel")}
            />
          ))}
        </div>
        <YearlyLuckStrip yearly={view.yearly} />

        {view.current && (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink-700 pt-6">
            <div className="flex items-baseline gap-3">
              <span className="text-xs text-hobun-faint">
                {t("currentYearlyLabel", { year: view.current.year })}
              </span>
              <span className="glyph glyph-inlay-sm font-hanja text-2xl leading-none font-black">
                <span className={ELEMENT_STYLE[view.current.yearStemElement].text}>
                  {view.current.yearHanja[0]}
                </span>
                <span className={ELEMENT_STYLE[view.current.yearBranchElement].text}>
                  {view.current.yearHanja[1]}
                </span>
              </span>
            </div>
            <span className="font-mono text-[13px] text-hobun-faint">
              {tenGodLabel(view.current.stemTenGod, locale)} · {tenGodLabel(view.current.branchTenGod, locale)}
            </span>
          </div>
        )}
      </Section>

      {view.notes.length > 0 && (
        <Section id="section-notes" index="07" title={t("sectionNotes")}>
          <ul className="space-y-3">
            {view.notes.map((note, i) => (
              <li
                key={i}
                className="border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-dim"
              >
                {noteText(note, t, locale)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <AdSlot slot="saju-bottom" label={tCommon("adLabel")} />

      <Reveal>
        <footer className="space-y-8 border-t border-ink-700 pt-8">
          <ShareBar title={`${birthLabel} ${t("resultTitleSuffix")} · LUMINA`} />
          <Disclaimer />
        </footer>
      </Reveal>
      </main>
    </SceneShell>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function ReportHeader({ data }: { readonly data?: string }) {
  const t = await getTranslations("nav");
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
      <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
        LUMINA
      </Link>
      {data && (
        <nav className="no-print flex items-center gap-2">
          <span className="inline-flex min-h-11 items-center border border-hobun bg-hobun px-3 text-[13px] text-ink-900">
            {t("saju")}
          </span>
          <Link
            href={`/r/${data}/astro`}
            className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
          >
            {t("astro")}
          </Link>
          <Link
            href={`/r/${data}/all`}
            className="inline-flex min-h-11 items-center border border-ink-700 px-3 text-[13px] text-hobun-dim transition-colors hover:border-ink-600 hover:text-hobun"
          >
            {t("all")}
          </Link>
        </nav>
      )}
      <div className="no-print flex items-center gap-3">
        <LocaleSwitcher />
        <TierBadge tier="cultural" />
      </div>
    </header>
  );
}
