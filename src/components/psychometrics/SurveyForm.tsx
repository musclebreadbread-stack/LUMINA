"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ITEMS } from "@engine/psychometrics/items";
import { previewJungianAxes } from "@engine/psychometrics/jungian";
import type { LikertResponse } from "@engine/psychometrics/scoring";
import type { Locale } from "@/i18n/locale";
import { encodeResponses } from "@/lib/psychometricsCode";
import {
  clearPsychometricsDraft,
  getPsychometricsDraftServerSnapshot,
  getPsychometricsDraftSnapshot,
  savePsychometricsDraft,
  subscribePsychometricsDraft,
} from "@/lib/psychometricsDraft";

/**
 * IPIP-50 설문지.
 *
 * 계측기처럼 담백하게 둔다 — 사주·타로 화면의 장식(3D·글로우·움직임)을 여기엔
 * 쓰지 않는다. 신뢰 계층이 다르다는 것을 화면의 태도로도 보여 준다.
 */

const SCALE_VALUES: readonly LikertResponse[] = [1, 2, 3, 4, 5];
const FACTOR_ORDER = [
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "emotionalStability",
  "intellect",
] as const;

export function SurveyForm() {
  const router = useRouter();
  const t = useTranslations("psychometrics");
  const locale = useLocale() as Locale;
  const draft = useSyncExternalStore(
    subscribePsychometricsDraft,
    getPsychometricsDraftSnapshot,
    getPsychometricsDraftServerSnapshot,
  );
  const [editedResponses, setEditedResponses] = useState<
    Partial<Record<number, LikertResponse>> | null
  >(null);
  const [attempted, setAttempted] = useState(false);
  const responses = editedResponses ?? draft;

  function selectResponse(itemId: number, value: LikertResponse): void {
    const next = { ...responses, [itemId]: value };
    savePsychometricsDraft(next);
    setEditedResponses(next);
  }

  const answeredCount = Object.keys(responses).length;
  const firstUnanswered = useMemo(
    () => ITEMS.find((item) => responses[item.id] === undefined)?.id ?? null,
    [responses],
  );
  const answeredByFactor = useMemo(
    () =>
      FACTOR_ORDER.map((factor) => ({
        factor,
        answered: ITEMS.filter((item) => item.factor === factor && responses[item.id] !== undefined).length,
        total: ITEMS.filter((item) => item.factor === factor).length,
      })),
    [responses],
  );
  const provisionalAxes = useMemo(() => previewJungianAxes(responses), [responses]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (answeredCount < ITEMS.length) {
      setAttempted(true);
      if (firstUnanswered !== null) {
        document
          .getElementById(`item-${firstUnanswered}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }
    clearPsychometricsDraft();
    const destination = new URLSearchParams(window.location.search).get("to") === "types"
      ? "/psychometrics/types/result"
      : "/psychometrics/result";
    router.push(`${destination}?r=${encodeResponses(responses as Record<number, LikertResponse>)}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="sticky top-0 z-10 -mx-5 border-b border-ink-700 bg-ink-900/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="tabular font-mono text-[13px] text-hobun-faint">
            {answeredCount} / {ITEMS.length}
          </p>
          <div className="h-1 w-32 bg-ink-800 sm:w-48">
            <div
              className="h-1 bg-hobun-dim transition-[width] duration-300"
              style={{ width: `${(answeredCount / ITEMS.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="survey-factor-track mx-auto mt-3 grid max-w-3xl grid-cols-5 gap-1" aria-label={t("sectionFactors")}>
          {answeredByFactor.map(({ factor, answered, total }) => (
            <span
              key={factor}
              role="img"
              className="group relative flex min-h-7 items-center justify-center border border-ink-800 px-1"
              aria-label={`${t(`factors.${factor}.label`)} ${answered}/${total}`}
            >
              <span
                className="survey-factor-orb h-1.5 w-1.5 rounded-full bg-hobun-dim transition-[transform,background] duration-300 group-hover:scale-125"
                style={{ transform: `scale(${0.7 + (answered / Math.max(total, 1)) * 0.55})` }}
              />
              <span className="sr-only">{t(`factors.${factor}.label`)}</span>
            </span>
          ))}
        </div>
        <div className="survey-jungian-preview mx-auto mt-4 hidden max-w-3xl sm:block" aria-label={t("jungianPreviewTitle")}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{t("jungianPreviewTitle")}</p>
            <span className="text-[11px] text-hobun-faint">{t("jungianPreviewNote")}</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {provisionalAxes.map((axis) => (
              <div key={axis.axis} className="survey-axis-preview">
                <div className="flex items-center justify-between gap-1 text-[10px] text-hobun-faint">
                  <span>{t(`jungianAxes.${axis.axis}.label`)}</span>
                  <span>{Math.round(axis.answeredFactorRatio * 100)}%</span>
                </div>
                <div className="survey-axis-track mt-1" aria-hidden>
                  <span
                    className="survey-axis-marker"
                    style={{ transform: `translateX(${((axis.continuous + 100) / 2)}%)` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ol className="mt-8 space-y-6">
        {ITEMS.map((item, index) => {
          const unanswered = attempted && responses[item.id] === undefined;
          return (
            <li
              key={item.id}
              id={`item-${item.id}`}
              className={`border px-4 py-4 sm:px-5 ${
                unanswered ? "border-hwa/60" : "border-ink-700"
              }`}
            >
              <p className="text-sm text-hobun">
                <span className="tabular mr-2 font-mono text-[13px] text-hobun-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {locale === "en" ? item.textEn : item.textKo}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {SCALE_VALUES.map((value) => {
                  const checked = responses[item.id] === value;
                  return (
                    <label
                      key={value}
                      className={`flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 border px-1 py-2 text-center transition-colors ${
                        checked
                          ? "border-hobun bg-hobun text-ink-900"
                          : "border-ink-700 text-hobun-faint hover:border-ink-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`item-${item.id}`}
                        value={value}
                        checked={checked}
                        onChange={() => selectResponse(item.id, value)}
                        className="sr-only"
                      />
                      <span className="tabular font-mono text-xs">{value}</span>
                      <span className="hidden text-[12px] leading-tight sm:block">
                        {t(`scale${value}`)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      {attempted && answeredCount < ITEMS.length && (
        <p role="alert" className="mt-6 border-l border-hwa pl-3 text-xs text-hobun">
          {t("unansweredWarning", { n: ITEMS.length - answeredCount })}
        </p>
      )}

      <button
        type="submit"
        className="mt-8 bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
      >
        {t("submit")}
      </button>
    </form>
  );
}
