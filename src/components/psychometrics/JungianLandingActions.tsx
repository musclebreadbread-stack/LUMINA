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
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-hobun px-6 text-sm font-semibold text-ink-900 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-16px_rgba(18,16,13,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-900"
      >
        {latestCode ? t("openSavedResult") : t("startTest")}
      </Link>
      <Link
        href="/psychometrics?to=types"
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-ink-900/35 px-6 text-sm font-medium text-ink-900 transition-[border-color,background-color,box-shadow] hover:border-ink-900 hover:bg-ink-900/5 hover:shadow-[0_10px_22px_-18px_rgba(18,16,13,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-900"
      >
        {latestCode ? t("retakeTest") : t("whySameItems")}
      </Link>
    </div>
  );
}
