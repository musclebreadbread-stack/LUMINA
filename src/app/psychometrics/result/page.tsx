import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { NORM_SOURCE, PSYCHOMETRIC_CITATIONS, computeFactorScores } from "@engine/psychometrics";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { FactorBar } from "@/components/psychometrics/FactorBar";
import { RetestComparison } from "@/components/psychometrics/RetestComparison";
import { NextLens } from "@/components/report/NextLens";
import { ShareBar } from "@/components/report/ShareBar";
import { ChapterNav, type Chapter } from "@/components/ui/ChapterNav";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { MethodNote } from "@/components/ui/MethodNote";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { decodeResponses } from "@/lib/psychometricsCode";
import { buildBigFiveView } from "@/lib/psychometricsModel";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { bigFiveSummaryFromScores, encodeShareCode } from "@/lib/shareCode";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { toBigFiveSnapshot } from "@/lib/integratedPortrait/adapters";
import { ScientificScorePlot, type ScientificScorePoint } from "@/components/analysis/ScientificScorePlot";
import { StatisticalReadingGuide } from "@/components/analysis/StatisticalReadingGuide";

interface Query {
  readonly r?: string;
  /** "?s=<code>"로 들어온 단축 공유 링크 — 있으면 곧장 /s/bigfive/<code>로 리다이렉트한다. */
  readonly s?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { r } = await searchParams;
  const responses = r ? decodeResponses(r) : null;
  const [t, locale] = await Promise.all([getTranslations("psychometrics"), getLocale()]);
  if (!responses) return { title: t("metaTitle"), robots: { index: false } };

  // 기존 "?r=" 긴 링크도 카카오톡·X에 붙였을 때 실제 삽화 카드가 뜨도록, 여기서도
  // 같은 요약 코드를 다시 계산해 og:image를 그 공유 페이지로 돌린다.
  const code = encodeShareCode(bigFiveSummaryFromScores(computeFactorScores(responses), locale as Locale));

  return {
    robots: { index: false, follow: false },
    title: t("resultTitle"),
    description: t("resultMetaDescription"),
    openGraph: {
      images: [{ url: `/s/bigfive/${code}/opengraph-image`, width: 1200, height: 630, alt: "LUMINA" }],
    },
  };
}

