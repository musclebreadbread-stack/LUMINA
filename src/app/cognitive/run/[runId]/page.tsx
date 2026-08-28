import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { StandardizedRunClient } from "@/components/cognitive/StandardizedRunClient";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SceneShell } from "@/components/ui/SceneShell";
import type { Locale } from "@/i18n/locale";
import { parseRunId } from "@/lib/cognitiveRunInput";
import { resumeCognitiveRun } from "@/server/cognitive/runs";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly params: Promise<{ runId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cognitive");
  return { title: t("standardizedTitle"), robots: { index: false, follow: false } };
}

export default async function CognitiveRunPage({ params }: PageProps) {
  const { runId: rawRunId } = await params;
  const [locale, t] = await Promise.all([getLocale(), getTranslations("cognitive")]);
  let runId: string;
  try {
    runId = parseRunId(rawRunId);
  } catch {
    runId = "";
  }

  let run = null;
  if (runId !== "") {
    try {
      run = await resumeCognitiveRun(runId);
    } catch {
      run = null;
    }
  }

  return (
    <SceneShell tone="cognitive">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/cognitive" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <section className="py-10">
          {run === null ? (
            <div className="space-y-5 border border-ink-700 p-6">
              <h1 className="text-2xl font-semibold text-hobun">{t("runInvalid")}</h1>
              <p className="text-sm leading-relaxed text-hobun-dim">{t("setupRequired")}</p>
              <Link href="/cognitive" className="inline-block min-h-11 bg-hobun px-5 py-3 text-sm font-medium text-ink-900">{t("pilotResultCta")}</Link>
            </div>
          ) : (
            <StandardizedRunClient
              initialRun={run}
              locale={locale as Locale}
              labels={{
                progress: t("runProgress"),
                submit: t("runSubmit"),
                invalid: t("runInvalid"),
                stale: t("runInvalid"),
                option: t("optionsLabel"),
              }}
            />
          )}
        </section>
      </main>
    </SceneShell>
  );
}
