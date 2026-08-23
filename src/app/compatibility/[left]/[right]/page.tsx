import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section, TierBadge } from "@/components/ui/Chrome";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { OverflowFade } from "@/components/ui/OverflowFade";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { assetPath } from "@/lib/assets";
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
  const result = computeSynastry(leftSaju.pillars, rightSaju.pillars);
  const leftDayBranch = branchAt(leftSaju.pillars.day.branch);
  const tone = toneLabel(result.summary.tone, t);

  return (
    <SceneShell tone="saju">
      <main className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <div className="no-print flex items-center gap-3">
            <LocaleSwitcher />
            <TierBadge tier="cultural" />
          </div>
        </header>

        <div className="py-8 sm:py-10">
          <ResultCover
            eyebrow={t("resultKicker")}
            title={t("resultTitle")}
            summary={t("resultBody")}
            imageSrc={assetPath("saju/zodiac", leftDayBranch.zodiacEn.toLowerCase())}
            imageAlt={locale === "en" ? leftDayBranch.zodiacEn : leftDayBranch.zodiacKo}
            imageLabel={locale === "en" ? leftDayBranch.zodiacEn : leftDayBranch.zodiacKo}
            tier="cultural"
          />
          <div className="mt-4 grid gap-3 text-xs text-hobun-faint sm:grid-cols-2">
            <p>{t("personA")}: {profileDate(leftProfile)} · {placeDisplayLabel(leftProfile.placeLabel, locale)}</p>
            <p>{t("personB")}: {profileDate(rightProfile)} · {placeDisplayLabel(rightProfile.placeLabel, locale)}</p>
          </div>
        </div>

        <Section index="01" title={t("sectionSummary")} aside={<span>{tone}</span>}>
          <div className="grid gap-px border border-ink-800 bg-ink-800 sm:grid-cols-3">
            <Metric label={t("supportive")} value={result.summary.supportiveCount} />
            <Metric label={t("challenging")} value={result.summary.challengingCount} />
            <Metric label={t("stemCount")} value={result.summary.stemRelationCount} />
          </div>
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
