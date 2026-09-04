import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { OverflowFade } from "@/components/ui/OverflowFade";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { assetPath } from "@/lib/assets";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { compatibilityToneImagePath } from "@/lib/compatibilityAssets";
import { decodeProfile } from "@/lib/share";
import { placeDisplayLabel, toBirthInput, type StoredProfile } from "@/lib/profile";
import { computeSaju, branchAt, stemAt } from "@engine/saju";
import {
  PILLARS,
  computeSynastry,
  type StemRelationKind,
  type SynastryPillarKey,
} from "@engine/synastry";
import type { BranchRelationKind } from "@engine/saju/relations";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { CompatibilityRelationMatrix } from "@/components/synastry/CompatibilityRelationMatrix";
import { CompatibilitySignalBalance } from "@/components/synastry/CompatibilitySignalBalance";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";

export const dynamic = "force-dynamic";

interface Params {
  readonly left: string;
  readonly right: string;
}

const REFERENCE_DATE = new Date("2000-01-01T00:00:00.000Z");

const branchRelationKeys: Readonly<Record<BranchRelationKind, string>> = Object.freeze({
  clash: "relationClash",
  combination: "relationCombination",
  trine: "relationTrine",
  punishment: "relationPunishment",
  harm: "relationHarm",
  destruction: "relationDestruction",
});

const stemRelationKeys: Readonly<Record<StemRelationKind, string>> = Object.freeze({
  "same-element": "stemSameElement",
  generates: "stemGenerates",
  controls: "stemControls",
  "receives-generation": "stemReceivesGeneration",
  "receives-control": "stemReceivesControl",
  different: "stemDifferent",
});

function buildSaju(profile: StoredProfile) {
  return computeSaju(toBirthInput(profile), {
    dayBoundaryRule: profile.dayBoundaryRule,
    referenceDate: REFERENCE_DATE,
  });
}

function profileDate(profile: StoredProfile): string {
  return `${profile.year}-${String(profile.month).padStart(2, "0")}-${String(profile.day).padStart(2, "0")}`;
}

function relationLabel(
  key: BranchRelationKind,
  t: Awaited<ReturnType<typeof getTranslations<"compatibility">>>,
): string {
  return t(branchRelationKeys[key]);
}

function stemLabel(
  key: StemRelationKind,
  t: Awaited<ReturnType<typeof getTranslations<"compatibility">>>,
): string {
  return t(stemRelationKeys[key]);
}

function pillarLabel(key: SynastryPillarKey, locale: Locale): string {
  const item = PILLARS.find((candidate) => candidate.key === key);
  return item ? (locale === "en" ? item.en : item.ko) : key;
}

function stemDisplay(index: number, locale: Locale): string {
  const stem = stemAt(index);
  return locale === "en" ? stem.en : stem.ko;
}

function toneLabel(
  tone: "supportive" | "challenging" | "mixed" | "quiet",
  t: Awaited<ReturnType<typeof getTranslations<"compatibility">>>,
): string {
  return t(tone);
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compatibility");
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: false } };
}

