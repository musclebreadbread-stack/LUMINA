import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import type { FactorView } from "@/lib/eqModel";
import { eqImagePath } from "@/lib/psychometricsAssets";

export async function FactorBar({ factor }: { readonly factor: FactorView }) {
  const t = await getTranslations("eq");
  const locale = (await getLocale()) as Locale;

  const name = locale === "en" ? factor.en : factor.ko;
  const description = locale === "en" ? factor.descriptionEn : factor.descriptionKo;

  return (
    <div className="border-b border-ink-800 py-5 last:border-b-0">
      <div className="assessment-result-art reveal relative aspect-[16/9] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900/70">
        <MotionSafeImage
          src={eqImagePath(factor.key)}
          alt={t("factorImageAlt", { factor: name })}
          sizes="(min-width: 640px) 640px, 100vw"
          className="object-cover"
          fallbackLabel={name}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-hobun">{name}</span>
        <span className="tabular font-mono text-[13px] text-hobun-faint">
          {t("meanLabel", { mean: factor.mean.toFixed(1) })}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-hobun-dim">{description}</p>

      <div className="mt-4 grid gap-2 text-xs text-hobun-faint sm:grid-cols-2">
        <span>{t("rawSumLabel", { score: factor.rawSum, max: factor.itemCount * 5 })}</span>
        {/*
          하위요인은 출판된 평균·SD가 없어 norm이 항상 null이다. 이때 α는 "미보고" 표식인 0이라
          그대로 그리면 화면에 "α = 0.00"이 뜬다 — 없는 값을 0으로 보여 주느니 블록 자체를 감춘다.
        */}
        {factor.norm ? (
          <>
            <span>{t("tScoreLabel", { score: factor.norm.tScore.toFixed(1) })}</span>
            <span>{t("percentileLabel", { n: factor.norm.percentile })}</span>
            <span>{t("reliabilityLabel", { alpha: factor.reliability.alpha.toFixed(2) })}</span>
            <span>
              {t("ci95Label", {
                low: factor.reliability.ci95[0].toFixed(1),
                high: factor.reliability.ci95[1].toFixed(1),
              })}
            </span>
          </>
        ) : (
          <span>{t("subscaleNormUnavailable")}</span>
        )}
      </div>

      <div className="relative mt-4 h-1.5 bg-ink-800">
        <div
          className="absolute inset-y-0 left-0 bg-hobun-dim"
          style={{ width: `${factor.scalePosition}%` }}
        />
        <span aria-hidden className="absolute inset-y-[-3px] left-1/2 w-px bg-ink-600" />
        <span
          aria-hidden
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-hobun"
          style={{ left: `${factor.scalePosition}%`, transform: "translate(-50%,-50%)" }}
        />
      </div>

      <div className="mt-2 flex justify-between gap-4 text-[13px] text-hobun-faint">
        <span className="max-w-[46%]">{t("lowEnd")}</span>
        <span className="max-w-[46%] text-right">{t("highEnd")}</span>
      </div>

      <div className="mt-5 border-l border-ink-600 pl-3">
        <p className="font-mono text-[12px] text-hobun-faint">{t("itemResponseTitle")}</p>
        <ResponseList
          title={t("itemStrongTitle")}
          items={factor.strongestItems}
          locale={locale}
          formatResponse={(response, scored) => t("itemResponseFormat", { response, scored })}
          reverseLabel={t("reverseScored")}
        />
        <ResponseList
          title={t("itemWeakTitle")}
          items={factor.weakestItems}
          locale={locale}
          formatResponse={(response, scored) => t("itemResponseFormat", { response, scored })}
          reverseLabel={t("reverseScored")}
        />
        {factor.consistency.midpointRate >= 0.4 ? (
          <p className="mt-3 text-xs leading-relaxed text-hwa">
            {t("midpointCaution", { rate: Math.round(factor.consistency.midpointRate * 100) })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ResponseList({
  title,
  items,
  locale,
  formatResponse,
  reverseLabel,
}: {
  readonly title: string;
  readonly items: readonly FactorView["strongestItems"][number][];
  readonly locale: Locale;
  readonly formatResponse: (response: number, scored: number) => string;
  readonly reverseLabel: string;
}) {
  return (
    <div className="mt-3 first:mt-2">
      <p className="text-xs text-hobun-faint">{title}</p>
      <ul className="mt-1.5 space-y-2 text-xs leading-relaxed text-hobun-dim">
        {items.map((item) => (
          <li key={item.itemId}>
            <span className="mr-2 font-mono text-hobun-faint">#{item.itemId}</span>
            {locale === "en" ? item.textEn : item.textKo}
            <span className="ml-2 font-mono text-hobun-faint">
              {formatResponse(item.response, item.scoredResponse)}
            </span>
            {item.reverseScored ? <span className="ml-2 text-hobun-faint">({reverseLabel})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
