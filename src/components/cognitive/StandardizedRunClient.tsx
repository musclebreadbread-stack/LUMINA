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
  }>;
}

export function StandardizedRunClient({ initialRun, locale, labels }: StandardizedRunClientProps) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const item = run.nextItem;
  const assignmentId = item?.assignmentId;

  useEffect(() => {
    if (item === null || run.status === "completed") router.replace(`/cognitive/result/${run.runId}`);
  }, [item, router, run.runId, run.status]);

  useEffect(() => {
    startedAt.current = assignmentId === undefined ? null : Date.now();
  }, [assignmentId]);

  if (item === null || run.status === "completed") return <p className="text-sm text-hobun-dim">{labels.invalid}</p>;
  const currentItem = item;

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
      setRun(response.run);
      setSelectedOptionId(null);
      startedAt.current = Date.now();
    }
    setPending(false);
  }

  return (
    <section className="space-y-6" aria-labelledby="standardized-item-title">
      <div className="flex items-center justify-between gap-4 border-b border-ink-700 pb-4">
        <p className="tabular font-mono text-sm text-hobun-faint">
          {labels.progress.replace("{answered}", String(run.answeredCount)).replace("{total}", String(run.targetItemCount))}
        </p>
        <div className="h-1 w-40 bg-ink-800" aria-hidden>
          <div className="h-1 bg-hobun-dim transition-[width]" style={{ width: `${(run.answeredCount / run.targetItemCount) * 100}%` }} />
        </div>
      </div>
      <article className="border border-ink-700 p-5 sm:p-8">
        <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">{currentItem.domain.toUpperCase()}</p>
        <h1 id="standardized-item-title" className="sr-only">{currentItem.ordinal}</h1>
        <div className="mt-5">
          <StandardizedStimulus stimulus={currentItem.stimulus} locale={locale} label={`${currentItem.ordinal}`} idPrefix={`run-${currentItem.assignmentId}-stem`} className="text-hobun" />
        </div>
        <fieldset className="mt-7 space-y-3">
          <legend className="sr-only">{labels.option}</legend>
          {currentItem.options.map((option, index) => (
            <label key={option.id} className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-hobun ${selectedOptionId === option.id ? "border-hobun bg-hobun text-ink-900" : "border-ink-700 text-hobun-dim"}`}>
              <input
                type="radio"
                name={`assignment-${currentItem.assignmentId}`}
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => setSelectedOptionId(option.id)}
                className="sr-only"
              />
              <span className="tabular font-mono text-xs opacity-70">{index + 1}</span>
              <StandardizedOptionContent option={option} locale={locale} figureLabel={`${labels.option} ${index + 1}`} idPrefix={`run-${currentItem.assignmentId}-option-${index}`} maxWidth={130} />
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={submit} disabled={selectedOptionId === null || pending} className="mt-7 min-h-11 bg-hobun px-5 py-2 text-sm font-medium text-ink-900 transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? "…" : labels.submit}
        </button>
      </article>
      {error !== null && <p role="alert" className="border-l border-hwa pl-3 text-sm text-hobun">{error}</p>}
    </section>
  );
}
