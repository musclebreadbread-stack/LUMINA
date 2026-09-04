import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { EQ_CITATIONS } from "@engine/eq/citations";
import { computeFactorScores } from "@engine/eq/scoring";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { FactorBar } from "@/components/eq/FactorBar";
import { TotalScoreCard } from "@/components/eq/TotalScoreCard";
import { NextLens } from "@/components/report/NextLens";
import { ShareBar } from "@/components/report/ShareBar";
import { ChapterNav, type Chapter } from "@/components/ui/ChapterNav";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { MethodNote } from "@/components/ui/MethodNote";
import { decodeResponses } from "@/lib/eqCode";
import { buildEqView } from "@/lib/eqModel";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { EQ_OVERVIEW_IMAGE } from "@/lib/psychometricsAssets";
import { encodeShareCode, eqSummaryFromScores } from "@/lib/shareCode";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { toEqSnapshot } from "@/lib/integratedPortrait/adapters";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";
import { ScientificScorePlot, type ScientificScorePoint } from "@/components/analysis/ScientificScorePlot";
import { StatisticalReadingGuide } from "@/components/analysis/StatisticalReadingGuide";
import { ResponseQualityNotice } from "@/components/analysis/ResponseQualityNotice";
import { assessLikertResponseQuality } from "@/lib/responseQuality";

interface Query {
  readonly r?: string;
  /** "?s=<code>"로 들어온 단축 공유 링크 — 있으면 곧장 /s/eq/<code>로 리다이렉트한다. */
  readonly s?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { r } = await searchParams;
  const responses = r ? decodeResponses(r) : null;
  const [t, locale] = await Promise.all([getTranslations("eq"), getLocale()]);
  if (!responses) return { title: t("metaTitle"), robots: { index: false } };

  // 기존 "?r=" 긴 링크도 카카오톡·X에 붙였을 때 실제 삽화 카드가 뜨도록, 여기서도
  // 같은 요약 코드를 다시 계산해 og:image를 그 공유 페이지로 돌린다.
  const code = encodeShareCode(eqSummaryFromScores(computeFactorScores(responses), locale as Locale));

  return {
    robots: { index: false, follow: false },
    title: t("resultTitle"),
    description: t("resultMetaDescription"),
    openGraph: {
      images: [{ url: `/s/eq/${code}/opengraph-image`, width: 1200, height: 630, alt: "LUMINA" }],
    },
  };
}

