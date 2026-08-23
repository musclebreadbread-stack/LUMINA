import { getLocale, getTranslations } from "next-intl/server";
import { TEN_GODS, type TenGod } from "@engine/saju";
import type { ExplanationBlock } from "@engine/shared/explanation";
import { tenGodLabel } from "@/lib/reportModel";
import type { Locale } from "@/i18n/locale";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";

interface Props {
  readonly explanations: readonly ExplanationBlock[];
  readonly presentGods: readonly TenGod[];
}

/**
 * 십신 해설은 계산 결과와 분리된 문화적 해석 블록으로 렌더링한다.
 * 각 블록의 summary는 즉시 보이고 detail·method·출처는 사용자가 펼친다.
 */
export async function SajuInterpretationGuide({ explanations, presentGods }: Props) {
  const [t, tCommon] = await Promise.all([
    getTranslations("saju"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;
  const present = new Set(presentGods);
  const explanationFor = (god: TenGod) => explanations[TEN_GODS.indexOf(god)];
  const renderBlock = (block: ExplanationBlock, god: TenGod) => (
    <section key={block.id}>
      <h4 className="pt-4 text-sm text-hobun-dim">{tenGodLabel(god, locale)}</h4>
      <ProgressiveBlock
        block={block}
        locale={locale}
        detailLabel={tCommon("explanationDetails")}
        methodLabel={tCommon("explanationMethod")}
        evidenceLabel={tCommon("evidenceView")}
        citationLabel={tCommon("citationLabel")}
      />
    </section>
  );

  return (
    <div id="calculation-saju-tengods" className="mt-7 border-t border-ink-800 pt-5">
      <h3 className="text-sm font-medium text-hobun">{t("tenGodGuideTitle")}</h3>
      <p className="mt-3 text-[13px] leading-relaxed text-hobun-faint">{t("tenGodGuideBody")}</p>
      <div className="mt-3">
        {TEN_GODS.filter((god) => present.has(god))
          .map((god) => {
            const block = explanationFor(god);
            return block ? renderBlock(block, god) : null;
          })}
      </div>
      <details className="mt-6 border-t border-ink-800 pt-4">
        <summary className="cursor-pointer text-sm text-hobun-dim underline decoration-ink-600 underline-offset-4 hover:text-hobun">
          {t("tenGodDictionaryTitle")}
        </summary>
        <p className="mt-3 text-[13px] leading-relaxed text-hobun-faint">{t("tenGodDictionaryNote")}</p>
        <div className="mt-2">
          {TEN_GODS.map((god) => {
            const block = explanationFor(god);
            return block ? renderBlock(block, god) : null;
          })}
        </div>
      </details>
    </div>
  );
}