export default async function CompatibilityResultPage({
  params,
}: {
  readonly params: Promise<Params>;
}) {
  const { left, right } = await params;
  const leftProfile = decodeProfile(left);
  const rightProfile = decodeProfile(right);
  if (!leftProfile || !rightProfile) notFound();

  let leftSaju;
  let rightSaju;
  try {
    leftSaju = buildSaju(leftProfile);
    rightSaju = buildSaju(rightProfile);
  } catch {
    notFound();
  }

  const locale = (await getLocale()) as Locale;
  const [t, tCommon] = await Promise.all([
    getTranslations("compatibility"),
    getTranslations("common"),
  ]);
  const evidence = analysisDefinition("compatibility");
  const result = computeSynastry(leftSaju.pillars, rightSaju.pillars);
  const leftDayBranch = branchAt(leftSaju.pillars.day.branch);
  const rightDayBranch = branchAt(rightSaju.pillars.day.branch);
  const tone = toneLabel(result.summary.tone, t);
  const relationLabels: Readonly<Record<BranchRelationKind, string>> = {
    clash: t("relationClash"),
    combination: t("relationCombination"),
    trine: t("relationTrine"),
    punishment: t("relationPunishment"),
    harm: t("relationHarm"),
    destruction: t("relationDestruction"),
  };

  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="compatibility" />
        <AnalysisResultTracker analysis="compatibility" />
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <div className="no-print flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher />
            <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
          </div>
        </header>

        <div className="py-8 sm:py-10">
          <ResultCover
            eyebrow={t("resultKicker")}
            title={t("resultTitle")}
            summary={t("resultBody")}
            imageSrc={compatibilityToneImagePath(result.summary.tone)}
            imageAlt={t("resultImageAlt")}
            imageLabel={t("resultTitle")}
            scenePreset="relationship"
            tier="cultural"
            evidenceStatus={evidence.evidence.validationStatus}
          />
          <div className="mt-4 grid gap-3 text-xs text-hobun-faint sm:grid-cols-2">
            <p>{t("personA")}: {profileDate(leftProfile)} · {placeDisplayLabel(leftProfile.placeLabel, leftProfile.placeLabelEn, locale)}</p>
            <p>{t("personB")}: {profileDate(rightProfile)} · {placeDisplayLabel(rightProfile.placeLabel, rightProfile.placeLabelEn, locale)}</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProfileVisual
              label={t("personA")}
              zodiac={locale === "en" ? leftDayBranch.zodiacEn : leftDayBranch.zodiacKo}
              imageSrc={assetPath("saju/zodiac", leftDayBranch.zodiacEn.toLowerCase())}
              imageAlt={t("profileImageAlt", { profile: t("personA"), zodiac: locale === "en" ? leftDayBranch.zodiacEn : leftDayBranch.zodiacKo })}
            />
            <ProfileVisual
              label={t("personB")}
              zodiac={locale === "en" ? rightDayBranch.zodiacEn : rightDayBranch.zodiacKo}
              imageSrc={assetPath("saju/zodiac", rightDayBranch.zodiacEn.toLowerCase())}
              imageAlt={t("profileImageAlt", { profile: t("personB"), zodiac: locale === "en" ? rightDayBranch.zodiacEn : rightDayBranch.zodiacKo })}
            />
          </div>
          <div className="assessment-result-art reveal mt-5 grid overflow-hidden rounded-[1.5rem] border border-ink-700 bg-ink-900/70 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="assessment-art relative aspect-[4/3] min-h-[220px] overflow-hidden bg-ink-900 sm:min-h-0">
              <MotionSafeImage
                src={compatibilityToneImagePath(result.summary.tone)}
                alt={t("toneImageAlt", { tone })}
                sizes="(min-width: 640px) 360px, 92vw"
                className="object-cover"
                fallbackLabel={tone}
              />
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-7">
              <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">{t("toneSectionKicker")}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-hobun">{tone}</h2>
              <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("resultBody")}</p>
            </div>
          </div>
        </div>

        <Section index="01" title={t("sectionSummary")} aside={<span>{tone}</span>}>
          <div className="grid gap-px border border-ink-800 bg-ink-800 sm:grid-cols-3">
            <Metric label={t("supportive")} value={result.summary.supportiveCount} />
            <Metric label={t("challenging")} value={result.summary.challengingCount} />
            <Metric label={t("stemCount")} value={result.summary.stemRelationCount} />
          </div>
          <CompatibilitySignalBalance
            title={t("signalChartTitle")}
            description={t("signalChartDescription")}
            supportiveLabel={t("signalChartSupportive")}
            challengingLabel={t("signalChartChallenging")}
            stemLabel={t("signalChartStem")}
            supportiveCount={result.summary.supportiveCount}
            challengingCount={result.summary.challengingCount}
            stemRelationCount={result.summary.stemRelationCount}
          />
          <div className="mt-6">
            <ProgressiveBlock
              block={result.explanation}
              locale={locale}
              detailLabel={tCommon("explanationDetails")}
              methodLabel={tCommon("explanationMethod")}
              evidenceLabel={tCommon("evidenceView")}
              citationLabel={tCommon("citationLabel")}
            />
          </div>
        </Section>

        <Section index="02" title={t("sectionBranches")} aside={<span>{result.summary.branchRelationCount} {t("branchCount")}</span>}>
          <CompatibilityRelationMatrix
            title={t("relationMatrixTitle")}
            description={t("relationMatrixDescription")}
            emptyLabel={t("relationMatrixEmpty")}
            rowLabel={t("relationMatrixRows")}
            columnLabel={t("relationMatrixColumns")}
            pillars={result.pillars.map((pillar) => ({ key: pillar.key, label: pillarLabel(pillar.key, locale) }))}
            relations={result.branchRelations}
            relationLabels={relationLabels}
          />
          {result.branchRelations.length === 0 ? (
            <p className="text-sm leading-relaxed text-hobun-dim">{t("noBranches")}</p>
          ) : (
            <OverflowFade className="print-scroll overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead className="border-b border-ink-700 text-xs text-hobun-faint">
                    <tr>
                      <th className="py-3 pr-4 font-normal">{t("pillar")}</th>
                      <th className="py-3 pr-4 font-normal">{t("left")}</th>
                      <th className="py-3 pr-4 font-normal">{t("right")}</th>
                      <th className="py-3 font-normal">{t("relation")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.branchRelations.map((item, index) => {
                      const leftBranch = branchAt(item.leftBranch);
                      const rightBranch = branchAt(item.rightBranch);
                      return (
                        <tr key={`${item.leftPillar}-${item.rightPillar}-${item.kind}-${index}`} className="border-b border-ink-800">
                          <td className="py-3 pr-4 text-hobun-faint">{pillarLabel(item.leftPillar, locale)} ↔ {pillarLabel(item.rightPillar, locale)}</td>
                          <td className="py-3 pr-4 font-medium text-hobun">{locale === "en" ? leftBranch.en : leftBranch.ko}</td>
                          <td className="py-3 pr-4 font-medium text-hobun">{locale === "en" ? rightBranch.en : rightBranch.ko}</td>
                          <td className="py-3 text-hobun-dim">{relationLabel(item.kind, t)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </OverflowFade>
          )}
        </Section>

        <Section index="03" title={t("sectionStems")}>
          <div className="mb-6 border border-ink-700 bg-ink-900/50 p-5">
            <p className="font-mono text-[12px] tracking-wide text-hobun-faint">{t("dayMaster")}</p>
            <p className="mt-3 text-lg text-hobun">
              {stemDisplay(result.dayMaster.leftStem, locale)} ↔ {stemDisplay(result.dayMaster.rightStem, locale)}
            </p>
            <p className="mt-2 text-sm text-hobun-dim">{stemLabel(result.dayMaster.kind, t)}</p>
          </div>
          <div className="space-y-0 border-t border-ink-700">
            {result.stemRelations.map((item) => (
              <div key={item.leftPillar} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-ink-800 py-3 text-sm sm:grid-cols-[1fr_1fr_1.2fr]">
                <span className="text-hobun-faint">{pillarLabel(item.leftPillar, locale)}</span>
                <span className="text-hobun">{stemDisplay(item.leftStem, locale)} ↔ {stemDisplay(item.rightStem, locale)}</span>
                <span className="col-span-full text-left text-hobun-dim sm:col-span-1 sm:text-right">{stemLabel(item.kind, t)}</span>
              </div>
            ))}
          </div>
        </Section>

        <AdSlot slot="compatibility-mid" label={tCommon("adLabel")} />
        <footer className="space-y-8 border-t border-ink-700 pt-8">
          <ShareBar title={t("shareTitle")} restartHref="/compatibility" restartLabel={t("restart")} />
          <Disclaimer tier="cultural" />
        </footer>
      </main>
    </SceneShell>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="bg-ink-900 px-4 py-5">
      <p className="text-xs leading-relaxed text-hobun-faint">{label}</p>
      <p className="mt-2 font-mono text-2xl text-hobun">{value}</p>
    </div>
  );
}

function ProfileVisual({
  label,
  zodiac,
  imageSrc,
  imageAlt,
}: {
  readonly label: string;
  readonly zodiac: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
}) {
  return (
    <article className="assessment-gallery-card reveal grid grid-cols-[96px_1fr] items-center gap-4 overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-950/70 p-3 sm:grid-cols-[112px_1fr]">
      <div className="assessment-art relative aspect-square overflow-hidden rounded-[0.9rem] border border-ink-800 bg-ink-900">
        <MotionSafeImage
          src={imageSrc}
          alt={imageAlt}
          sizes="112px"
          className="object-cover"
          fallbackLabel={zodiac}
        />
      </div>
      <div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-hobun-faint">{label}</p>
        <p className="mt-2 text-lg font-medium text-hobun">{zodiac}</p>
      </div>
    </article>
  );
}
