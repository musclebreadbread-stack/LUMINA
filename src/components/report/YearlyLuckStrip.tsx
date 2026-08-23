import { getLocale, getTranslations } from "next-intl/server";
import { stageEvidenceRef } from "@engine/saju";
import { ELEMENT_STYLE } from "@/lib/elements";
import { stageLabel, tenGodLabel, type ReportView } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";

/** 기존 세운 계산을 1년짜리 카드 묶음으로 펼치는 서버 컴포넌트. */
export async function YearlyLuckStrip({ yearly }: { readonly yearly: ReportView["yearly"] }) {
  if (yearly.length === 0) return null;

  const [t, tCommon] = await Promise.all([
    getTranslations("saju"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;

  return (
    <div className="mt-8 border-t border-ink-700 pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium text-hobun">{t("yearlySection")}</h3>
        <span className="font-mono text-[12px] text-hobun-faint">{t("yearlyAside")}</span>
      </div>

      <div className="mt-4 grid gap-px bg-ink-700 sm:grid-cols-5">
        {yearly.map((row) => {
          const stemStyle = ELEMENT_STYLE[row.yearStemElement];
          const branchStyle = ELEMENT_STYLE[row.yearBranchElement];
          return (
            <article
              key={row.year}
              className={`bg-ink-850/70 px-3 py-4 ${
                row.isCurrent ? "ring-1 ring-inset ring-hobun/45" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="tabular font-mono text-[13px] text-hobun">{row.year}</span>
                {row.isCurrent && (
                  <span className="font-mono text-[11px] text-hobun-faint">{t("yearlyCurrent")}</span>
                )}
              </div>
              <div className="mt-3 font-hanja text-2xl leading-none font-black">
                <span className={`glyph glyph-inlay-sm ${stemStyle.text}`}>{row.yearHanja[0]}</span>
                <span className={`glyph glyph-inlay-sm ${branchStyle.text}`}>{row.yearHanja[1]}</span>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-hobun-faint">
                {tenGodLabel(row.stemTenGod, locale)} · {tenGodLabel(row.branchTenGod, locale)}
                <br />
                <a
                  href={`#calculation-${stageEvidenceRef(row.stage)}`}
                  title={tCommon("evidenceView")}
                  className="underline decoration-ink-700 underline-offset-2 hover:text-hobun"
                >
                  {stageLabel(row.stage, locale)}
                </a>
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-hobun-faint">
                {t("yearlyStartsAt", { year: row.year })}
              </p>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-hobun-faint">{t("yearlyInterpretation")}</p>
    </div>
  );
}
