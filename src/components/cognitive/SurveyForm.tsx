"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DOMAINS, ITEMS, type Item } from "@engine/cognitive/items";
import type { Locale } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { markCompletionArrival } from "@/lib/completionCinematic";
import { encodeCognitiveResponses } from "@/lib/cognitiveCode";
import {
  getCognitiveDraftServerSnapshot,
  getCognitiveDraftSnapshot,
  saveCognitiveDraft,
  subscribeCognitiveDraft,
  withElapsed,
  withResponse,
  type CognitiveDraft,
} from "@/lib/cognitiveDraft";
import { ItemStimulus, OptionContent } from "./ItemStimulus";
import { useVisibleElapsed } from "./useVisibleElapsed";

/**
 * 인지능력 탐색 설문 — 한 화면에 한 문항.
 *
 * 자기보고 척도(EQ·SD3 등)는 긴 목록을 죽 훑는 편이 빠르지만, 정답이 있는 문항은 하나씩 봐야 한다.
 * 대신 애착 검사의 한 문항 방식과 달리 자동 진행을 넣지 않고 제출 전 확인 단계를 둔다 —
 * 되돌아가 고칠 수 없는 능력 검사는 그 자체로 벌처럼 느껴진다.
 *
 * 시간은 재되 압박하지 않는다. 제한도 카운트다운도 자동 제출도 없고, 권장 시간은 안내일 뿐이며
 * 진행 중에는 흐르는 초를 보여 주지 않는다. 기록된 시간은 확인 단계에서 정지된 값으로만 보인다.
 *
 * DOM 계약은 기존 설문 e2e와 같다 — 문항마다 <li id="item-{id}">, 그 안에 sr-only 라디오를
 * 감싼 <label>이 보기 순서대로 놓인다. 확인 단계에서는 16개가 한 화면에 모두 나온다.
 */

const REVIEW_STEP = ITEMS.length;

function optionGridClass(item: Item): string {
  if (item.domain === "verbalReasoning") return "grid-cols-1";
  if (item.domain === "letterNumberSeries") return "grid-cols-2 sm:grid-cols-4";
  return "grid-cols-2 sm:grid-cols-5";
}

function isFiguralOption(item: Item): boolean {
  return item.domain === "matrixReasoning" || item.domain === "threeDimensionalRotation";
}

function figureLabelKeyFor(item: Item): "matrixStimulusAlt" | "rotationStimulusAlt" {
  return item.domain === "matrixReasoning" ? "matrixStimulusAlt" : "rotationStimulusAlt";
}

function optionLabelKeyFor(item: Item): "matrixOptionAlt" | "rotationOptionAlt" {
  return item.domain === "matrixReasoning" ? "matrixOptionAlt" : "rotationOptionAlt";
}

interface ItemBlockProps {
  readonly item: Item;
  readonly index: number;
  readonly chosenIndex: number | undefined;
  readonly elapsedMs: number | undefined;
  readonly locale: Locale;
  readonly variant: "focus" | "review";
  readonly flagUnanswered: boolean;
  readonly onSelect: (itemId: number, optionIndex: number) => void;
}

