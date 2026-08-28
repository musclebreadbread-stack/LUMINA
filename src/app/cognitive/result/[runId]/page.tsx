import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { PilotResult } from "@/components/cognitive/PilotResult";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { SceneShell } from "@/components/ui/SceneShell";
import type { Locale } from "@/i18n/locale";
import { parseRunId } from "@/lib/cognitiveRunInput";
import { resolveScoreForRun } from "@/server/cognitive/norms";
import { resumeCognitiveRun } from "@/server/cognitive/runs";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly params: Promise<{ runId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cognitive");
  return { title: t("pilotResultTitle"), robots: { index: false, follow: false } };
}

export default async function CognitiveRunResultPage({ params }: PageProps) {
  const { runId: rawRunId } = await params;
  const [locale, t] = await Promise.all([getLocale(), getTranslations("cognitive")]);
  let validRun = false;
  try {
    validRun = (await resumeCognitiveRun(parseRunId(rawRunId))) !== null;
  } catch {
    validRun = false;
  }
  const result = validRun
    ? await resolveScoreForRun(parseRunId(rawRunId))
    : Object.freeze({ status: "pilot_withheld" as const, score: null });

  return (
    <SceneShell tone="cognitive">
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <header className="flex items-center justify-between border-b border-ink-700 py-5">
          <Link href="/cognitive" className="font-mono text-xs tracking-[0.28em] text-hobun">LUMINA</Link>
          <LocaleSwitcher />
        </header>
        <section className="py-10">
          {validRun ? <PilotResult result={result} locale={locale as Locale} /> : <p className="text-sm text-hobun-dim">{t("runInvalid")}</p>}
        </section>
      </main>
    </SceneShell>
  );
}
