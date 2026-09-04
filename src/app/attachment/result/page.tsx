import { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ChapterNav } from "@/components/ui/ChapterNav";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { AxisBar } from "@/components/attachment/AxisBar";
import { AttachmentResultClient } from "@/components/attachment/AttachmentResultClient";
import { QuadrantCard } from "@/components/attachment/QuadrantCard";
import { AttachmentQuadrantPlot } from "@/components/attachment/AttachmentQuadrantPlot";
import { attachmentResultChapters } from "@/components/attachment/resultChapters";
import { NextLens } from "@/components/report/NextLens";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { buildAttachmentView } from "@/lib/attachmentModel";
import { decodeAttachmentResponses } from "@/lib/attachmentCode";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { attachmentImagePath } from "@/lib/psychometricsAssets";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { AnalysisResultTracker } from "@/components/analytics/AnalysisTracker";
import { ResponseQualityNotice } from "@/components/analysis/ResponseQualityNotice";
import { assessLikertResponseQuality } from "@/lib/responseQuality";

interface ResultPageProps {
  searchParams: Promise<{ r?: string; run?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("attachment");
  return {
    title: t("resultTitle"),
    description: t("resultDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AttachmentResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const [t, tCommon] = await Promise.all([
    getTranslations("attachment"),
    getTranslations("common"),
  ]);
  const locale = await getLocale();
  const evidence = analysisDefinition("attachment");
  const chapters = attachmentResultChapters(t, tCommon("nextLensKicker"));

  if (params.run) {
    return (
      <SceneShell tone="attachment">
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
            <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
              LUMINA
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <LocaleSwitcher />
              <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
            </div>
          </header>
          {/* 목차와 추천은 결과가 실제로 복원됐을 때만 뜨도록 클라이언트 쪽에 슬롯으로 넘긴다. */}
          <AttachmentResultClient
            runId={params.run}
            chapters={chapters}
            chapterNavLabel={tCommon("chapterNavLabel")}
            nextLens={<NextLens analysisKey={evidence.key} id="section-next-lens" />}
          />
        </main>
      </SceneShell>
    );
  }

  // 응답 디코딩
  const responses = params.r ? decodeAttachmentResponses(params.r) : null;

  if (!responses) {
    return (
      <SceneShell tone="attachment">
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
            <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
              LUMINA
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <LocaleSwitcher />
              <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
            </div>
          </header>

          <div className="py-16 text-center space-y-6">
            <h1 className="text-3xl font-bold text-hobun">
              {t("errorTitle")}
            </h1>
            <p className="text-lg text-hobun-dim">
              {t("errorMessage")}
            </p>
            <Link
              href="/attachment"
              className="inline-block px-6 py-3 bg-hobun text-ink-900 rounded-lg font-medium hover:bg-hobun-dim transition-colors"
            >
              {t("retryButton")}
            </Link>
          </div>
        </main>
      </SceneShell>
    );
  }

  // 결과 계산
  const view = buildAttachmentView(responses);
  const responseQuality = assessLikertResponseQuality(Object.values(responses));
  const resolvedLocale = locale as "ko" | "en";

  return (
    <SceneShell tone="attachment">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ExplorationRecorder analysisKey="attachment" />
        <AnalysisResultTracker analysis="attachment" />
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5 pr-16">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <LocaleSwitcher />
            <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
          </div>
        </header>

        <div className="py-8 sm:py-12 space-y-12">
          {/* 헤더 */}
          <ResultCover
            eyebrow={t("resultTitle")}
            title={t("resultHeading")}
            summary={t("resultSubheading")}
            imageSrc={attachmentImagePath(view.classification.quadrant)}
            imageAlt={t("resultImageAlt")}
            imageLabel={t("resultHeading")}
            imageFrameClassName="assessment-result-art aspect-[3/2] max-w-[260px]"
            tier={evidence.tier}
            evidenceStatus={evidence.evidence.validationStatus}
            completionAnalysisKey={evidence.key}
          />

          <ResponseQualityNotice
            quality={responseQuality}
            title={tCommon("responseQuality.title")}
            uniformBody={tCommon("responseQuality.uniform")}
            narrowRangeBody={tCommon("responseQuality.narrowRange")}
          />

          <ChapterNav chapters={chapters} label={tCommon("chapterNavLabel")} />

          {/* 4사분면 분류 카드 */}
          <div id="section-quadrant" className="scroll-mt-24">
            <QuadrantCard
              classification={view.classification}
              locale={resolvedLocale}
            />
            <div className="mt-6">
              <AttachmentQuadrantPlot
                anxiety={view.anxiety.mean}
                avoidance={view.avoidance.mean}
                title={t("quadrantPlotTitle")}
                description={t("quadrantPlotDescription")}
                scaleLabel={t("quadrantPlotScale")}
                boundaryLabel={t("quadrantBoundary")}
                selectedLabel={t("quadrantPlotSelected")}
                noNormLabel={t("quadrantPlotNoNorm")}
                anxietyLabel={t("axes.anxiety.label")}
                avoidanceLabel={t("axes.avoidance.label")}
                lowLabel={t("quadrantPlotLow")}
                highLabel={t("quadrantPlotHigh")}
                quadrantLabels={{
                  secure: t("styles.secure.label"),
                  anxious: t("styles.anxious.label"),
                  avoidant: t("styles.avoidant.label"),
                  fearful: t("styles.fearful.label"),
                }}
                classificationLabel={resolvedLocale === "ko" ? view.classification.labelKo : view.classification.labelEn}
              />
            </div>
          </div>

          {/* 축별 점수 */}
          <div id="section-axes" className="space-y-8 scroll-mt-24">
            <h2 className="text-2xl font-bold text-hobun">
              {t("axisScoresTitle")}
            </h2>

            <div className="space-y-8">
              <AxisBar axis={view.anxiety} axisKey="anxiety" locale={resolvedLocale} />
              <AxisBar axis={view.avoidance} axisKey="avoidance" locale={resolvedLocale} />
            </div>
          </div>

          {/* 해석 가이드 */}
          <div id="section-interpretation" className="border border-ink-700 rounded-xl p-6 space-y-4 scroll-mt-24">
            <h2 className="text-xl font-semibold text-hobun">
              {t("interpretationTitle")}
            </h2>
            <div className="space-y-3 text-base text-hobun-dim leading-relaxed">
              <p>{t("interpretationP1")}</p>
              <p>{t("interpretationP2")}</p>
              <p>{t("interpretationP3")}</p>
            </div>
          </div>

          <Disclaimer tier={evidence.tier} />

          {/* 참고 근거와 한계 */}
          <div id="section-science" className="border border-ink-700 rounded-xl p-6 space-y-4 scroll-mt-24">
            <h2 className="text-xl font-semibold text-hobun">
              {t("scienceTitle")}
            </h2>
            <div className="space-y-3 text-base text-hobun-dim leading-relaxed">
              <p>{t("scienceP1")}</p>
              <p>{t("scienceP2")}</p>
              <p>{t("scienceP3")}</p>
            </div>
          </div>

          <IntegratedReportEntry />

          <NextLens analysisKey={evidence.key} id="section-next-lens" />

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/attachment"
              className="px-6 py-3 bg-hobun text-ink-900 rounded-lg font-medium hover:bg-hobun-dim transition-colors text-center"
            >
              {t("retakeButton")}
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-ink-700 text-hobun rounded-lg font-medium hover:border-ink-600 transition-colors text-center"
            >
              {t("homeButton")}
            </Link>
          </div>
        </div>
      </main>
    </SceneShell>
  );
}
