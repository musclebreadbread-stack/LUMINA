import { getLocale, getTranslations } from "next-intl/server";
import type { ExplanationBlock } from "@engine/shared/explanation";
import { ProgressiveBlock } from "@/components/ui/ProgressiveBlock";
import type { Locale } from "@/i18n/locale";
import type { AstroView } from "@/lib/astroModel";

interface Props {
  readonly planets: AstroView["planets"];
  readonly explanations: AstroView["explanations"];
}

function blockProps(
  block: ExplanationBlock,
  locale: Locale,
  common: Awaited<ReturnType<typeof getTranslations<"common">>>,
) {
  return {
    block,
    locale,
    detailLabel: common("explanationDetails"),
    methodLabel: common("explanationMethod"),
    evidenceLabel: common("evidenceView"),
    citationLabel: common("citationLabel"),
  } as const;
}

/** 실제 배치 10개를 먼저 보여 주고, 전체 사전은 한 번 더 펼쳐 보게 한다. */
export async function PlacementGuide({ planets, explanations }: Props) {
  const [t, common] = await Promise.all([
    getTranslations("astro"),
    getTranslations("common"),
  ]);
  const locale = (await getLocale()) as Locale;

  return (
    <div className="mt-7 border-t border-ink-800 pt-5">
      <h3 className="text-sm font-medium text-hobun">{t("interpretationTitle")}</h3>
      <p className="mt-3 text-[13px] leading-relaxed text-hobun-faint">{t("interpretationNote")}</p>
      <div className="mt-3">
        {planets.map((planet, index) => {
          const block = explanations.placements[index];
          if (!block) return null;
          const planetName = locale === "en" ? planet.en : planet.ko;
          const signName = locale === "en" ? planet.signEn : planet.signKo;
          return (
            <section key={planet.key}>
              <h4 className="pt-4 text-sm text-hobun-dim">
                {planet.symbol} {planetName} · {signName}
              </h4>
              <ProgressiveBlock {...blockProps(block, locale, common)} />
            </section>
          );
        })}
      </div>

      <details className="mt-7 border-t border-ink-800 pt-5">
        <summary className="cursor-pointer text-sm text-hobun-dim underline decoration-ink-600 underline-offset-4">
          {t("deepGuideTitle")}
        </summary>
        <div className="mt-3">
          <h4 className="pt-3 text-sm font-medium text-hobun">{t("planetDictionaryTitle")}</h4>
          {explanations.planets.map((block) => (
            <ProgressiveBlock key={block.id} {...blockProps(block, locale, common)} />
          ))}
          <h4 className="pt-7 text-sm font-medium text-hobun">{t("signDictionaryTitle")}</h4>
          {explanations.signs.map((block) => (
            <ProgressiveBlock key={block.id} {...blockProps(block, locale, common)} />
          ))}
          <h4 className="pt-7 text-sm font-medium text-hobun">{t("houseDictionaryTitle")}</h4>
          {explanations.houses.map((block) => (
            <ProgressiveBlock key={block.id} {...blockProps(block, locale, common)} />
          ))}
          <h4 className="pt-7 text-sm font-medium text-hobun">{t("aspectDictionaryTitle")}</h4>
          {explanations.aspects.map((block) => (
            <ProgressiveBlock key={block.id} {...blockProps(block, locale, common)} />
          ))}
        </div>
      </details>
    </div>
  );
}
