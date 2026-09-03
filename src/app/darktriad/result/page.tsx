import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { computeFactorScores } from "@engine/darktriad/scoring";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { FactorBar } from "@/components/darktriad/FactorBar";
import { NextLens } from "@/components/report/NextLens";
import { ShareBar } from "@/components/report/ShareBar";
import { ChapterNav, type Chapter } from "@/components/ui/ChapterNav";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { MethodNote } from "@/components/ui/MethodNote";
import { decodeResponses } from "@/lib/darktriadCode";
import { buildDarkTriadView } from "@/lib/darktriadModel";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { DARK_TRIAD_OVERVIEW_IMAGE, darkTriadImagePath } from "@/lib/psychometricsAssets";
import { darkTriadSummaryFromScores, encodeShareCode } from "@/lib/shareCode";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { toDarkTriadSnapshot } from "@/lib/integratedPortrait/adapters";
import { ScientificScorePlot, type ScientificScorePoint } from "@/components/analysis/ScientificScorePlot";
import { StatisticalReadingGuide } from "@/components/analysis/StatisticalReadingGuide";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";

interface Query {
  readonly r?: string;
  /** "?s=<code>"로 들어온 단축 공유 링크 — 있으면 곧장 /s/darktriad/<code>로 리다이렉트한다. */
  readonly s?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { r } = await searchParams;
  const responses = r ? decodeResponses(r) : null;
  const [t, locale] = await Promise.all([getTranslations("darktriad"), getLocale()]);
  if (!responses) return { title: t("metaTitle"), robots: { index: false } };

  // 기존 "?r=" 긴 링크도 카카오톡·X에 붙였을 때 실제 삽화 카드가 뜨도록, 여기서도
  // 같은 요약 코드를 다시 계산해 og:image를 그 공유 페이지로 돌린다.
  const code = encodeShareCode(darkTriadSummaryFromScores(computeFactorScores(responses), locale as Locale));

  return {
    robots: { index: false, follow: false },
    title: t("resultTitle"),
    description: t("resultMetaDescription"),
    openGraph: {
      images: [{ url: `/s/darktriad/${code}/opengraph-image`, width: 1200, height: 630, alt: "LUMINA" }],
    },
  };
}

export default async function DarkTriadResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { r, s } = await searchParams;
  if (s) redirect(`/s/darktriad/${s}`);
  const responses = r ? decodeResponses(r) : null;
  const [t, tCommon] = await Promise.all([
    getTranslations("darktriad"),
    getTranslations("common"),
  ]);
  const locale = await getLocale();
  const evidence = analysisDefinition("darktriad");

  if (!responses) {
    return (
      <SceneShell tone="darktriad">
        <main className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <ReportHeader />
          <div className="py-24 text-center">
            <p className="text-sm text-hobun-dim">{t("brokenLink")}</p>
            <Link
              href="/darktriad"
              className="mt-6 inline-block bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
            >
              {t("restartCta")}
            </Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  const view = buildDarkTriadView(responses);
  const resolvedLocale = locale as Locale;
  // 표지는 항상 같은 "overview" 그림이 아니라 실제로 가장 두드러진 요인의 삽화를 보여준다.
  const coverImage = view.dominantFactor ? darkTriadImagePath(view.dominantFactor) : DARK_TRIAD_OVERVIEW_IMAGE;
  const summary = darkTriadSummaryFromScores(computeFactorScores(responses), resolvedLocale);
  const shareCode = encodeShareCode(summary);
  const integratedSnapshot = toDarkTriadSnapshot(summary);
  const shareUrl = `/s/darktriad/${shareCode}`;
  const chapters: readonly Chapter[] = [
    { id: "section-factors", label: t("sectionFactors") },
    { id: "section-method", label: tCommon("methodNote") },
    { id: "section-next-lens", label: tCommon("nextLensKicker") },
  ];
  const scorePoints: readonly ScientificScorePoint[] = view.factors.map((factor) => ({
    key: factor.key,
    label: resolvedLocale === "en" ? factor.en : factor.ko,
    value: factor.rawSum,
    minimum: 9,
    maximum: 45,
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
    <SceneShell tone="darktriad">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="darktriad" />
        <AnalysisResultTracker analysis="darktriad" />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />
        <ReportHeader />

        <div className="py-8 sm:py-10">
          <ResultCover
            eyebrow={t("metaTitle")}
            title={t("resultTitle")}
            summary={t("heroBody")}
            imageSrc={coverImage}
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
          <ScientificScorePlot
            title={t("sectionFactors")}
            description={t("scaleNote")}
            points={scorePoints}
            labels={scorePlotLabels}
          />
          <StatisticalReadingGuide
            id="dark-triad-statistical-reading-guide"
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

        <div id="section-method" className="scroll-mt-24">
          <MethodNote
            locale={resolvedLocale}
            title={tCommon("methodNote")}
            citations={[]}
          />
        </div>

        <IntegratedReportEntry />

        <NextLens analysisKey={evidence.key} id="section-next-lens" />

        <footer className="mt-16 space-y-8 border-t border-ink-700 pt-8">
          <ShareBar
            title={t("shareTitle")}
            restartHref="/darktriad"
            restartLabel={t("retakeCta")}
            shareUrl={shareUrl}
            shareText={t("heroBody")}
            imageCard={{ kind: "darktriad", code: shareCode }}
            analysisKey={evidence.key}
          />
          <Disclaimer tier="scientific" />
        </footer>
      </main>
    </SceneShell>
  );
}

function ReportHeader() {
  const evidence = analysisDefinition("darktriad");

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
