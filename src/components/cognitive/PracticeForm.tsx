"use client";

import { useState } from "react";

import type { Locale } from "@/i18n/locale";
import type { PracticeItem } from "@/server/cognitive/practiceItems";
import { OptionFigure } from "./figures/OptionFigure";
import { MatrixBoard } from "./figures/MatrixBoard";
import { SpatialSolid } from "./figures/SpatialSolid";

interface PracticeFormProps {
  readonly items: readonly PracticeItem[];
  readonly locale: Locale;
}

function stimulusLabel(locale: Locale, index: number): string {
  return locale === "ko" ? `연습 문항 ${index + 1} 자극` : `Practice item ${index + 1} stimulus`;
}

function optionLabel(locale: Locale, index: number): string {
  return locale === "ko" ? `선택지 ${index + 1} 도형` : `Option ${index + 1} figure`;
}

function renderStimulus(item: PracticeItem, locale: Locale, index: number) {
  const label = stimulusLabel(locale, index);
  if (item.stimulus.kind === "text") {
    return <p className="text-base leading-relaxed text-hobun">{locale === "ko" ? item.stimulus.textKo : item.stimulus.textEn}</p>;
  }
  if (item.stimulus.kind === "matrix") {
    return <MatrixBoard figure={item.stimulus} label={label} idPrefix={`practice-${index}-stem`} maxWidth={280} className="text-hobun" />;
  }
  return <SpatialSolid cubes={item.stimulus.cubes} label={label} idPrefix={`practice-${index}-stem`} maxWidth={220} className="text-hobun" />;
}

export function PracticeForm({ items, locale }: PracticeFormProps) {
  const [answers, setAnswers] = useState<Readonly<Record<string, string>>>({});
  const [revealed, setRevealed] = useState<Readonly<Record<string, boolean>>>({});

  function choose(itemId: string, optionId: string): void {
    setAnswers((previous) => ({ ...previous, [itemId]: optionId }));
    setRevealed((previous) => ({ ...previous, [itemId]: false }));
  }

  function reveal(itemId: string): void {
    setRevealed((previous) => ({ ...previous, [itemId]: true }));
  }

  return (
    <div className="space-y-8">
      {items.map((item, itemIndex) => {
        const answer = answers[item.id];
        const isRevealed = revealed[item.id] === true;
        const isCorrect = answer === item.correctOptionId;
        return (
          <section key={item.id} className="border border-ink-700 p-5" aria-labelledby={`${item.id}-title`}>
            <h2 id={`${item.id}-title`} className="text-lg text-hobun">
              {locale === "ko" ? `연습 ${itemIndex + 1}` : `Practice ${itemIndex + 1}`}
            </h2>
            <div className="mt-4">{renderStimulus(item, locale, itemIndex)}</div>
            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">{locale === "ko" ? "선택지" : "Options"}</legend>
              {item.options.map((option, optionIndex) => (
                <label key={option.id} className="flex min-h-11 cursor-pointer items-center gap-3 border border-ink-700 px-3 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hobun">
                  <input
                    type="radio"
                    name={`practice-${item.id}`}
                    value={option.id}
                    checked={answer === option.id}
                    onChange={() => choose(item.id, option.id)}
                    className="sr-only"
                  />
                  <span className="tabular font-mono text-xs text-hobun-faint">{optionIndex + 1}</span>
                  {option.figure === null ? (
                    <span className="text-sm text-hobun-dim">{locale === "ko" ? option.labelKo : option.labelEn}</span>
                  ) : (
                    <OptionFigure
                      figure={option.figure}
                      label={optionLabel(locale, optionIndex)}
                      idPrefix={`${item.id}-option-${optionIndex}`}
                      maxWidth={110}
                      className="text-hobun"
                    />
                  )}
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              data-role="explanation"
              disabled={answer === undefined}
              onClick={() => reveal(item.id)}
              className="mt-5 min-h-11 border border-hobun px-4 py-2 text-sm text-hobun transition-colors hover:bg-hobun hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {locale === "ko" ? "해설 보기" : "Show explanation"}
            </button>
            {isRevealed && (
              <p className="mt-4 border-l border-hobun pl-3 text-sm leading-relaxed text-hobun-dim" aria-live="polite">
                <span className="font-medium text-hobun">
                  {isCorrect ? (locale === "ko" ? "정답입니다. " : "Correct. ") : locale === "ko" ? "다시 살펴보세요. " : "Review the rule. "}
                </span>
                {locale === "ko" ? item.explanationKo : item.explanationEn}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
