"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ECR_ITEMS, type LikertScale } from "@engine/attachment/items";
import type { AttachmentResponse } from "@engine/attachment/scoring";
import { saveDraft, loadDraft, clearDraft } from "@/lib/attachmentDraft";
import { buildAttachmentView } from "@/lib/attachmentModel";
import { createAssessmentRun } from "@/lib/assessmentRun";
import { analysisDefinition } from "@/lib/analysisCatalog";
import type { Locale } from "@/i18n/locale";

export function SurveyForm() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations("attachment");
  const [responses, setResponses] = useState<AttachmentResponse>(() => {
    return loadDraft() || {};
  });
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      saveDraft(responses);
    }
  }, [responses]);

  const handleResponse = (itemId: number, value: LikertScale) => {
    const newResponses = { ...responses, [itemId]: value };
    setResponses(newResponses);

    // 자동 진행: 다음 문항으로
    if (currentItemIndex < ECR_ITEMS.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (Object.keys(responses).length !== ECR_ITEMS.length) {
      alert("모든 문항에 응답해주세요.");
      return;
    }

    const run = createAssessmentRun({
      methodKey: "attachment",
      instrumentVersion: analysisDefinition("attachment").evidence.instrumentVersion,
      locale,
      scoreSummary: buildAttachmentView(responses),
    });
    if (!run) {
      window.alert(t("storageError"));
      return;
    }

    clearDraft();
    router.push(`/attachment/result?run=${encodeURIComponent(run.id)}`);
  };

  const currentItem = ECR_ITEMS[currentItemIndex];
  const progress = (Object.keys(responses).length / ECR_ITEMS.length) * 100;
  const allAnswered = Object.keys(responses).length === ECR_ITEMS.length;

  return (
    <div className="space-y-6">
      {/* 진행률 표시줄 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-hobun-dim">
          <span>{currentItemIndex + 1} / {ECR_ITEMS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-hobun transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 현재 문항 */}
      <div className="border border-ink-700 rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-hobun-dim">문항 {currentItemIndex + 1}</p>
          <p className="text-lg leading-relaxed">{currentItem!.textKo}</p>
          <p className="text-sm text-hobun-dim">{currentItem!.textEn}</p>
        </div>

        {/* 5점 척도 선택지 */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleResponse(currentItem!.id, value as LikertScale)}
              className={`
                py-3 px-2 rounded-lg border-2 transition-all
                ${responses[currentItem!.id] === value
                  ? "border-hobun bg-hobun/20 text-hobun"
                  : "border-ink-700 hover:border-ink-600 text-hobun-dim"
                }
              `}
            >
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs mt-1">
                {value === 1 && "전혀 그렇지 않다"}
                {value === 2 && "그렇지 않다"}
                {value === 3 && "보통이다"}
                {value === 4 && "그렇다"}
                {value === 5 && "매우 그렇다"}
              </div>
            </button>
          ))}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between pt-4">
          <button
            onClick={handlePrevious}
            disabled={currentItemIndex === 0}
            className="px-4 py-2 text-sm text-hobun-dim hover:text-hobun disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← 이전
          </button>

          {currentItemIndex === ECR_ITEMS.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-6 py-2 bg-hobun text-ink-900 rounded-lg font-medium hover:bg-hobun-dim disabled:opacity-50 disabled:cursor-not-allowed"
            >
              결과 보기
            </button>
          ) : (
            <button
              onClick={() => setCurrentItemIndex(currentItemIndex + 1)}
              className="px-4 py-2 text-sm text-hobun-dim hover:text-hobun"
            >
              다음 →
            </button>
          )}
        </div>
      </div>

      {/* 전체 문항 목록 (접기/펼치기) */}
      <details className="border border-ink-700 rounded-lg">
        <summary className="p-4 cursor-pointer text-sm text-hobun-dim hover:text-hobun">
          전체 문항 보기 ({Object.keys(responses).length}/{ECR_ITEMS.length} 응답 완료)
        </summary>
        <div className="p-4 border-t border-ink-700 space-y-3 max-h-96 overflow-y-auto">
          {ECR_ITEMS.map((item, index) => (
            <div
              key={item.id}
              className={`
                p-3 rounded-lg border
                ${responses[item.id] ? "border-ink-600 bg-ink-850/50" : "border-ink-700"}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-hobun-dim whitespace-nowrap">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.textKo}</p>
                  {responses[item.id] && (
                    <p className="text-xs text-hobun-dim mt-1">
                      응답: {responses[item.id]}점
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
