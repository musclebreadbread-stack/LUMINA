"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ECR_ITEMS, getAxisItems, scoreItem, type AttachmentAxis, type LikertScale } from "@engine/attachment/items";
import type { AttachmentResponse } from "@engine/attachment/scoring";
import { LikertItemList } from "@/components/assessment/LikertItemList";
import type { LikertScaleLabels } from "@/components/assessment/likert";
import { buildSegments } from "@/components/assessment/segments";
import { SurveyNotice } from "@/components/assessment/SurveyNotice";
import { SurveyProgressHeader } from "@/components/assessment/SurveyProgressHeader";
import { SurveyPagination } from "@/components/assessment/SurveyPagination";
import { SurveySegmentTrack } from "@/components/assessment/SurveySegmentTrack";
import { useUnansweredGuard } from "@/components/assessment/useUnansweredGuard";
import type { Locale } from "@/i18n/locale";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { track } from "@/lib/analytics";
import { createAssessmentRun } from "@/lib/assessmentRun";
import { markCompletionArrival } from "@/lib/completionCinematic";
import {
  clearAttachmentDraft,
  getAttachmentDraftServerSnapshot,
  getAttachmentDraftSnapshot,
  saveAttachmentDraft,
  subscribeAttachmentDraft,
} from "@/lib/attachmentDraft";
import { buildAttachmentView } from "@/lib/attachmentModel";
import { assessLikertResponseQuality } from "@/lib/responseQuality";

/**
 * 애착 설문지 (ECR-R 개념을 참고한 탐색용 36문항).
 *
 * 한 화면에 한 문항씩 넘기고 자동으로 진행하던 방식을 접고 나머지 자기보고 척도와 같은 목록형으로
 * 맞췄다 — 되돌아가 고치려면 지나온 문항을 다시 넘겨야 했고, 미응답 안내는 alert() 한 줄이라
 * 어느 문항이 비었는지 알 수 없었다. 정답이 있는 인지능력 검사만 한 화면 한 문항으로 남는다.
 *
 * 진행 표시·문항 목록·미응답 처리는 src/components/assessment/ 의 공통 부품을 쓴다.
 */

const AXES: readonly AttachmentAxis[] = ["anxiety", "avoidance"];
const PAGE_SIZE = 9;

export function SurveyForm() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("attachment");
  const tCommon = useTranslations("common");

  const draft = useSyncExternalStore(
    subscribeAttachmentDraft,
    getAttachmentDraftSnapshot,
    getAttachmentDraftServerSnapshot,
  );
  const [editedResponses, setEditedResponses] = useState<AttachmentResponse | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const responses = editedResponses ?? draft;
  const [currentPage, setCurrentPage] = useState(0);
  const testStarted = useRef(false);

  function selectResponse(itemId: number, value: LikertScale): void {
    if (!testStarted.current) {
      testStarted.current = true;
      track("test_start", { analysis: "attachment" });
    }
    const next: AttachmentResponse = { ...responses, [itemId]: value };
    saveAttachmentDraft(next);
    setEditedResponses(next);
  }

  const answeredCount = useMemo(
    () => ECR_ITEMS.filter((item) => responses[item.id] !== undefined).length,
    [responses],
  );
  const firstUnanswered = useMemo(
    () => ECR_ITEMS.find((item) => responses[item.id] === undefined)?.id ?? null,
    [responses],
  );
  const { attempted, reportUnanswered } = useUnansweredGuard(firstUnanswered);
  const pageCount = Math.ceil(ECR_ITEMS.length / PAGE_SIZE);

  useEffect(() => {
    if (!attempted || firstUnanswered === null) return;
    document.getElementById(`item-${firstUnanswered}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [attempted, currentPage, firstUnanswered]);

  const itemViews = useMemo(
    () => ECR_ITEMS.map((item) => ({ id: item.id, text: locale === "en" ? item.textEn : item.textKo })),
    [locale],
  );
  const pageItems = useMemo(
    () => itemViews.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [currentPage, itemViews],
  );
  const segments = useMemo(
    () =>
      buildSegments(
        AXES.map((axis) => ({
          key: axis,
          label: t(`axes.${axis}.label`),
          items: getAxisItems(axis),
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

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (answeredCount < ECR_ITEMS.length) {
      const index = ECR_ITEMS.findIndex((item) => responses[item.id] === undefined);
      if (index >= 0) setCurrentPage(Math.floor(index / PAGE_SIZE));
      reportUnanswered();
      return;
    }

    const run = createAssessmentRun({
      methodKey: "attachment",
      instrumentVersion: analysisDefinition("attachment").evidence.instrumentVersion,
      locale,
      scoreSummary: {
        ...buildAttachmentView(responses),
        responseQuality: assessLikertResponseQuality(Object.values(responses)),
      },
    });
    if (!run) {
      setStorageFailed(true);
      return;
    }

    setStorageFailed(false);
    clearAttachmentDraft();
    track("test_complete", { analysis: "attachment" });
    markCompletionArrival("attachment");
    router.push(`/attachment/result?run=${encodeURIComponent(run.id)}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <SurveyProgressHeader
        answered={answeredCount}
        total={ECR_ITEMS.length}
        completeLabel={t("allAnswered")}
      >
        <SurveySegmentTrack
          label={t("sectionAxes")}
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

      {attempted && answeredCount < ECR_ITEMS.length && (
        <SurveyNotice message={t("unansweredWarning", { n: ECR_ITEMS.length - answeredCount })} />
      )}
      {storageFailed && <SurveyNotice message={t("storageError")} />}

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
