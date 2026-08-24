import { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Disclaimer } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { SceneShell } from "@/components/ui/SceneShell";
import { SurveyForm } from "@/components/attachment/SurveyForm";
import { analysisDefinition } from "@/lib/analysisCatalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("attachment");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AttachmentPage() {
  const t = await getTranslations("attachment");
  const evidence = analysisDefinition("attachment");

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

        <div className="py-8 sm:py-12">
          {/* 히어로 섹션 */}
          <div className="mb-12 text-center space-y-4">
            <p className="font-mono text-sm text-hobun-dim tracking-wider">
              {t("kicker")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-hobun">
              {t("heroTitle")}
            </h1>
            <p className="text-lg text-hobun-dim max-w-2xl mx-auto leading-relaxed">
              {t("heroDescription")}
            </p>
          </div>

          {/* 소개 카드 */}
          <div className="mb-8 border border-ink-700 rounded-xl p-6 bg-ink-900/50 space-y-4">
            <h2 className="text-xl font-semibold text-hobun">
              {t("aboutTitle")}
            </h2>
            <p className="text-base text-hobun-dim leading-relaxed">
              {t("aboutDescription")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="border border-ink-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-hobun mb-2">
                  {t("timeLabel")}
                </h3>
                <p className="text-2xl font-bold text-hobun">
                  {t("timeValue")}
                </p>
              </div>
              <div className="border border-ink-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-hobun mb-2">
                  {t("itemsLabel")}
                </h3>
                <p className="text-2xl font-bold text-hobun">
                  {t("itemsValue")}
                </p>
              </div>
            </div>
          </div>

          {/* 설문 폼 */}
          <SurveyForm />

          {/* 각주 */}
          <div className="mt-8 text-sm text-hobun-dim space-y-2">
            <p>{t("footerNote1")}</p>
            <p>{t("footerNote2")}</p>
          </div>
          <div className="mt-8">
            <Disclaimer tier={evidence.tier} />
          </div>
        </div>
      </main>
    </SceneShell>
  );
}
