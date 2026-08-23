"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { loadPsychometricsHistory } from "@/lib/psychometricsHistory";

function subscribeHistory(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

function historySnapshot(): string | null {
  return loadPsychometricsHistory()[0]?.code ?? null;
}

function historyServerSnapshot(): string | null {
  return null;
}

export function JungianLandingActions() {
  const t = useTranslations("jungian");
  const latestCode = useSyncExternalStore(subscribeHistory, historySnapshot, historyServerSnapshot);

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={latestCode ? `/psychometrics/types/result?r=${latestCode}` : "/psychometrics?to=types"}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-hobun px-6 text-sm font-semibold text-ink-900 transition-transform hover:-translate-y-0.5"
      >
        {latestCode ? t("openSavedResult") : t("startTest")}
      </Link>
      <Link
        href="/psychometrics?to=types"
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink-600 px-6 text-sm text-hobun transition-colors hover:border-hobun"
      >
        {latestCode ? t("retakeTest") : t("whySameItems")}
      </Link>
    </div>
  );
}
