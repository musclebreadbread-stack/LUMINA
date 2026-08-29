import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { NORM_SOURCE, PSYCHOMETRIC_CITATIONS, computeFactorScores } from "@engine/psychometrics";
import { AdSlot } from "@/components/ads/AdSlot";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { FactorBar } from "@/components/psychometrics/FactorBar";
import { RetestComparison } from "@/components/psychometrics/RetestComparison";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { MethodNote } from "@/components/ui/MethodNote";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import { decodeResponses } from "@/lib/psychometricsCode";
import { buildBigFiveView } from "@/lib/psychometricsModel";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { bigFiveSummaryFromScores } from "@/lib/shareCode";
import { toBigFiveSnapshot } from "@/lib/integratedPortrait/adapters";

interface Query {
  readonly r?: string;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  const { r } = await searchParams;
  const responses = r ? decodeResponses(r) : null;
  const t = await getTranslations("psychometrics");
  if (!responses) return { title: t("metaTitle"), robots: { index: false } };

  return {
    robots: { index: false, follow: false },
    title: t("resultTitle"),
    description: t("resultMetaDescription"),
  };
}

export default async function PsychometricsResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { r } = await searchParams;
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

  const integratedSnapshot = toBigFiveSnapshot(
    bigFiveSummaryFromScores(computeFactorScores(responses), resolvedLocale),
  );

  return (
    <SceneShell tone="psychometrics">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ReportHeader />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />

      <div className="py-8 sm:py-10">
        <ResultCover
          eyebrow={t("metaTitle")}
          title={t("resultTitle")}
          summary={t("heroBody")}
          imageSrc={view.factors[0]?.imageSrc}
          imageAlt=""
          imageLabel={t("resultTitle")}
          tier="scientific"
          evidenceStatus={evidence.evidence.validationStatus}
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

      <Section index="01" title={t("sectionFactors")} aside={<>{t("factorsAside")}</>}>
        <div>
          {view.factors.map((f) => (
            <FactorBar key={f.key} factor={f} />
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-hobun-faint">{t("scaleNote")}</p>
        <p className="mt-3 text-xs leading-relaxed text-hobun-faint">{t("reliabilityNote")}</p>
      </Section>

      <Section index="02" title={td("profileSection")}>
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

      <MethodNote
        locale={resolvedLocale}
        title={td("methodTitle")}
        method={{
          ko: td("normSource", { n: NORM_SOURCE.sampleSize.toLocaleString("ko-KR") }) + " · " + td("normScope"),
          en: td("normSource", { n: NORM_SOURCE.sampleSize.toLocaleString("en-US") }) + " · " + td("normScope"),
        }}
        citations={PSYCHOMETRIC_CITATIONS}
      />

      <IntegratedReportEntry />

      <AdSlot slot="psychometrics-mid" label={tCommon("adLabel")} />

      <footer className="space-y-8 border-t border-ink-700 pt-8">
        <ShareBar
          title={`${t("resultTitle")} · LUMINA`}
          restartHref="/psychometrics"
          restartLabel={t("restartCta")}
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
