"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/locale";
import type { AttachmentView } from "@/lib/attachmentModel";
import { readAssessmentRun } from "@/lib/assessmentRun";
import { AxisBar } from "@/components/attachment/AxisBar";
import { QuadrantCard } from "@/components/attachment/QuadrantCard";
import { ShareBar } from "@/components/report/ShareBar";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { attachmentSummaryFromView } from "@/lib/shareCode";
import { toAttachmentSnapshot } from "@/lib/integratedPortrait/adapters";

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

export function AttachmentResultClient({ runId }: { readonly runId: string }) {
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

  const integratedSnapshot = toAttachmentSnapshot(attachmentSummaryFromView(view, locale));

  return (
    <div className="py-8 sm:py-12 space-y-12">
      <IntegratedResultRecorder snapshot={integratedSnapshot} />
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-hobun">{t("resultHeading")}</h1>
        <p className="text-lg text-hobun-dim">{t("resultSubheading")}</p>
      </div>

      <QuadrantCard classification={view.classification} locale={locale} />

      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-hobun">{t("axisScoresTitle")}</h2>
        <div className="space-y-8">
          <AxisBar axis={view.anxiety} locale={locale} />
          <AxisBar axis={view.avoidance} locale={locale} />
        </div>
      </div>

      <div className="border border-ink-700 rounded-xl p-6 space-y-4">
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

      <div className="border border-ink-700 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-hobun">{t("scienceTitle")}</h2>
        <div className="space-y-3 text-base text-hobun-dim leading-relaxed">
          <p>{t("scienceP1")}</p>
          <p>{t("scienceP2")}</p>
          <p>{t("scienceP3")}</p>
        </div>
      </div>

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

      <IntegratedReportEntry />

      <ShareBar
        title={t("resultTitle")}
        restartHref="/attachment"
        restartLabel={t("retakeButton")}
      />
    </div>
  );
}
