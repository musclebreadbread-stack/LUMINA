"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { FACTORS, ITEMS, itemsOfFactor } from "@engine/darktriad/items";
import { scoreItem, type LikertResponse } from "@engine/darktriad/scoring";
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
import { encodeResponses } from "@/lib/darktriadCode";
import {
  clearDarkTriadDraft,
  getDarkTriadDraftServerSnapshot,
  getDarkTriadDraftSnapshot,
  saveDarkTriadDraft,
  subscribeDarkTriadDraft,
} from "@/lib/darktriadDraft";

const PAGE_SIZE = 9;

/**
 * 다크 트라이어드 설문지 (Short Dark Triad, 27문항).
 *
 * 계측기처럼 담백하게 둔다 — 과학적 검증 계층이라는 것을 화면의 절제로도 보여 준다.
 * 진행 표시·문항 목록·미응답 처리는 IPIP-50과 같은 부품을 쓴다(src/components/assessment/).
 */

export function SurveyForm() {
  const router = useRouter();
  const t = useTranslations("darktriad");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const draft = useSyncExternalStore(
    subscribeDarkTriadDraft,
    getDarkTriadDraftSnapshot,
    getDarkTriadDraftServerSnapshot,
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
      track("test_start", { analysis: "darktriad" });
    }
    const next = { ...responses, [itemId]: value };
    saveDarkTriadDraft(next);
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
    clearDarkTriadDraft();
    track("test_complete", { analysis: "darktriad" });
    markCompletionArrival("darktriad");
    router.push(`/darktriad/result?r=${encodeResponses(responses as Record<number, LikertResponse>)}`);
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
