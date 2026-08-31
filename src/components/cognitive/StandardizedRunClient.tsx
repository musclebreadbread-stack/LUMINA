"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/i18n/locale";
import type { RunSnapshot } from "@engine/cognitive-standardized/types";
import { submitCognitiveResponseAction } from "@/app/cognitive/actions";
import { StandardizedOptionContent, StandardizedStimulus } from "./ItemStimulus";

interface StandardizedRunClientProps {
  readonly initialRun: RunSnapshot;
  readonly locale: Locale;
  readonly labels: Readonly<{
    readonly progress: string;
    readonly submit: string;
    readonly invalid: string;
    readonly stale: string;
    readonly option: string;
    readonly timerNote: string;
  }>;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function StandardizedRunClient({ initialRun, locale, labels }: StandardizedRunClientProps) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleElapsedMs, setVisibleElapsedMs] = useState(0);
  const startedAt = useRef<number | null>(null);
  const item = run.nextItem;
  const assignmentId = item?.assignmentId;

  useEffect(() => {
    if (item === null || run.status === "completed") router.replace(`/cognitive/result/${run.runId}`);
  }, [item, router, run.runId, run.status]);

  useEffect(() => {
    startedAt.current = assignmentId === undefined ? null : Date.now();
  }, [assignmentId]);

  // 표시 전용 타이머 — 채점에는 쓰이지 않는다(elapsedMs 제출 로직과 별개). 탭이 보이지 않는
  // 동안은 세지 않아, 자리를 비운 시간까지 "생각한 시간"처럼 보여주지 않는다.
  useEffect(() => {
    if (assignmentId === undefined) return;
    let accumulated = 0;
    let segmentStart = document.visibilityState === "visible" ? performance.now() : null;

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        segmentStart = performance.now();
      } else if (segmentStart !== null) {
        accumulated += performance.now() - segmentStart;
        segmentStart = null;
        setVisibleElapsedMs(accumulated);
      }
    }

    const intervalId = window.setInterval(() => {
      if (segmentStart === null) return;
      setVisibleElapsedMs(accumulated + (performance.now() - segmentStart));
    }, 1000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [assignmentId]);

  if (item === null || run.status === "completed") return <p className="text-sm text-hobun-dim">{labels.invalid}</p>;
  const currentItem = item;
  const isVisualStimulus = currentItem.stimulus.kind !== "text";
  const stimulusMaxWidth = currentItem.stimulus.kind === "matrix" ? 360 : currentItem.stimulus.kind === "spatial" ? 340 : undefined;

  async function submit(): Promise<void> {
    if (selectedOptionId === null || pending) return;
    setPending(true);
    setError(null);
    const response = await submitCognitiveResponseAction({
      runId: run.runId,
      assignmentId: currentItem.assignmentId,
      optionId: selectedOptionId,
      elapsedMs: Math.max(0, Math.round(Date.now() - (startedAt.current ?? Date.now()))),
    }).catch(() => null);

    if (response === null) {
      setError(labels.invalid);
    } else if (response.error === "stale_assignment") {
      setError(labels.stale);
    } else if (response.error !== null) {
      setError(labels.invalid);
    } else if (response.run.status === "completed") {
      router.push(`/cognitive/result/${run.runId}`);
      return;
    } else {
      setVisibleElapsedMs(0);
      setRun(response.run);
      setSelectedOptionId(null);
      startedAt.current = Date.now();
    }
    setPending(false);
  }

  return (
    <section className="space-y-6" aria-labelledby="standardized-item-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-700 pb-4">
        <p className="tabular font-mono text-sm text-hobun-faint">
          {labels.progress.replace("{answered}", String(run.answeredCount)).replace("{total}", String(run.targetItemCount))}
        </p>
        <div
          className="h-1 w-40 bg-ink-800"
          role="progressbar"
          aria-valuenow={run.answeredCount}
          aria-valuemin={0}
          aria-valuemax={run.targetItemCount}
          aria-label={labels.progress.replace("{answered}", String(run.answeredCount)).replace("{total}", String(run.targetItemCount))}
        >
          <div className="h-1 bg-hobun-dim transition-[width]" style={{ width: `${(run.answeredCount / run.targetItemCount) * 100}%` }} />
        </div>
        <p className="tabular font-mono text-xs text-hobun-faint" aria-live="off">
          {formatElapsed(visibleElapsedMs)}
          <span className="ml-2 font-sans normal-case tracking-normal opacity-80">{labels.timerNote}</span>
        </p>
      </div>
      <article className="border border-ink-700 p-5 sm:p-8">
        <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">{currentItem.domain.toUpperCase()}</p>
        <h1 id="standardized-item-title" className="sr-only">{currentItem.ordinal}</h1>
        <div className={`mt-5 ${isVisualStimulus ? "flex min-h-64 items-center justify-center border border-ink-700 bg-ink-950/80 px-4 py-6 sm:min-h-72 sm:px-8 sm:py-8" : ""}`} data-figure-stage={isVisualStimulus ? "stimulus" : undefined}>
          <StandardizedStimulus stimulus={currentItem.stimulus} locale={locale} label={`${currentItem.ordinal}`} idPrefix={`run-${currentItem.assignmentId}-stem`} maxWidth={stimulusMaxWidth} className="text-hobun" />
        </div>
        <fieldset className="mt-7 space-y-3">
          <legend className="sr-only">{labels.option}</legend>
          {currentItem.options.map((option, index) => {
            const isVisualOption = option.figure !== null;
            const figureColor = selectedOptionId === option.id ? "text-ink-900" : "text-hobun";
            return (
              <label key={option.id} className={`flex cursor-pointer items-center gap-3 border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hobun ${isVisualOption ? "min-h-32 sm:min-h-36" : "min-h-12"} ${selectedOptionId === option.id ? "border-hobun bg-hobun text-ink-900" : "border-ink-700 text-hobun-dim"}`}>
                <input
                  type="radio"
                  name={`assignment-${currentItem.assignmentId}`}
                  value={option.id}
                  checked={selectedOptionId === option.id}
                  onChange={() => setSelectedOptionId(option.id)}
                  className="sr-only"
                />
                <span className="tabular font-mono text-xs opacity-70">{index + 1}</span>
                <span className={isVisualOption ? "flex min-w-0 flex-1 items-center justify-center" : "min-w-0 flex-1"} data-figure-option={isVisualOption ? index + 1 : undefined}>
                  <StandardizedOptionContent option={option} locale={locale} figureLabel={`${labels.option} ${index + 1}`} idPrefix={`run-${currentItem.assignmentId}-option-${index}`} maxWidth={isVisualOption ? 168 : undefined} className={isVisualOption ? figureColor : undefined} />
                </span>
              </label>
            );
          })}
        </fieldset>
        <button type="button" onClick={submit} disabled={selectedOptionId === null || pending} className="mt-7 min-h-11 bg-hobun px-5 py-2 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? "…" : labels.submit}
        </button>
      </article>
      {error !== null && <p role="alert" className="border-l border-hwa pl-3 text-sm text-hobun">{error}</p>}
    </section>
  );
}
