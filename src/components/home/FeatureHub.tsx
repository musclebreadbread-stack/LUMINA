import { getTranslations } from "next-intl/server";
import { TierBadge } from "@/components/ui/Chrome";
import { assetPath } from "@/lib/assets";
import { MANDALA_FEATURES } from "@/lib/mandalaModel";
import { FeaturePortal } from "./FeaturePortal";
import { SajuHubTrigger } from "./SajuHubTrigger";

export async function FeatureHub() {
  const t = await getTranslations("home");
  const saju = MANDALA_FEATURES.find((feature) => feature.key === "saju");
  if (!saju) throw new Error("Saju feature is missing from the home feature registry");
  const linkCards = MANDALA_FEATURES.filter((feature) => feature.key !== "saju");

  return (
    <section aria-labelledby="feature-hub-heading">
      <p className="font-mono text-sm tracking-wide text-hobun-faint">{t("hubEyebrow")}</p>
      <h2
        id="feature-hub-heading"
        className="mt-3 text-[clamp(1.5rem,4vw,2rem)] leading-tight font-medium tracking-tight text-hobun"
      >
        {t("hubHeading")}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("hubIntro")}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SajuHubTrigger
          glyph="四"
          title={t(saju.titleKey)}
          desc={t(saju.descKey)}
          tierBadge={<TierBadge tier="cultural" tone="light" />}
          imageSrc={saju.imageSrc}
          imageAlt={t(saju.titleKey)}
          cta={t("portalOpen")}
          featured
        />
      
        {linkCards.map((card) => (
          <FeaturePortal
            key={card.key}
            href={card.href}
            title={t(card.titleKey)}
            desc={t(card.descKey)}
            imageSrc={card.imageSrc}
            imageAlt={t(card.titleKey)}
            tier={card.tier}
            label={t("portalLabel")}
            cta={t("portalCta")}
          />
        ))}
        <FeaturePortal
          href="/compatibility"
          title={t("hubCompatibilityTitle")}
          desc={t("hubCompatibilityDesc")}
          imageSrc={assetPath("saju/zodiac", "dragon")}
          imageAlt={t("hubCompatibilityTitle")}
          tier="cultural"
          label={t("portalLabel")}
          cta={t("portalCta")}
        />
      </div>
    </section>
  );
}
