import { getLocale, getTranslations } from "next-intl/server";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { ReportView } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";

/**
 * 오행 분포.
 *
 * 두 가지를 함께 보여준다 — 여덟 글자를 1점씩 센 값과, 지지 속 지장간을 월률분야
 * 일수로 나눠 담은 가중값이다. 둘은 자주 어긋나는데, 그 어긋남 자체가 정보다.
 * 원형 차트를 쓰지 않은 이유는 다섯 조각의 크기를 눈으로 비교하기 어렵기 때문이다.
 */

interface Props {
  readonly elements: ReportView["elements"];
  readonly characterCount?: number;
}

export async function ElementSpectrum({ elements }: Props) {
  const t = await getTranslations("saju");
  const locale = (await getLocale()) as Locale;
  const label = (el: (typeof elements.rows)[number]["element"]) =>
    locale === "en" ? ELEMENT_STYLE[el].en : ELEMENT_STYLE[el].ko;
  const gloss = (el: (typeof elements.rows)[number]["element"]) =>
    locale === "en" ? ELEMENT_STYLE[el].glossEn : ELEMENT_STYLE[el].gloss;

  const max = Math.max(...elements.rows.map((r) => r.weighted), 0.001);

  return (
    <div>
      {/* 가중 분포 띠 */}
      <div className="flex h-2 w-full overflow-hidden border border-ink-700">
        {elements.rows.map((row) => (
          <div
            key={row.element}
            style={{
              width: `${row.percent}%`,
              backgroundColor: ELEMENT_STYLE[row.element].cssVar,
            }}
            className="h-full"
          />
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {elements.rows.map((row) => {
          const style = ELEMENT_STYLE[row.element];
          const absent = row.simple === 0;
          return (
            <li key={row.element} className="flex items-center gap-3">
              <span
                className={`font-hanja w-6 shrink-0 text-lg leading-none ${style.text} ${
                  absent ? "opacity-35" : ""
                }`}
              >
                {style.hanja}
              </span>
              <span
                className={`w-14 shrink-0 text-xs ${absent ? "text-hobun-faint" : "text-hobun-dim"}`}
              >
                {label(row.element)}
                {/* 한글 설명은 좁은 화면에서 라벨 열을 짓누른다 — 넓은 화면에서만 */}
                <span className="ml-1 hidden text-hobun-faint xl:inline">{gloss(row.element)}</span>
              </span>

              <span className="h-0.5 flex-1 bg-ink-800">
                <span
                  className="block h-0.5"
                  style={{
                    width: `${(row.weighted / max) * 100}%`,
                    backgroundColor: style.cssVar,
                  }}
                />
              </span>

              <span className="tabular w-16 shrink-0 text-right font-mono text-xs text-hobun-dim">
                {row.weighted.toFixed(2)}
              </span>
              <span className="tabular w-9 shrink-0 text-right font-mono text-xs text-hobun-faint">
                {t("charCount", { n: row.simple })}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 border-t border-ink-700 pt-3 text-xs leading-relaxed text-hobun-dim">
        {t("dominantNote", {
          element: label(elements.dominant),
          hanja: ELEMENT_STYLE[elements.dominant].hanja,
        })}{" "}
        {elements.missing.length > 0 ? (
          <>
            {t("missingPrefix")}
            {elements.missing.map((el, i) => (
              <span key={el}>
                {i > 0 && "·"}
                <span className={ELEMENT_STYLE[el].text}>{label(el)}</span>
              </span>
            ))}
            {t("missingSuffix")}
          </>
        ) : (
          t("allPresentNote")
        )}
      </p>
    </div>
  );
}