export default async function EqResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { r, s } = await searchParams;
  if (s) redirect(`/s/eq/${s}`);
  const responses = r ? decodeResponses(r) : null;
  const [t, tCommon] = await Promise.all([getTranslations("eq"), getTranslations("common")]);
  const locale = await getLocale();
  const evidence = analysisDefinition("eq");

  if (!responses) {
    return (
      <SceneShell tone="eq">
        <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <ReportHeader />
          <div className="py-24 text-center">
            <p className="text-sm text-hobun-dim">{t("brokenLink")}</p>
            <Link
              href="/eq"
              className="mt-6 inline-block bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
            >
              {t("restartCta")}
            </Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  const view = buildEqView(responses);
  const responseQuality = assessLikertResponseQuality(Object.values(responses));
  const resolvedLocale = locale as Locale;
  const summary = eqSummaryFromScores(computeFactorScores(responses), resolvedLocale);
  const shareCode = encodeShareCode(summary);
  const integratedSnapshot = toEqSnapshot(summary);
  const shareUrl = `/s/eq/${shareCode}`;
  const chapters: readonly Chapter[] = [
    { id: "section-factors", label: t("sectionFactors") },
    { id: "section-experiments", label: t("sectionExperiments") },
    { id: "section-method", label: tCommon("methodNote") },
    { id: "section-next-lens", label: tCommon("nextLensKicker") },
  ];
  const scorePoints: readonly ScientificScorePoint[] = [
    {
      key: "total",
      label: t("totalLabel"),
      value: view.total.rawSum,
      minimum: view.total.itemCount,
      maximum: view.total.itemCount * 5,
      interval: view.total.reliability.ci95,
      ...(view.total.norm
        ? {
            reference: {
              mean: view.total.rawSum - view.total.norm.zScore * view.total.norm.standardDeviation,
              standardDeviation: view.total.norm.standardDeviation,
              percentile: view.total.norm.percentile,
              tScore: view.total.norm.tScore,
              sampleSize: view.total.norm.sampleSize,
            },
          }
        : {}),
    },
    ...view.factors.map((factor) => ({
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
    } satisfies ScientificScorePoint)),
  ];
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
    <SceneShell tone="eq">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="eq" />
        <AnalysisResultTracker analysis="eq" />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />
        <ReportHeader />

        <div className="py-8 sm:py-10">
          <ResultCover
            eyebrow={t("metaTitle")}
            title={t("resultTitle")}
            summary={t("heroBody")}
            imageSrc={EQ_OVERVIEW_IMAGE}
            imageAlt={t("resultImageAlt")}
            imageLabel={t("resultTitle")}
            imageFrameClassName="assessment-result-art aspect-[3/2] max-w-[260px]"
            tier="scientific"
            evidenceStatus={evidence.evidence.validationStatus}
            completionAnalysisKey={evidence.key}
          />
          <p className="mt-3 font-mono text-[13px] text-hobun-faint">
            {t("itemCountLabel", { n: view.itemCount })}
          </p>
        </div>

        <ChapterNav chapters={chapters} label={tCommon("chapterNavLabel")} />

        <Section id="section-factors" index="01" title={t("sectionFactors")} aside={<>{t("factorsAside")}</>}>
          <ResponseQualityNotice
            quality={responseQuality}
            title={tCommon("responseQuality.title")}
            uniformBody={tCommon("responseQuality.uniform")}
            narrowRangeBody={tCommon("responseQuality.narrowRange")}
          />
          <ScientificScorePlot
            title={t("sectionFactors")}
            description={t("scaleNote")}
            points={scorePoints}
            labels={scorePlotLabels}
          />
          <StatisticalReadingGuide
            id="eq-statistical-reading-guide"
            title={tCommon("statisticalReading.title")}
            intro={tCommon("statisticalReading.intro")}
            items={[
              { label: tCommon("statisticalReading.observedTitle"), body: tCommon("statisticalReading.observedBody") },
              { label: tCommon("statisticalReading.intervalTitle"), body: tCommon("statisticalReading.intervalBody") },
              { label: tCommon("statisticalReading.referenceTitle"), body: tCommon("statisticalReading.referenceBody") },
            ]}
          />
          <TotalScoreCard total={view.total} />
          <div className="mt-6">
            {view.factors.map((factor) => (
              <FactorBar key={factor.key} factor={factor} />
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-hobun-faint">{t("scaleNote")}</p>
          <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{t("reliabilityNote")}</p>
        </Section>

        <Section id="section-experiments" index="02" title={t("sectionExperiments")} aside={<>{t("experimentsAside")}</>}>
          <p className="text-sm leading-relaxed text-hobun-dim">{t("experimentsIntro")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {view.factors.map((factor) => (
              <article
                key={factor.key}
                className="rounded-[1.25rem] border border-ink-700 bg-ink-950/70 p-5"
              >
                <p className="font-mono text-[12px] tracking-[0.14em] text-hobun-faint">
                  {t(`factors.${factor.key}.label`)}
                </p>
                <h3 className="mt-2 text-base font-medium text-hobun">
                  {t(`factors.${factor.key}.experimentTitle`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
                  {t(`factors.${factor.key}.experimentBody`)}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-6 border-l border-ink-600 pl-3 text-xs leading-relaxed text-hobun-faint">
            {t("experimentsFooterNotice")}
          </p>
        </Section>

        <div id="section-method" className="scroll-mt-24">
          <MethodNote
            locale={resolvedLocale}
            title={tCommon("methodNote")}
            method={{ ko: t("methodBody"), en: t("methodBody") }}
            citations={EQ_CITATIONS}
          />
        </div>

        <IntegratedReportEntry />

        <NextLens analysisKey={evidence.key} id="section-next-lens" />

        <footer className="mt-16 space-y-8 border-t border-ink-700 pt-8">
          <ShareBar
            title={t("shareTitle")}
            restartHref="/eq"
            restartLabel={t("retakeCta")}
            shareUrl={shareUrl}
            shareText={t("heroBody")}
            imageCard={{ kind: "eq", code: shareCode }}
            analysisKey={evidence.key}
          />
          <Disclaimer tier="scientific" />
        </footer>
      </main>
    </SceneShell>
  );
}

function ReportHeader() {
  const evidence = analysisDefinition("eq");

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
