import Image from "next/image";
import { LETTER_VALUES } from "@engine/numerology/constants";
import { getLocale, getTranslations } from "next-intl/server";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import type { NumberCardView } from "@/lib/numerologyModel";
import type { Locale } from "@/i18n/locale";

/**
 * 숫자 한 장.
 *
 * 사주는 한자, 점성술은 기호를 썼으니 수비학은 숫자 그 자체를 주인공으로 세운다 —
 * 큰 모노스페이스 자릿수로. 색은 쓰지 않는다. 마스터 넘버만 테두리를 하나 더
 * 둘러 "줄여지지 않은 값"이라는 사실을 조용히 표시한다.
 */
export async function NumberPlate({
  card,
  order,
}: {
  readonly card: NumberCardView;
  readonly order: number;
}) {
  const [t, tCommon] = await Promise.all([
    getTranslations("numerology"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;

  const title = t(card.kind === "lifePath" ? "lifePath" : "destiny");
  const gloss = locale === "en" ? card.meaning.glossEn : card.meaning.gloss;
  const keywords = locale === "en" ? card.meaning.keywordsEn : card.meaning.keywords;
  const note =
    card.kind === "lifePath"
      ? t("breakdownFormat", {
          year: card.breakdown.year,
          month: card.breakdown.month,
          day: card.breakdown.day,
        })
      : t("destinyFormat", { letters: card.lettersUsed, sum: card.rawSum });

  return (
    <div
      id={`calculation-numerology-${card.kind === "lifePath" ? "life-path" : "destiny"}`}
      className="card-flip-in flex flex-col items-center border border-ink-700 bg-ink-850/70 px-6 py-8 text-center"
      style={{
        animationDelay: `${140 + order * 140}ms`,
        boxShadow: "0 22px 44px -22px rgba(0,0,0,0.85), inset 0 1px 0 rgba(237,230,216,0.07)",
      }}
    >
      <p className="font-mono text-[13px] tracking-wide text-hobun-faint">{title}</p>

      <div className="relative mx-auto mt-4 aspect-[2/3] w-full max-w-[180px] overflow-hidden border border-ink-700 shadow-[0_18px_36px_-20px_rgba(0,0,0,0.9)]">
        <Image
          src={card.imageSrc}
          alt=""
          aria-hidden
          fill
          sizes="180px"
          className="object-cover"
        />
      </div>

      <div className="relative mt-4">
        {card.isMaster && (
          <span
            aria-hidden
            className="absolute -inset-3 border border-hobun/25"
            style={{ borderStyle: "dashed" }}
          />
        )}
        <span className="glyph tabular relative font-mono text-[clamp(3rem,10vw,4.5rem)] leading-none font-semibold text-hobun">
          {card.value}
        </span>
      </div>

      {card.isMaster && (
        <p className="mt-3 font-mono text-[12px] tracking-wide text-hobun-faint">{t("masterNumber")}</p>
      )}

      <p className="mt-4 text-sm text-hobun-dim">{gloss}</p>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {keywords.map((k) => (
          <span key={k} className="border border-ink-700 px-2 py-1 text-[13px] text-hobun-dim">
            {k}
          </span>
        ))}
      </div>

      <p className="tabular mt-5 border-t border-ink-700 pt-3 font-mono text-[13px] text-hobun-faint">
        {note}
      </p>

      <details className="mt-5 w-full border-t border-ink-700 pt-3 text-left">
        <summary className="cursor-pointer text-[13px] text-hobun-dim underline decoration-ink-600 underline-offset-4">
          {t("traceLabel")}
        </summary>
        {card.kind === "lifePath" ? (
          <div className="mt-3 space-y-3 font-mono text-[12px] leading-relaxed text-hobun-faint">
            {[
              { label: t("yearLabel"), steps: card.trace.year, fallback: card.breakdown.year },
              { label: t("monthLabel"), steps: card.trace.month, fallback: card.breakdown.month },
              { label: t("dayLabel"), steps: card.trace.day, fallback: card.breakdown.day },
              { label: t("lifePath"), steps: card.trace.total, fallback: card.value },
            ].map((entry) => (
              <div key={entry.label}>
                <p className="text-hobun-dim">{entry.label}</p>
                {entry.steps.length === 0 ? (
                  <p className="mt-1">{entry.fallback}</p>
                ) : (
                  entry.steps.map((step) => (
                    <p key={`${step.input}-${step.output}`} className="mt-1">
                      {step.input} → {step.digits.join("+")} = {step.output}
                      {step.stoppedAtMaster ? ` · ${t("masterNumber")}` : ""}
                    </p>
                  ))
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3 font-mono text-[12px] leading-relaxed text-hobun-faint">
            <div>
              <p className="font-sans text-[13px] text-hobun-dim">{t("letterTableLabel")}</p>
              <p className="mt-1 font-sans text-xs leading-relaxed text-hobun-faint">{t("letterTableNote")}</p>
              <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-9">
                {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((letter) => (
                  <span key={letter} className="border border-ink-800 px-1.5 py-1 text-center">
                    {letter}={LETTER_VALUES[letter] ?? "—"}
                  </span>
                ))}
              </div>
            </div>
            <p>{card.letterValues.map((item) => `${item.letter}=${item.value}`).join(" · ")}</p>
            {card.trace.length === 0 ? (
              <p>{card.rawSum}</p>
            ) : (
              card.trace.map((step) => (
                <p key={`${step.input}-${step.output}`}>
                  {step.input} → {step.digits.join("+")} = {step.output}
                  {step.stoppedAtMaster ? ` · ${t("masterNumber")}` : ""}
                </p>
              ))
            )}
          </div>
        )}
      </details>

      <div className="mt-2 w-full text-left">
        <ProgressiveBlock
          block={card.explanation}
          locale={locale}
          detailLabel={tCommon("explanationDetails")}
          methodLabel={tCommon("explanationMethod")}
          evidenceLabel={tCommon("evidenceView")}
          citationLabel={tCommon("citationLabel")}
        />
      </div>
    </div>
  );
}
