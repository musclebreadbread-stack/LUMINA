import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { computeFactorScores } from "@engine/darktriad/scoring";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { FactorBar } from "@/components/darktriad/FactorBar";
import { ShareBar } from "@/components/report/ShareBar";
import { Disclaimer, Section } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { ResultCover } from "@/components/ui/ResultCover";
import { SceneShell } from "@/components/ui/SceneShell";
import { MethodNote } from "@/components/ui/MethodNote";
import { decodeResponses } from "@/lib/darktriadCode";
import { buildDarkTriadView } from "@/lib/darktriadModel";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { IntegratedResultRecorder } from "@/components/report/IntegratedResultRecorder";
import { IntegratedReportEntry } from "@/components/report/IntegratedReportEntry";
import { darkTriadSummaryFromScores } from "@/lib/shareCode";
import { toDarkTriadSnapshot } from "@/lib/integratedPortrait/adapters";

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
  const t = await getTranslations("darktriad");
  if (!responses) return { title: t("metaTitle"), robots: { index: false } };

  return {
    robots: { index: false, follow: false },
    title: t("resultTitle"),
    description: t("resultMetaDescription"),
  };
}

export default async function DarkTriadResultPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const { r } = await searchParams;
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

  const integratedSnapshot = toDarkTriadSnapshot(
    darkTriadSummaryFromScores(computeFactorScores(responses), resolvedLocale),
  );

  return (
    <SceneShell tone="darktriad">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <ReportHeader />
        <IntegratedResultRecorder snapshot={integratedSnapshot} />

        <div className="py-8 sm:py-10">
          <ResultCover
            eyebrow={t("metaTitle")}
            title={t("resultTitle")}
            summary={t("heroBody")}
            imageAlt=""
            imageLabel={t("resultTitle")}
            tier="scientific"
            evidenceStatus={evidence.evidence.validationStatus}
          />
          <p className="mt-3 font-mono text-[13px] text-hobun-faint">
            {t("itemCountLabel", { n: view.itemCount })}
          </p>
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

        <MethodNote
          locale={resolvedLocale}
          title={tCommon("methodNote")}
          citations={[]}
        />

        <IntegratedReportEntry />

        <footer className="mt-16 space-y-8 border-t border-ink-700 pt-8">
          <ShareBar
            title={t("shareTitle")}
            restartHref="/darktriad"
            restartLabel={t("retakeCta")}
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
