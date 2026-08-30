import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import type { ScoreView } from "@/lib/eqModel";

/**
 * SSEIT 총점 카드.
 *
 * 원저자들은 단일 총점을 전제로 척도를 만들었고 규준·신뢰구간이 붙는 점수도 총점뿐이다 —
 * 그래서 하위요인 막대보다 앞자리에 두고, 신뢰구간을 점수와 같은 축 위에 함께 그린다.
 */
export async function TotalScoreCard({ total }: { readonly total: ScoreView }) {
  const t = await getTranslations("eq");
  const locale = (await getLocale()) as Locale;

  const minimum = total.itemCount;
  const maximum = total.itemCount * 5;
  const span = maximum - minimum;
  const toPercent = (value: number) => Math.max(0, Math.min(100, ((value - minimum) / span) * 100));
  const intervalStart = toPercent(total.reliability.ci95[0]);
  const intervalEnd = toPercent(total.reliability.ci95[1]);
  const intervalWidth = Math.max(1, intervalEnd - intervalStart);

  return (
    <div className="rounded-[1.25rem] border border-ink-700 bg-ink-950/70 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-hobun">{t("totalLabel")}</span>
        <span className="tabular font-mono text-[13px] text-hobun-faint">
          {t("rawSumLabel", { score: total.rawSum, max: maximum })}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-hobun-faint sm:grid-cols-2">
        <span>{t("meanLabel", { mean: total.mean.toFixed(1) })}</span>
        {total.norm ? (
          <>
            <span>{t("tScoreLabel", { score: total.norm.tScore.toFixed(1) })}</span>
            <span>{t("percentileLabel", { n: total.norm.percentile })}</span>
            <span>
              {t("normSample", {
                n: total.norm.sampleSize.toLocaleString(locale === "en" ? "en-US" : "ko-KR"),
              })}
            </span>
          </>
        ) : (
          <span>{t("normUnavailable")}</span>
        )}
        <span>{t("reliabilityLabel", { alpha: total.reliability.alpha.toFixed(2) })}</span>
        <span>
          {t("ci95Label", {
            low: total.reliability.ci95[0].toFixed(1),
            high: total.reliability.ci95[1].toFixed(1),
          })}
        </span>
      </div>

      <div className="relative mt-4 h-1.5 bg-ink-800">
        <div
          className="absolute inset-y-0 left-0 bg-hobun-dim"
          style={{ width: `${total.scalePosition}%` }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-3 -translate-y-1/2 border border-hobun bg-hobun/20"
          style={{ left: `${intervalStart}%`, width: `${intervalWidth}%` }}
        />
        <span aria-hidden className="absolute inset-y-[-3px] left-1/2 w-px bg-ink-600" />
        <span
          aria-hidden
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-hobun"
          style={{ left: `${total.scalePosition}%`, transform: "translate(-50%,-50%)" }}
        />
      </div>

      <div className="mt-2 flex justify-between gap-4 text-[13px] text-hobun-faint">
        <span>{minimum}</span>
        <span>{maximum}</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-hobun-faint">{t("totalNormNote")}</p>
    </div>
  );
}
