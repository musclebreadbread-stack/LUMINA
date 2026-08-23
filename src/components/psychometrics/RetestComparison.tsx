"use client";

import { computeBigFive, type BigFiveFactor } from "@engine/psychometrics";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { decodeResponses } from "@/lib/psychometricsCode";
import {
  previousDistinctResponses,
  savePsychometricsResult,
} from "@/lib/psychometricsHistory";

interface Props {
  readonly currentCode: string;
}

const FACTORS: readonly BigFiveFactor[] = [
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "emotionalStability",
  "intellect",
];

const subscribeHydration = (): (() => void) => () => undefined;
const getHydratedSnapshot = (): boolean => true;
const getServerHydratedSnapshot = (): boolean => false;

export function RetestComparison({ currentCode }: Props) {
  const t = useTranslations("psychometricsDeep");
  const tFactor = useTranslations("psychometrics");
  const locale = useLocale();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  useEffect(() => {
    const current = decodeResponses(currentCode);
    if (!current) return;
    savePsychometricsResult(current);
  }, [currentCode]);

  const previous = useMemo(
    () => (hydrated ? previousDistinctResponses(currentCode) : null),
    [currentCode, hydrated],
  );

  const currentResponses = useMemo(() => decodeResponses(currentCode), [currentCode]);
  const currentResult = useMemo(
    () => (currentResponses ? computeBigFive(currentResponses) : null),
    [currentResponses],
  );
  const previousResult = useMemo(
    () => (previous ? computeBigFive(previous.responses) : null),
    [previous],
  );

  if (!previous || !currentResult || !previousResult) return null;

  const completedAt = new Date(previous.entry.completedAt);
  const previousDate = Number.isNaN(completedAt.getTime())
    ? previous.entry.completedAt
    : new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(completedAt);

  return (
    <section
      data-testid="retest-comparison"
      className="mt-10 border border-ink-700 bg-ink-950/70 p-5 sm:p-7"
      aria-labelledby="retest-comparison-title"
    >
      <p className="font-mono text-[12px] tracking-[0.16em] text-hobun-faint">{t("retestKicker")}</p>
      <h2 id="retest-comparison-title" className="mt-3 text-lg font-medium text-hobun">
        {t("retestTitle")}
      </h2>
      <p className="mt-3 text-[13px] leading-relaxed text-hobun-dim">
        {t("retestBody", { date: previousDate })}
      </p>

      <div className="mt-6 grid gap-px border border-ink-800 bg-ink-800 sm:grid-cols-5">
        {FACTORS.map((factor) => {
          const current = currentResult.factors.find((item) => item.factor === factor);
          const before = previousResult.factors.find((item) => item.factor === factor);
          if (!current || !before) return null;
          const delta = current.rawSum - before.rawSum;
          const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;
          return (
            <div key={factor} className="bg-ink-900 px-3 py-4 text-center">
              <p className="text-[12px] text-hobun-faint">{tFactor(`factors.${factor}.label`)}</p>
              <p className="mt-2 font-mono text-xl text-hobun">
                {deltaLabel}
              </p>
              <p className="mt-1 text-[11px] text-hobun-faint">{t("retestDelta")}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-hobun-faint">
        {FACTORS.every((factor) => {
          const current = currentResult.factors.find((item) => item.factor === factor)?.rawSum;
          const before = previousResult.factors.find((item) => item.factor === factor)?.rawSum;
          return current === before;
        })
          ? t("retestNoChange")
          : t("retestCaution")}
      </p>
    </section>
  );
}