function ItemBlock({
  item,
  index,
  chosenIndex,
  elapsedMs,
  locale,
  variant,
  flagUnanswered,
  onSelect,
}: ItemBlockProps) {
  const t = useTranslations("cognitive");
  const focused = variant === "focus";
  const unanswered = flagUnanswered && chosenIndex === undefined;
  const idPrefix = `cog-${variant}-${item.id}`;

  return (
    <li
      id={`item-${item.id}`}
      className={`border px-4 py-5 sm:px-5 ${unanswered ? "border-hwa/60" : "border-ink-700"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tabular font-mono text-[13px] text-hobun-faint">
          {t("itemLabel", { n: index + 1 })}
          <span className="mx-2 text-ink-600">·</span>
          {t(`domains.${item.domain}.label`)}
        </p>
        <p className="tabular font-mono text-[13px] text-hobun-faint">
          {t("recommendedTime", { seconds: item.recommendedSeconds })}
        </p>
      </div>

      <div className={focused ? "mt-5" : "mt-4"}>
        <ItemStimulus
          item={item}
          locale={locale}
          figureLabel={t(figureLabelKeyFor(item))}
          idPrefix={idPrefix}
          maxWidth={focused ? undefined : 176}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="sr-only">
          {t("itemLabel", { n: index + 1 })} — {t("optionsLabel")}
        </legend>
        <div className={`grid gap-2 ${optionGridClass(item)}`}>
          {item.options.map((option, optionIndex) => {
            const checked = chosenIndex === optionIndex;
            const figural = isFiguralOption(item);
            return (
              <label
                key={option.id}
                // 라디오가 sr-only라 포커스 링이 보이지 않는다. 능력 문항을 키보드로 훑는 사람에게
                // 지금 어느 보기에 서 있는지는 필수 정보이므로 테두리 쪽으로 링을 끌어올린다.
                className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hobun ${
                  figural ? "flex-col justify-center gap-2 text-center" : ""
                } ${
                  checked
                    ? "border-hobun bg-hobun text-ink-900"
                    : "border-ink-700 text-hobun-dim hover:border-ink-600"
                }`}
              >
                <input
                  type="radio"
                  name={`item-${item.id}`}
                  value={optionIndex}
                  checked={checked}
                  onChange={() => onSelect(item.id, optionIndex)}
                  className="sr-only"
                />
                <span className="tabular shrink-0 font-mono text-xs opacity-70">{optionIndex + 1}</span>
                <OptionContent
                  option={option}
                  locale={locale}
                  figureLabel={t(optionLabelKeyFor(item), { n: optionIndex + 1 })}
                  idPrefix={`${idPrefix}-o${optionIndex}`}
                  maxWidth={focused ? undefined : 84}
                />
              </label>
            );
          })}
        </div>
      </fieldset>

      {!focused && (
        <p className="tabular mt-3 font-mono text-[13px] text-hobun-faint">
          {elapsedMs === undefined
            ? t("elapsedNotMeasured")
            : t("elapsedItem", { seconds: Math.round(elapsedMs / 1000) })}
          {unanswered && <span className="ml-3 text-hwa">{t("unansweredMark")}</span>}
        </p>
      )}
    </li>
  );
}

