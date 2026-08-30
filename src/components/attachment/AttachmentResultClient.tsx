"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore, type ReactNode } from "react";
import type { Locale } from "@/i18n/locale";
import type { AttachmentView } from "@/lib/attachmentModel";
import { readAssessmentRun } from "@/lib/assessmentRun";
import { AxisBar } from "@/components/attachment/AxisBar";
import { QuadrantCard } from "@/components/attachment/QuadrantCard";
import { ExplorationRecorder } from "@/components/report/ExplorationRecorder";
import { ShareBar } from "@/components/report/ShareBar";
import { ChapterNav, type Chapter } from "@/components/ui/ChapterNav";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { attachmentSummaryFromView, encodeShareCode } from "@/lib/shareCode";
import { attachmentImagePath } from "@/lib/psychometricsAssets";
import { toAttachmentSnapshot } from "@/lib/integratedPortrait/adapters";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAxisView(value: unknown): value is AttachmentView["anxiety"] {
  if (!isRecord(value)) return false;
  return (
    typeof value.rawSum === "number" &&
    Number.isFinite(value.rawSum) &&
    typeof value.mean === "number" &&
    Number.isFinite(value.mean) &&
    typeof value.labelKo === "string" &&
    typeof value.labelEn === "string"
  );
}

function isAttachmentView(value: unknown): value is AttachmentView {
  if (!isRecord(value) || !isAxisView(value.anxiety) || !isAxisView(value.avoidance)) {
    return false;
  }

  const classification = value.classification;
  if (!isRecord(classification)) return false;

  return (
    classification.quadrant === "secure" ||
    classification.quadrant === "anxious" ||
    classification.quadrant === "avoidant" ||
    classification.quadrant === "fearful"
  ) &&
    typeof classification.labelKo === "string" &&
    typeof classification.labelEn === "string" &&
    typeof classification.descriptionKo === "string" &&
    typeof classification.descriptionEn === "string";
}

const subscribeHydration = (): (() => void) => () => undefined;
const getHydratedSnapshot = (): boolean => true;
const getServerHydratedSnapshot = (): boolean => false;
const runCache = new Map<string, AttachmentView | null>();

function readAttachmentView(runId: string): AttachmentView | null {
  if (!runCache.has(runId)) {
    const run = readAssessmentRun(runId, "attachment", isAttachmentView);
    runCache.set(runId, run?.scoreSummary ?? null);
  }
  return runCache.get(runId) ?? null;
}

export function AttachmentResultClient({
  runId,
  chapters,
  chapterNavLabel,
  nextLens,
}: {
  readonly runId: string;
  readonly chapters: readonly Chapter[];
  readonly chapterNavLabel: string;
  /* 서버에서 미리 그려 넘긴 "다음 렌즈" 슬롯 — 결과 복원에 성공했을 때만 붙인다. */
  readonly nextLens: ReactNode;
}) {
  const t = useTranslations("attachment");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const view = hydrated ? readAttachmentView(runId) : null;

  if (!hydrated) {
    return (
      <div className="py-24 text-center" aria-busy="true">
        <p className="text-sm text-hobun-dim">{t("loadingResult")}</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="py-16 text-center space-y-6">
        <h1 className="text-3xl font-bold text-hobun">{t("errorTitle")}</h1>
        <p className="text-lg text-hobun-dim">{t("errorMessage")}</p>
        <Link
          href="/attachment"
          className="inline-block px-6 py-3 bg-hobun text-ink-900 rounded-lg font-medium hover:bg-hobun-dim transition-colors"
        >
          {t("retryButton")}
        </Link>
      </div>
    );
  }

  // "?run="은 이 세션스토리지를 만든 탭에서만 열리므로, ShareBar가 내보내는 링크는
  // 항상 재계산 가능한 요약 코드("/s/attachment/<code>")여야 실제로 공유할 수 있다.
  const summary = attachmentSummaryFromView(view, locale);
  const shareCode = encodeShareCode(summary);
  const integratedSnapshot = toAttachmentSnapshot(summary);
  const shareUrl = `/s/attachment/${shareCode}`;

  return (
    <div className="py-8 sm:py-12 space-y-12">
      <ExplorationRecorder analysisKey="attachment" />
      <IntegratedResultRecorder snapshot={integratedSnapshot} />
      <div className="result-cover reading-panel relative overflow-hidden rounded-[1.75rem] border border-ink-700 p-5 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
        <div className="result-cover-glow" aria-hidden />
        <div className="relative z-10 grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.52fr)]">
          <div>
            <p className="font-mono text-[12px] tracking-[0.2em] text-ink-700/75">{t("resultTitle")}</p>
            <h1 className="mt-3 max-w-[18ch] text-[clamp(1.8rem,5vw,3.2rem)] leading-[1.06] font-semibold tracking-[-0.045em] text-ink-950">
              {t("resultHeading")}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-800/85">{t("resultSubheading")}</p>
          </div>
          <div className="result-cover-art assessment-result-art relative mx-auto aspect-[3/2] w-full max-w-[260px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
            <MotionSafeImage
              src={attachmentImagePath(view.classification.quadrant)}
              alt={t("resultImageAlt")}
              sizes="(min-width: 640px) 260px, 62vw"
              priority
              className="object-cover"
              fallbackLabel={t("resultHeading")}
            />
          </div>
        </div>
      </div>

      <ChapterNav chapters={chapters} label={chapterNavLabel} />

      <div id="section-quadrant" className="scroll-mt-24">
        <QuadrantCard classification={view.classification} locale={locale} />
      </div>

      <div id="section-axes" className="space-y-8 scroll-mt-24">
        <h2 className="text-2xl font-bold text-hobun">{t("axisScoresTitle")}</h2>
        <div className="space-y-8">
          <AxisBar axis={view.anxiety} axisKey="anxiety" locale={locale} />
          <AxisBar axis={view.avoidance} axisKey="avoidance" locale={locale} />
        </div>
      </div>

      <div id="section-interpretation" className="border border-ink-700 rounded-xl p-6 space-y-4 scroll-mt-24">
        <h2 className="text-xl font-semibold text-hobun">{t("interpretationTitle")}</h2>
        <div className="space-y-3 text-base text-hobun-dim leading-relaxed">
          <p>{t("interpretationP1")}</p>
          <p>{t("interpretationP2")}</p>
          <p>{t("interpretationP3")}</p>
        </div>
      </div>

      <p className="border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">
        {tCommon("disclaimerScientific")}
      </p>

      <div id="section-science" className="border border-ink-700 rounded-xl p-6 space-y-4 scroll-mt-24">
        <h2 className="text-xl font-semibold text-hobun">{t("scienceTitle")}</h2>
        <div className="space-y-3 text-base text-hobun-dim leading-relaxed">
          <p>{t("scienceP1")}</p>
          <p>{t("scienceP2")}</p>
          <p>{t("scienceP3")}</p>
        </div>
      </div>

      <IntegratedReportEntry />

      {nextLens}

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

      <ShareBar
        title={t("resultTitle")}
        restartHref="/attachment"
        restartLabel={t("retakeButton")}
        shareUrl={shareUrl}
        shareText={t("resultSubheading")}
        imageCard={{ kind: "attachment", code: shareCode }}
        analysisKey="attachment"
      />
    </div>
  );
}
