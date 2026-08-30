import { getLocale, getTranslations } from "next-intl/server";
import type { CognitiveOption, Item } from "@engine/cognitive/items";
import type { Locale } from "@/i18n/locale";
import { localizeExplanation, type ItemReview } from "@/lib/cognitiveModel";
import { ItemStimulus, OptionContent } from "./ItemStimulus";

/**
 * 문항 하나를 다시 펼쳐 보는 칸 — 이 화면에서 가장 오래 머물게 되는 자리다.
 *
 * 점수는 이 검사가 줄 수 있는 것이 거의 없지만(규준이 없다), 문항의 규칙은 전부 줄 수 있다.
 * 그래서 접히는 상자에 숨기지 않고 자극·내가 고른 답·정답·규칙을 한 칸에 펼쳐 둔다.
 * 맞힌 문항도 똑같이 펼친다 — 맞혔지만 이유를 몰랐던 경우가 오히려 배울 것이 많다.
 */

function isFigural(item: Item): boolean {
  return item.domain === "matrixReasoning" || item.domain === "threeDimensionalRotation";
}

function stimulusAltKey(item: Item): "matrixStimulusAlt" | "rotationStimulusAlt" {
  return item.domain === "matrixReasoning" ? "matrixStimulusAlt" : "rotationStimulusAlt";
}

function optionAltKey(item: Item): "matrixOptionAlt" | "rotationOptionAlt" {
  return item.domain === "matrixReasoning" ? "matrixOptionAlt" : "rotationOptionAlt";
}

function AnswerSlot({
  label,
  option,
  optionIndex,
  figureLabel,
  idPrefix,
  locale,
  figural,
  tone,
}: {
  readonly label: string;
  readonly option: CognitiveOption;
  readonly optionIndex: number;
  readonly figureLabel: string;
  readonly idPrefix: string;
  readonly locale: Locale;
  readonly figural: boolean;
  readonly tone: "correct" | "wrong";
}) {
  return (
    <div className={`border px-4 py-3 ${tone === "correct" ? "border-hobun-dim" : "border-ink-700"}`}>
      <p className="font-mono text-[12px] tracking-[0.14em] text-hobun-faint">{label}</p>
      <div
        className={`mt-2 flex items-center gap-3 text-sm text-hobun ${figural ? "flex-col items-start" : ""}`}
      >
        <span className="tabular shrink-0 font-mono text-xs text-hobun-faint">{optionIndex + 1}</span>
        <OptionContent
          option={option}
          locale={locale}
          figureLabel={figureLabel}
          idPrefix={idPrefix}
          maxWidth={figural ? 96 : undefined}
        />
      </div>
    </div>
  );
}

export async function ItemReviewCard({ review }: { readonly review: ItemReview }) {
  const [t, locale] = await Promise.all([getTranslations("cognitive"), getLocale()]);
  const resolvedLocale = locale as Locale;
  const { item } = review;
  const figural = isFigural(item);
  const idPrefix = `cog-review-${item.id}`;

  return (
    <li id={`review-item-${item.id}`} className="border border-ink-700 px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tabular font-mono text-[13px] text-hobun-faint">
          {t("itemLabel", { n: review.position })}
          <span className="mx-2 text-ink-600">·</span>
          {t(`domains.${review.domain}.label`)}
        </p>
        <p
          className={`font-mono text-[13px] ${review.isCorrect ? "text-hobun-dim" : "text-hwa"}`}
          data-item-correct={review.isCorrect}
        >
          {review.isCorrect ? t("itemCorrect") : t("itemIncorrect")}
        </p>
      </div>

      <div className="mt-4">
        <ItemStimulus
          item={item}
          locale={resolvedLocale}
          figureLabel={figural ? t(stimulusAltKey(item)) : ""}
          idPrefix={`${idPrefix}-stem`}
          maxWidth={figural ? 196 : undefined}
        />
      </div>

      <div className={`mt-4 grid gap-3 ${review.isCorrect ? "" : "sm:grid-cols-2"}`}>
        <AnswerSlot
          label={review.isCorrect ? t("yourAnswerCorrect") : t("yourAnswer")}
          option={review.chosenOption}
          optionIndex={review.chosenOptionIndex}
          figureLabel={figural ? t(optionAltKey(item), { n: review.chosenOptionIndex + 1 }) : ""}
          idPrefix={`${idPrefix}-chosen`}
          locale={resolvedLocale}
          figural={figural}
          tone={review.isCorrect ? "correct" : "wrong"}
        />
        {!review.isCorrect && (
          <AnswerSlot
            label={t("correctAnswer")}
            option={review.correctOption}
            optionIndex={review.correctOptionIndex}
            figureLabel={figural ? t(optionAltKey(item), { n: review.correctOptionIndex + 1 }) : ""}
            idPrefix={`${idPrefix}-correct`}
            locale={resolvedLocale}
            figural={figural}
            tone="correct"
          />
        )}
      </div>

      <div className="mt-4 border-l border-ink-600 pl-3">
        <p className="font-mono text-[12px] tracking-[0.14em] text-hobun-faint">{t("ruleLabel")}</p>
        <p className="mt-2 text-sm leading-relaxed text-hobun-dim">
          {localizeExplanation(review, resolvedLocale)}
        </p>
      </div>
    </li>
  );
}
