import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locale";
import type { FactorView } from "@/lib/psychometricsModel";

/**
 * 요인 막대.
 *
 * 사주·점성술의 원형·기울기 연출을 쓰지 않는다. 계측기 눈금처럼 평평하고
 * 곧게 — 과학적 검증 계층이라는 것을 화면의 절제로도 드러낸다.
 * 양끝에 저·고 경향을 나란히 적어, 점수가 우열이 아니라 방향임을 보인다.
 *
 * 요인 이름·저/고 글로스는 FACTOR_META(엔진)의 ko/en 짝을 뷰 모델이 그대로
 * 실어 보낸 것을 여기서 로케일에 맞춰 고른다 — messages 카탈로그의
 * psychometrics.factors.* 는 같은 내용을 중복으로 담고 있어(표시용 이름은
 * locale-neutral한 "label" 키로 정리되어 있다) 쓰지 않는다.
 * 사주 쪽 CharCell·dayMaster·termEntry가 전부 엔진의 ko/en 필드를 직접
 * 렌더하는 것과 같은 원칙을 따른 것이다.
 */
export async function FactorBar({ factor }: { readonly factor: FactorView }) {
  const t = await getTranslations("psychometrics");
  const td = await getTranslations("psychometricsDeep");
  const locale = (await getLocale()) as Locale;

  const name = locale === "en" ? factor.en : factor.ko;
  const lowGloss = locale === "en" ? factor.lowGlossEn : factor.lowGloss;
  const highGloss = locale === "en" ? factor.highGlossEn : factor.highGloss;
  const intervalStart = Math.max(0, Math.min(100, ((factor.reliability.ci95[0] - 10) / 40) * 100));
  const intervalEnd = Math.max(0, Math.min(100, ((factor.reliability.ci95[1] - 10) / 40) * 100));
  const intervalWidth = Math.max(1, intervalEnd - intervalStart);

  return (
    <div id={`calculation-psychometric-factor-${factor.key}`} className="border-b border-ink-800 py-5 last:border-b-0 scroll-mt-24">
      <div className="relative mb-4 aspect-[3/2] w-full max-w-[220px] overflow-hidden border border-ink-800">
        <Image src={factor.imageSrc} alt="" aria-hidden fill sizes="220px" className="object-cover" />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-hobun">{name}</span>
        <span className="tabular font-mono text-[13px] text-hobun-faint">
          {t("meanLabel", { mean: factor.mean.toFixed(1) })}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-hobun-faint sm:grid-cols-2">
        <span>{td("rawSumLabel", { score: factor.rawSum })}</span>
        {factor.norm ? (
          <>
            <span>{td("tScoreLabel", { score: factor.norm.tScore.toFixed(1) })}</span>
            <span>{td("percentileLabel", { n: factor.norm.percentile })}</span>
            <span>{factor.norm.normGroup === "all" ? td("normGroupAll") : td("normGroupAgeGender")}</span>
            <span>
              {td("normSample", {
                n: factor.norm.sampleSize.toLocaleString(locale === "en" ? "en-US" : "ko-KR"),
              })}
            </span>
          </>
        ) : (
          <span>{td("normUnavailable")}</span>
        )}
        <span>{td("reliabilityLabel", { alpha: factor.reliability.alpha.toFixed(2) })}</span>
        <span>{td("semLabel", { sem: factor.reliability.sem.toFixed(2) })}</span>
        <span>
          {td("ci95Label", {
            low: factor.reliability.ci95[0].toFixed(1),
            high: factor.reliability.ci95[1].toFixed(1),
          })}
        </span>
        <span>
          {td("consistencyLabel", {
            sd: factor.consistency.withinFactorSD.toFixed(2),
            rate: Math.round(factor.consistency.midpointRate * 100),
          })}
        </span>
      </div>

      <div className="relative mt-4 h-1.5 bg-ink-800">
        <div
          className="absolute inset-y-0 left-0 bg-hobun-dim"
          style={{ width: `${factor.scalePosition}%` }}
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
          style={{ left: `${factor.scalePosition}%`, transform: "translate(-50%,-50%)" }}
        />
      </div>

      <div className="mt-2 flex justify-between gap-4 text-[13px] text-hobun-faint">
        <span className="max-w-[46%]">{lowGloss}</span>
        <span className="max-w-[46%] text-right">{highGloss}</span>
      </div>

      <div className="mt-5 border-l border-ink-600 pl-3">
        <p className="font-mono text-[12px] text-hobun-faint">{td("itemResponseTitle")}</p>
        <ResponseList
          title={td("itemStrongTitle")}
          items={factor.strongestItems}
          locale={locale}
          formatResponse={(response, scored) => td("itemResponseFormat", { response, scored })}
          reverseLabel={td("reverseScored")}
        />
        <ResponseList
          title={td("itemWeakTitle")}
          items={factor.weakestItems}
          locale={locale}
          formatResponse={(response, scored) => td("itemResponseFormat", { response, scored })}
          reverseLabel={td("reverseScored")}
        />
        {factor.consistency.midpointRate >= 0.4 ? (
          <p className="mt-3 text-xs leading-relaxed text-hwa">
            {td("midpointCaution", { rate: Math.round(factor.consistency.midpointRate * 100) })}
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