export function SurveyForm() {
  const router = useRouter();
  const t = useTranslations("cognitive");
  const locale = useLocale() as Locale;

  const storedDraft = useSyncExternalStore(
    subscribeCognitiveDraft,
    getCognitiveDraftSnapshot,
    getCognitiveDraftServerSnapshot,
  );
  const [editedDraft, setEditedDraft] = useState<CognitiveDraft | null>(null);
  const draft = editedDraft ?? storedDraft;

  const [stepIndex, setStepIndex] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const testStarted = useRef(false);

  // 시간 누적은 효과 정리 시점에 일어난다. 그때 최신 초안을 봐야 이미 고른 답을 지우지 않는다.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  });

  const commitDraft = useCallback((next: CognitiveDraft) => {
    draftRef.current = next;
    saveCognitiveDraft(next);
    setEditedDraft(next);
  }, []);

  const accumulateElapsed = useCallback(
    (itemId: number, deltaMs: number) => {
      const next = withElapsed(draftRef.current, itemId, deltaMs);
      if (next === draftRef.current) return;
      commitDraft(next);
    },
    [commitDraft],
  );

  const selectOption = useCallback(
    (itemId: number, optionIndex: number) => {
      if (!testStarted.current) {
        testStarted.current = true;
        track("test_start", { analysis: "cognitive" });
      }
      commitDraft(withResponse(draftRef.current, itemId, optionIndex));
    },
    [commitDraft],
  );

  const isReview = stepIndex >= REVIEW_STEP;
  const currentItem = isReview ? undefined : ITEMS[stepIndex];
  useVisibleElapsed(currentItem?.id ?? null, accumulateElapsed);

  const answeredCount = useMemo(
    () => ITEMS.filter((item) => draft.responses[item.id] !== undefined).length,
    [draft],
  );
  const firstUnanswered = useMemo(
    () => ITEMS.find((item) => draft.responses[item.id] === undefined)?.id ?? null,
    [draft],
  );
  const answeredByDomain = useMemo(
    () =>
      DOMAINS.map((domain) => {
        const items = ITEMS.filter((item) => item.domain === domain);
        return {
          domain,
          answered: items.filter((item) => draft.responses[item.id] !== undefined).length,
          total: items.length,
        };
      }),
    [draft],
  );
  const totalElapsedMs = useMemo(
    () =>
      ITEMS.reduce((sum, item) => sum + (draft.elapsedMsByItem[item.id] ?? 0), 0),
    [draft],
  );
  const anyElapsedMeasured = useMemo(
    () => ITEMS.some((item) => draft.elapsedMsByItem[item.id] !== undefined),
    [draft],
  );

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();

    // 문항 화면에서 엔터를 눌러 폼이 제출되는 경우 — 곧장 결과로 보내지 않고 확인 단계로 옮긴다.
    if (!isReview) {
      setStepIndex(REVIEW_STEP);
      return;
    }

    if (answeredCount < ITEMS.length) {
      setAttempted(true);
      if (firstUnanswered !== null) {
        document
          .getElementById(`item-${firstUnanswered}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }

    // 초안을 지우지 않는다: 문항별 기록 시간은 URL에 싣지 않기로 했으므로(cognitiveCode.ts)
    // 이 브라우저의 초안이 그 값을 가진 유일한 곳이고, 결과 화면이 그것을 읽어 간다.
    track("test_complete", { analysis: "cognitive" });
    markCompletionArrival("cognitive");
    router.push(`/cognitive/result?r=${encodeCognitiveResponses(draft.responses)}`);
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
        <div className="mx-auto mt-3 grid max-w-3xl grid-cols-4 gap-1" aria-label={t("domainsLabel")}>
          {answeredByDomain.map(({ domain, answered, total }) => {
            const active = currentItem?.domain === domain;
            return (
              <span
                key={domain}
                role="img"
                className={`flex min-h-8 flex-col items-center justify-center gap-1 border px-1 py-1 ${
                  active ? "border-hobun-dim" : "border-ink-800"
                }`}
                aria-label={`${t(`domains.${domain}.label`)} ${answered}/${total}`}
              >
                <span className="tabular font-mono text-[12px] text-hobun-faint">
                  {answered}/{total}
                </span>
                <span aria-hidden className="h-px w-full bg-ink-800">
                  <span
                    className="block h-px bg-hobun-dim transition-[width] duration-300"
                    style={{ width: `${(answered / total) * 100}%` }}
                  />
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {currentItem ? (
        <>
          <ol className="mt-8" start={stepIndex + 1}>
            <ItemBlock
              item={currentItem}
              index={stepIndex}
              chosenIndex={draft.responses[currentItem.id]}
              elapsedMs={draft.elapsedMsByItem[currentItem.id]}
              locale={locale}
              variant="focus"
              flagUnanswered={false}
              onSelect={selectOption}
            />
          </ol>

          <p className="mt-4 border-l border-ink-600 pl-3 text-xs leading-relaxed text-hobun-faint">
            {t("timingNote")}
          </p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStepIndex((step) => Math.max(0, step - 1))}
              disabled={stepIndex === 0}
              className="min-h-11 px-4 py-2 text-sm text-hobun-dim transition-colors hover:text-hobun disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("previous")}
            </button>
            <button
              type="button"
              onClick={() => setStepIndex((step) => Math.min(REVIEW_STEP, step + 1))}
              className="min-h-11 bg-hobun px-5 py-2 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
            >
              {stepIndex === ITEMS.length - 1 ? t("toReview") : t("next")}
            </button>
          </div>
        </>
      ) : (
        <section className="mt-8">
          <h2 className="text-lg text-hobun">{t("reviewTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{t("reviewIntro")}</p>
          <p className="tabular mt-2 font-mono text-[13px] text-hobun-faint">
            {anyElapsedMeasured
              ? t("elapsedTotal", {
                  minutes: Math.floor(totalElapsedMs / 60000),
                  seconds: Math.round((totalElapsedMs % 60000) / 1000),
                })
              : t("elapsedNotMeasured")}
          </p>

          <ol className="mt-6 space-y-6">
            {ITEMS.map((item, index) => (
              <ItemBlock
                key={item.id}
                item={item}
                index={index}
                chosenIndex={draft.responses[item.id]}
                elapsedMs={draft.elapsedMsByItem[item.id]}
                locale={locale}
                variant="review"
                flagUnanswered={attempted}
                onSelect={selectOption}
              />
            ))}
          </ol>

          {attempted && answeredCount < ITEMS.length && (
            <p role="alert" className="mt-6 border-l border-hwa pl-3 text-xs text-hobun">
              {t("unansweredWarning", { n: ITEMS.length - answeredCount })}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStepIndex(ITEMS.length - 1)}
              className="min-h-11 px-4 py-2 text-sm text-hobun-dim transition-colors hover:text-hobun"
            >
              {t("backToItems")}
            </button>
            <button
              type="submit"
              className="min-h-11 bg-hobun px-6 py-3 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85"
            >
              {t("submit")}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
