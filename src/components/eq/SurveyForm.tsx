"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FACTORS, ITEMS, itemsOfFactor } from "@engine/eq/items";
import { scoreItem, type LikertResponse } from "@engine/eq/scoring";
import { LikertItemList } from "@/components/assessment/LikertItemList";
import type { LikertScaleLabels } from "@/components/assessment/likert";
import { buildSegments } from "@/components/assessment/segments";
import { SurveyNotice } from "@/components/assessment/SurveyNotice";
import { SurveyProgressHeader } from "@/components/assessment/SurveyProgressHeader";
import { SurveySegmentTrack } from "@/components/assessment/SurveySegmentTrack";
import { useUnansweredGuard } from "@/components/assessment/useUnansweredGuard";
import type { Locale } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { markCompletionArrival } from "@/lib/completionCinematic";
import { encodeResponses } from "@/lib/eqCode";
import {
  clearEqDraft,
  getEqDraftServerSnapshot,
  getEqDraftSnapshot,
  saveEqDraft,
  subscribeEqDraft,
} from "@/lib/eqDraft";

/**
 * SSEIT 설문지 (Schutte Self-Report Emotional Intelligence Test, 33문항).
 *
 * 문항은 요인별로 묶이지 않고 원문 번호 순서로 나온다 — 문헌과 문항 번호를 대조할 수 있어야
 * 역채점 문항(5·28·33)을 검증할 수 있기 때문이다. 진행 표시는 그래서 순서가 아니라 요인별로 센다.
 */

export function SurveyForm() {
  const router = useRouter();
  const t = useTranslations("eq");
  const locale = useLocale() as Locale;
  const draft = useSyncExternalStore(
    subscribeEqDraft,
    getEqDraftSnapshot,
    getEqDraftServerSnapshot,
  );
  const [editedResponses, setEditedResponses] = useState<
    Partial<Record<number, LikertResponse>> | null
  >(null);
  const responses = editedResponses ?? draft;
  const testStarted = useRef(false);

  function selectResponse(itemId: number, value: LikertResponse): void {
    if (!testStarted.current) {
      testStarted.current = true;
      track("test_start", { analysis: "eq" });
    }
    const next = { ...responses, [itemId]: value };
    saveEqDraft(next);
    setEditedResponses(next);
  }

  const answeredCount = Object.keys(responses).length;
  const firstUnanswered = useMemo(
    () => ITEMS.find((item) => responses[item.id] === undefined)?.id ?? null,
    [responses],
  );
  const { attempted, reportUnanswered } = useUnansweredGuard(firstUnanswered);

  const itemViews = useMemo(
    () => ITEMS.map((item) => ({ id: item.id, text: locale === "en" ? item.textEn : item.textKo })),
    [locale],
  );
  const segments = useMemo(
    () =>
      buildSegments(
        FACTORS.map((factor) => ({
          key: factor,
          label: t(`factors.${factor}.label`),
          items: itemsOfFactor(factor),
        })),
        responses,
        scoreItem,
      ),
    [responses, t],
  );
  const scaleLabels: LikertScaleLabels = {
    1: t("scale1"),
    2: t("scale2"),
    3: t("scale3"),
    4: t("scale4"),
    5: t("scale5"),
  };

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (answeredCount < ITEMS.length) {
      reportUnanswered();
      return;
    }
    clearEqDraft();
    track("test_complete", { analysis: "eq" });
    markCompletionArrival("eq");
    router.push(`/eq/result?r=${encodeResponses(responses as Record<number, LikertResponse>)}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <SurveyProgressHeader
        answered={answeredCount}
        total={ITEMS.length}
        completeLabel={t("allAnswered")}
      >
        <SurveySegmentTrack
          label={t("sectionFactors")}
          segments={segments}
          formatMean={(mean) => t("provisionalMean", { value: mean.toFixed(1) })}
        />
      </SurveyProgressHeader>

      <LikertItemList
        items={itemViews}
        responses={responses}
        scaleLabels={scaleLabels}
        flagUnanswered={attempted}
        onSelect={selectResponse}
      />

      {attempted && answeredCount < ITEMS.length && (
        <SurveyNotice message={t("unansweredWarning", { n: ITEMS.length - answeredCount })} />
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
