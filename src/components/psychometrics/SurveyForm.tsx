"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FACTORS, ITEMS, itemsOfFactor } from "@engine/psychometrics/items";
import { previewJungianAxes } from "@engine/psychometrics/jungian";
import { scoreItem, type LikertResponse } from "@engine/psychometrics/scoring";
import type { AnalysisKey } from "@engine/shared/evidence";
import { LikertItemList } from "@/components/assessment/LikertItemList";
import type { LikertScaleLabels } from "@/components/assessment/likert";
import { buildSegments } from "@/components/assessment/segments";
import { SurveyNotice } from "@/components/assessment/SurveyNotice";
import { SurveyProgressHeader } from "@/components/assessment/SurveyProgressHeader";
import { SurveyPagination } from "@/components/assessment/SurveyPagination";
import { SurveySegmentTrack } from "@/components/assessment/SurveySegmentTrack";
import { useUnansweredGuard } from "@/components/assessment/useUnansweredGuard";
import type { Locale } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { markCompletionArrival } from "@/lib/completionCinematic";
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
 *
 * 그 절제 안에서 재미를 만드는 방법은 장식이 아니라 계측의 밀도다. 응답할수록 요인 눈금과
 * MBTI 축 미리보기가 함께 움직이는 이 화면이 나머지 리커트 설문의 본이 됐고,
 * 공통 부품은 src/components/assessment/ 로 옮겨 네 설문이 같은 것을 쓴다.
 */

/** "to=types"면 이 응답이 향할 최종 결과는 jungian이지 psychometrics(빅파이브) 본체가 아니다. */
function resolveAnalysisKey(): AnalysisKey {
  return new URLSearchParams(window.location.search).get("to") === "types" ? "jungian" : "psychometrics";
}

const PAGE_SIZE = 10;

export function SurveyForm() {
  const router = useRouter();
  const t = useTranslations("psychometrics");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const draft = useSyncExternalStore(
    subscribePsychometricsDraft,
    getPsychometricsDraftSnapshot,
    getPsychometricsDraftServerSnapshot,
  );
  const [editedResponses, setEditedResponses] = useState<
    Partial<Record<number, LikertResponse>> | null
  >(null);
  const responses = editedResponses ?? draft;
  const [currentPage, setCurrentPage] = useState(0);
  const testStarted = useRef(false);

  function selectResponse(itemId: number, value: LikertResponse): void {
    if (!testStarted.current) {
      testStarted.current = true;
      track("test_start", { analysis: resolveAnalysisKey() });
    }
    const next = { ...responses, [itemId]: value };
    savePsychometricsDraft(next);
    setEditedResponses(next);
  }

  const answeredCount = Object.keys(responses).length;
  const firstUnanswered = useMemo(
    () => ITEMS.find((item) => responses[item.id] === undefined)?.id ?? null,
    [responses],
  );
  const { attempted, reportUnanswered } = useUnansweredGuard(firstUnanswered);
  const pageCount = Math.ceil(ITEMS.length / PAGE_SIZE);

  useEffect(() => {
    if (!attempted || firstUnanswered === null) return;
    document.getElementById(`item-${firstUnanswered}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [attempted, currentPage, firstUnanswered]);

  const itemViews = useMemo(
    () => ITEMS.map((item) => ({ id: item.id, text: locale === "en" ? item.textEn : item.textKo })),
    [locale],
  );
  const pageItems = useMemo(
    () => itemViews.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [currentPage, itemViews],
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
  const provisionalAxes = useMemo(() => previewJungianAxes(responses), [responses]);
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
      const index = ITEMS.findIndex((item) => responses[item.id] === undefined);
      if (index >= 0) setCurrentPage(Math.floor(index / PAGE_SIZE));
      reportUnanswered();
      return;
    }
    clearPsychometricsDraft();
    const isJungian = new URLSearchParams(window.location.search).get("to") === "types";
    const destination = isJungian ? "/psychometrics/types/result" : "/psychometrics/result";
    const analysisKey: AnalysisKey = isJungian ? "jungian" : "psychometrics";
    track("test_complete", { analysis: analysisKey });
    markCompletionArrival(analysisKey);
    router.push(`${destination}?r=${encodeResponses(responses as Record<number, LikertResponse>)}`);
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
        <div className="survey-jungian-preview mx-auto mt-4 hidden max-w-3xl sm:block" aria-label={t("jungianPreviewTitle")}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] tracking-[0.12em] text-hobun-faint">{t("jungianPreviewTitle")}</p>
            <span className="text-[11px] text-hobun-faint">{t("jungianPreviewNote")}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
      </SurveyProgressHeader>

      <LikertItemList
        items={pageItems}
        itemNumberOffset={currentPage * PAGE_SIZE}
        responses={responses}
        scaleLabels={scaleLabels}
        flagUnanswered={attempted}
        onSelect={selectResponse}
      />

      <SurveyPagination
        currentPage={currentPage}
        pageCount={pageCount}
        label={tCommon("surveyPage", { current: currentPage + 1, total: pageCount })}
        previousLabel={tCommon("surveyPrevious")}
        nextLabel={tCommon("surveyNext")}
        onPrevious={() => setCurrentPage((page) => Math.max(0, page - 1))}
        onNext={() => setCurrentPage((page) => Math.min(pageCount - 1, page + 1))}
      />

      {attempted && answeredCount < ITEMS.length && (
        <SurveyNotice message={t("unansweredWarning", { n: ITEMS.length - answeredCount })} />
      )}

      {currentPage === pageCount - 1 ? (
        <button
          type="submit"
          className="mt-8 bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
        >
          {t("submit")}
        </button>
      ) : null}
    </form>
  );
}
