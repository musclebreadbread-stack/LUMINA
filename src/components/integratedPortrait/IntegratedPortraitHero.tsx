"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type {
  CharacterRecipeV1,
  PortraitArtworkKey,
  PortraitEligibility,
} from "@/lib/integratedPortrait/contracts";
import { portraitArtwork } from "@/lib/integratedPortrait/artwork";

interface IntegratedPortraitHeroProps {
  readonly recipe: CharacterRecipeV1;
  readonly eligibility: PortraitEligibility;
}

interface ArtworkFailureState {
  readonly recipeSeed: string;
  readonly keys: ReadonlySet<PortraitArtworkKey>;
}

const EMPTY_ARTWORK_KEYS: ReadonlySet<PortraitArtworkKey> = new Set();

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
  const [artworkFailureState, setArtworkFailureState] = useState<ArtworkFailureState>(() => ({
    recipeSeed: recipe.seed,
    keys: EMPTY_ARTWORK_KEYS,
  }));

  const failedArtworkKeys = artworkFailureState.recipeSeed === recipe.seed
    ? artworkFailureState.keys
    : EMPTY_ARTWORK_KEYS;

  const artworkKeys = recipe.artworkKeys.filter((key) => !failedArtworkKeys.has(key));
  const primaryArtworkKey = recipe.primaryArtworkKey && artworkKeys.includes(recipe.primaryArtworkKey)
    ? recipe.primaryArtworkKey
    : artworkKeys[0] ?? null;
  const markArtworkFailed = (key: PortraitArtworkKey): void => {
    setArtworkFailureState((current) => {
      const currentKeys = current.recipeSeed === recipe.seed ? current.keys : EMPTY_ARTWORK_KEYS;
      if (currentKeys.has(key)) return current;
      const next = new Set(currentKeys);
      next.add(key);
      return {
        recipeSeed: recipe.seed,
        keys: next,
      };
    });
  };

  return (
    <section className="integrated-portrait-hero" aria-labelledby="integrated-portrait-hero-heading">
      <div
        className={`integrated-character integrated-character-${recipe.backgroundLayer}`}
        data-testid="integrated-character"
        data-motion={motion}
        data-artwork-count={artworkKeys.length}
        data-primary-artwork={primaryArtworkKey ?? "fallback"}
      >
        {primaryArtworkKey ? (
          <div
            className="integrated-character-artwork-stage"
            data-testid="integrated-character-artwork"
            aria-label={t("artwork.stageLabel")}
          >
            <Image
              src={portraitArtwork(primaryArtworkKey).src}
              alt={t(`artwork.alt.${primaryArtworkKey}`)}
              fill
              sizes="(max-width: 639px) 100vw, 40vw"
              quality={78}
              loading="eager"
              className="integrated-character-artwork-primary"
              onError={() => markArtworkFailed(primaryArtworkKey)}
            />
            <span className="integrated-character-artwork-shade" aria-hidden="true" />
            <div
              className="integrated-character-artwork-strip"
              role="list"
              aria-label={t("artwork.stripLabel")}
            >
              {artworkKeys.map((key) => (
                <figure
                  key={key}
                  role="listitem"
                  className={`integrated-character-artwork-thumb ${key === primaryArtworkKey ? "is-primary" : ""}`}
                  data-artwork-key={key}
                  data-primary={key === primaryArtworkKey ? "true" : "false"}
                >
                  <Image
                    src={portraitArtwork(key).src}
                    alt=""
                    fill
                    sizes="48px"
                    quality={70}
                    loading={key === primaryArtworkKey ? "eager" : "lazy"}
                    className="integrated-character-artwork-thumb-image"
                    aria-hidden="true"
                    onError={() => markArtworkFailed(key)}
                  />
                  <figcaption className="sr-only">{t(`artwork.label.${key}`)}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : (
          <>
            <span className={`integrated-character-frame integrated-character-frame-${recipe.frameLayer}`} />
            <span className={`integrated-character-accent integrated-character-accent-${recipe.accentLayer}`} />
            <span className="integrated-character-core" />
          </>
        )}
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
