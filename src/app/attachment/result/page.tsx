import { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { SceneShell } from "@/components/ui/SceneShell";
import { AxisBar } from "@/components/attachment/AxisBar";
import { AttachmentResultClient } from "@/components/attachment/AttachmentResultClient";
import { QuadrantCard } from "@/components/attachment/QuadrantCard";
import { buildAttachmentView } from "@/lib/attachmentModel";
import { decodeAttachmentResponses } from "@/lib/attachmentCode";
import { analysisDefinition } from "@/lib/analysisCatalog";

interface ResultPageProps {
  searchParams: Promise<{ r?: string; run?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("attachment");
  return {
    title: t("resultTitle"),
    description: t("resultDescription"),
  };
}

export default async function AttachmentResultPage({ searchParams }: ResultPageProps) {
  const params = await searchParams;
  const t = await getTranslations("attachment");
  const locale = await getLocale();
  const evidence = analysisDefinition("attachment");

  if (params.run) {
    return (
      <SceneShell tone="attachment">
        <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
            <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
              LUMINA
            </Link>
            <div className="flex items-center gap-3">
              <LocaleSwitcher />
              <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
            </div>
          </header>
          <AttachmentResultClient runId={params.run} />
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
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
            <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
              LUMINA
            </Link>
            <div className="flex items-center gap-3">
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
  const resolvedLocale = locale as "ko" | "en";

  return (
    <SceneShell tone="attachment">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-ink-700 py-5">
          <Link href="/" className="font-mono text-xs tracking-[0.28em] text-hobun">
            LUMINA
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <EvidenceStatusBadge status={evidence.evidence.validationStatus} />
          </div>
        </header>

        <div className="py-8 sm:py-12 space-y-12">
          {/* 헤더 */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-hobun">
              {t("resultHeading")}
            </h1>
            <p className="text-lg text-hobun-dim">
              {t("resultSubheading")}
            </p>
          </div>

          {/* 4사분면 분류 카드 */}
          <QuadrantCard
            classification={view.classification}
            locale={resolvedLocale}
          />

          {/* 축별 점수 */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-hobun">
              {t("axisScoresTitle")}
            </h2>

            <div className="space-y-8">
              <AxisBar axis={view.anxiety} locale={resolvedLocale} />
              <AxisBar axis={view.avoidance} locale={resolvedLocale} />
            </div>
          </div>

          {/* 해석 가이드 */}
          <div className="border border-ink-700 rounded-xl p-6 space-y-4">
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
          <div className="border border-ink-700 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-hobun">
              {t("scienceTitle")}
            </h2>
            <div className="space-y-3 text-base text-hobun-dim leading-relaxed">
              <p>{t("scienceP1")}</p>
              <p>{t("scienceP2")}</p>
              <p>{t("scienceP3")}</p>
            </div>
          </div>

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
