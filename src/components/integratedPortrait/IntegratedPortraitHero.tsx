"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { CharacterRecipeV1, PortraitEligibility } from "@/lib/integratedPortrait/contracts";

interface IntegratedPortraitHeroProps {
  readonly recipe: CharacterRecipeV1;
  readonly eligibility: PortraitEligibility;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

/** 대표 장식은 점수를 시각적으로 번역하지 않고, 완료한 렌즈 조합에서만 결정한다. */
export function IntegratedPortraitHero({ recipe, eligibility }: IntegratedPortraitHeroProps) {
  const t = useTranslations("integratedPortrait");
  const reducedMotion = useReducedMotion();
  const motion = reducedMotion ? "reduced" : recipe.motionVariant;

  return (
    <section className="integrated-portrait-hero" aria-labelledby="integrated-portrait-hero-heading">
      <div
        className={`integrated-character integrated-character-${recipe.backgroundLayer}`}
        data-testid="integrated-character"
        data-motion={motion}
        aria-hidden="true"
      >
        <span className={`integrated-character-frame integrated-character-frame-${recipe.frameLayer}`} />
        <span className={`integrated-character-accent integrated-character-accent-${recipe.accentLayer}`} />
        <span className="integrated-character-core" />
      </div>

      <div className="integrated-portrait-hero-copy">
        <p className="font-mono text-[12px] tracking-[0.2em] text-hobun-faint">
          {t("hero.eyebrow")}
        </p>
        <h2
          id="integrated-portrait-hero-heading"
          className="mt-3 text-[clamp(1.8rem,5vw,3.2rem)] leading-[1.06] font-semibold tracking-[-0.045em] text-hobun"
        >
          {t("hero.title")}
        </h2>
        <p data-testid="integrated-portrait-line" className="mt-5 max-w-xl text-[15px] leading-relaxed text-hobun-dim">
          {t("hero.line", {
            analyses: eligibility.distinctAnalysisCount,
            perspectives: eligibility.scientificProvenanceCount,
          })}
        </p>
        <p className="mt-4 max-w-xl border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">
          {t("hero.limit")}
        </p>
      </div>
    </section>
  );
}