export default async function PsychometricsResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { r, s } = await searchParams;
  if (s) redirect(`/s/bigfive/${s}`);
  const responses = r ? decodeResponses(r) : null;
  const [t, tCommon] = await Promise.all([
    getTranslations("psychometrics"),
    getTranslations("common"),
  ]);
  const [td, locale] = await Promise.all([
    getTranslations("psychometricsDeep"),
    getLocale(),
  ]);
  const evidence = analysisDefinition("psychometrics");

  if (!responses) {
    return (
      <SceneShell tone="psychometrics">
        <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <ReportHeader />
          <div className="py-24 text-center">
            <p className="text-sm text-hobun-dim">{t("brokenLink")}</p>
            <Link
              href="/psychometrics"
              className="mt-6 inline-block bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
            >
              {t("restartCta")}
            </Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  const view = buildBigFiveView(responses);
  const resolvedLocale = locale as Locale;
  // 표지는 항상 첫 요인(외향성)이 아니라 실제 프로필에서 가장 두드러진 요인을 보여준다.
  const coverFactor = view.factors.find((f) => f.key === view.dominantFactor) ?? view.factors[0];
  const summary = bigFiveSummaryFromScores(computeFactorScores(responses), resolvedLocale);
  const shareCode = encodeShareCode(summary);
  const integratedSnapshot = toBigFiveSnapshot(summary);
  const shareUrl = `/s/bigfive/${shareCode}`;
  const chapters: readonly Chapter[] = [
    { id: "section-factors", label: t("sectionFactors") },
    { id: "section-profile", label: td("profileSection") },
    { id: "section-method", label: td("methodTitle") },
    { id: "section-next-lens", label: tCommon("nextLensKicker") },
  ];
  const scorePoints: readonly ScientificScorePoint[] = view.factors.map((factor) => ({
    key: factor.key,
    label: resolvedLocale === "en" ? factor.en : factor.ko,
    value: factor.rawSum,
    minimum: factor.itemCount,
    maximum: factor.itemCount * 5,
    ...(factor.norm
      ? {
          interval: factor.reliability.ci95,
          reference: {
            mean: factor.rawSum - factor.norm.zScore * factor.norm.standardDeviation,
            standardDeviation: factor.norm.standardDeviation,
            percentile: factor.norm.percentile,
            tScore: factor.norm.tScore,
            sampleSize: factor.norm.sampleSize,
          },
        }
      : {}),
  }));
  const scorePlotLabels = {
    observed: tCommon("statisticalVisual.observed"),
    interval: tCommon("statisticalVisual.interval"),
    reference: tCommon("statisticalVisual.reference"),
    noReference: tCommon("statisticalVisual.noReference"),
    range: tCommon("statisticalVisual.range"),
    low: tCommon("statisticalVisual.low"),
    high: tCommon("statisticalVisual.high"),
    table: tCommon("statisticalVisual.table"),
    value: tCommon("statisticalVisual.value"),
    percentile: tCommon("statisticalVisual.percentile"),
    tScore: tCommon("statisticalVisual.tScore"),
    sample: tCommon("statisticalVisual.sample"),
  } as const;

  return (
    <SceneShell tone="psychometrics">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="psychometrics" />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />
        <ReportHeader />

      <div className="py-8 sm:py-10">
        <ResultCover
          eyebrow={t("metaTitle")}
          title={t("resultTitle")}
          summary={t("heroBody")}
          imageSrc={coverFactor?.imageSrc}
          imageAlt=""
          imageLabel={t("resultTitle")}
          tier="scientific"
          evidenceStatus={evidence.evidence.validationStatus}
          completionAnalysisKey={evidence.key}
        />
        <p className="mt-3 font-mono text-[13px] text-hobun-faint">
          {t("itemCountLabel", { n: view.itemCount })}
        </p>
        <Link
          href={`/psychometrics/types/result?r=${r}`}
          className="mt-5 inline-flex min-h-11 items-center border border-ink-600 px-4 text-sm text-hobun underline underline-offset-4 transition-colors hover:border-hobun"
        >
          {t("openJungian")}
        </Link>
      </div>

      <ChapterNav chapters={chapters} label={tCommon("chapterNavLabel")} />

      <Section id="section-factors" index="01" title={t("sectionFactors")} aside={<>{t("factorsAside")}</>}>
        <ScientificScorePlot
          title={t("sectionFactors")}
          description={t("scaleNote")}
          points={scorePoints}
          labels={scorePlotLabels}
        />
        <StatisticalReadingGuide
          id="big-five-statistical-reading-guide"
          title={tCommon("statisticalReading.title")}
          intro={tCommon("statisticalReading.intro")}
          items={[
            { label: tCommon("statisticalReading.observedTitle"), body: tCommon("statisticalReading.observedBody") },
            { label: tCommon("statisticalReading.intervalTitle"), body: tCommon("statisticalReading.intervalBody") },
            { label: tCommon("statisticalReading.referenceTitle"), body: tCommon("statisticalReading.referenceBody") },
          ]}
        />
        <div>
          {view.factors.map((f) => (
            <FactorBar key={f.key} factor={f} />
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-hobun-faint">{t("scaleNote")}</p>
        <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{t("reliabilityNote")}</p>
      </Section>

      <Section id="section-profile" index="02" title={td("profileSection")}>
        {view.profileExplanation ? (
          <ProgressiveBlock
            block={view.profileExplanation}
            locale={resolvedLocale}
            detailLabel={tCommon("explanationDetails")}
            methodLabel={tCommon("explanationMethod")}
            evidenceLabel={tCommon("evidenceView")}
            citationLabel={tCommon("citationLabel")}
          />
        ) : null}
        <div className="mt-2">
          {view.factors.map((factor) => (
            <div key={factor.key} className="border-b border-ink-800 py-5 last:border-b-0">
              <ProgressiveBlock
                block={factor.explanation}
                locale={resolvedLocale}
                detailLabel={tCommon("explanationDetails")}
                methodLabel={tCommon("explanationMethod")}
                evidenceLabel={tCommon("evidenceView")}
                citationLabel={tCommon("citationLabel")}
              />
              <div className="mt-4 border-l border-ink-600 pl-4">
                <p className="font-mono text-[12px] text-hobun-faint">{td("reflectionTitle")}</p>
                <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
                  {resolvedLocale === "en" ? factor.reflectionQuestion.en : factor.reflectionQuestion.ko}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <RetestComparison currentCode={r ?? ""} />

      <div id="section-method" className="scroll-mt-24">
        <MethodNote
          locale={resolvedLocale}
          title={td("methodTitle")}
          method={{
            ko: td("normSource", { n: NORM_SOURCE.sampleSize.toLocaleString("ko-KR") }) + " · " + td("normScope"),
            en: td("normSource", { n: NORM_SOURCE.sampleSize.toLocaleString("en-US") }) + " · " + td("normScope"),
          }}
          citations={PSYCHOMETRIC_CITATIONS}
        />
      </div>

      <IntegratedReportEntry />

      <NextLens analysisKey={evidence.key} id="section-next-lens" />

      <AdSlot slot="psychometrics-mid" label={tCommon("adLabel")} />

      <footer className="space-y-8 border-t border-ink-700 pt-8">
        <ShareBar
          title={`${t("resultTitle")} · LUMINA`}
          restartHref="/psychometrics"
          restartLabel={t("restartCta")}
          shareUrl={shareUrl}
          shareText={t("heroBody")}
          imageCard={{ kind: "bigfive", code: shareCode }}
          analysisKey={evidence.key}
        />
        <Disclaimer tier="scientific" />
      </footer>
      </main>
    </SceneShell>
  );
}

function ReportHeader() {
  const evidence = analysisDefinition("psychometrics");

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
      <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
        LUMINA
      </Link>
      <div className="no-print flex items-center gap-3">
        <LocaleSwitcher />
        <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
      </div>
    </header>
  );
}
