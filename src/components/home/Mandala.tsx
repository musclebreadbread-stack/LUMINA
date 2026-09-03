import { getLocale, getTranslations } from "next-intl/server";
import type { FiveElement } from "@engine/saju";
import { TierBadge } from "@/components/ui/Chrome";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { MandalaModel } from "@/lib/mandalaModel";
import { MandalaEnhanced } from "./MandalaEnhanced";
import { MandalaLiveClock } from "./MandalaLiveClock";
import { MandalaNode } from "./MandalaNode";

export interface MomentGlyphView {
  readonly mark: string;
  readonly stem: { readonly hanja: string; readonly element: FiveElement };
  readonly branch: { readonly hanja: string; readonly element: FiveElement };
}

export interface MomentSnapshot {
  readonly columns: readonly MomentGlyphView[];
  readonly clock: string;
  readonly trueSolar: string;
  readonly correction: number;
  readonly day: {
    readonly stem: { readonly hanja: string; readonly element: FiveElement };
    readonly branch: { readonly hanja: string; readonly element: FiveElement };
  };
}

interface Props {
  readonly model: MandalaModel;
  readonly moment: MomentSnapshot;
}

export async function Mandala({ model, moment }: Props) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  const moon = model.nodes.find((node) => node.planetKey === "moon");
  const mercury = model.nodes.find((node) => node.planetKey === "mercury");
  if (!moon || !mercury) throw new Error("Mandala requires moon and mercury nodes");

  const moonSign = locale === "en" ? moon.sign.en : moon.sign.ko;
  const mercuryStatus = mercury.retrograde ? t("mandalaRetrograde") : t("mandalaDirect");

  return (
    <section id="mandala" className="home-flow-section home-flow-mandala mt-8" aria-labelledby="mandala-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[13px] tracking-[0.12em] text-hobun-faint sm:text-sm sm:tracking-[0.18em]">{t("mandalaEyebrow")}</p>
          <h2 id="mandala-heading" className="mt-3 max-w-2xl text-[clamp(1.65rem,4vw,2.35rem)] leading-tight font-medium tracking-tight">
            {t("mandalaHeading")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("mandalaBody")}</p>
        </div>
        <span className="mandala-live-mark" aria-label={t("mandalaLiveLabel")}>● {t("mandalaLiveLabel")}</span>
      </div>

      <div className="mandala-stage scene preserve-3d mt-8" aria-label={t("mandalaStageLabel")}>
        <div className="mandala-rings" aria-hidden />
        <MandalaEnhanced model={model} />

        {model.nodes.map((node) => (
          <MandalaNode
            key={node.key}
            node={node}
            title={t(node.titleKey)}
            desc={t(node.descKey)}
            tierBadge={<TierBadge tier={node.tier} />}
            cta={node.key === "saju" ? t("portalOpen") : t("portalCta")}
          />
        ))}

        <div className="mandala-center" aria-label={`${t("momentLabel")}, ${moment.clock}`}>
          <p className="font-mono text-[11px] tracking-[0.18em] text-hobun-faint">{t("momentLabel")}</p>
          <div className="mandala-center-glyphs mt-3">
            {moment.columns.map((column) => (
              <span key={column.mark} className="mandala-center-column">
                <span className="font-mono text-[10px] text-hobun-faint">{column.mark}</span>
                <span className={`font-hanja text-2xl font-black ${ELEMENT_STYLE[column.stem.element].text}`}>
                  {column.stem.hanja}
                </span>
                <span className={`font-hanja text-2xl font-black ${ELEMENT_STYLE[column.branch.element].text}`}>
                  {column.branch.hanja}
                </span>
              </span>
            ))}
          </div>
          <MandalaLiveClock initialClock={moment.clock} />
        </div>
      </div>

      <p className="mandala-evidence mt-4" data-testid="mandala-evidence">
        {t("mandalaEvidence", { clock: moment.clock, moon: moonSign, mercury: mercuryStatus })}
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-hobun-faint">{t("mandalaLegend")}</p>

      <div className="mandala-print-summary" aria-label={t("mandalaPrintLabel")}>
        <p>{t("mandalaPrintLabel")}</p>
        <ul>
          {model.nodes.map((node) => (
            <li key={node.key}>
              {t(node.titleKey)} · {locale === "en" ? node.sign.en : node.sign.ko} {Math.round(node.degreeInSign)}°
              {node.retrograde ? " R" : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
