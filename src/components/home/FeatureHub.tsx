import { getTranslations } from "next-intl/server";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { TierBadge } from "@/components/ui/Chrome";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { MANDALA_FEATURES } from "@/lib/mandalaModel";
import { FeaturePortal } from "./FeaturePortal";
import { SajuHubTrigger } from "./SajuHubTrigger";

export async function FeatureHub() {
  const t = await getTranslations("home");
  const saju = MANDALA_FEATURES.find((feature) => feature.key === "saju");
  if (!saju) throw new Error("Saju feature is missing from the home feature registry");
  const sajuDefinition = analysisDefinition("saju");
  const compatibility = analysisDefinition("compatibility");
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
          tierBadge={<TierBadge tier={sajuDefinition.tier} tone="light" />}
          evidenceStatus={<EvidenceStatusBadge status={sajuDefinition.evidence.validationStatus} tone="light" />}
          imageSrc={saju.imageSrc}
          imageAlt={t(saju.titleKey)}
          cta={t("portalOpen")}
          featured
        />
      
        {linkCards.map((card) => (
          (() => {
            const definition = analysisDefinition(card.key);
            return (
              <FeaturePortal
                key={card.key}
                href={definition.href}
                title={t(definition.titleKey)}
                desc={t(definition.descKey)}
                imageSrc={card.imageSrc}
                imageAlt={t(definition.titleKey)}
                tier={definition.tier}
                evidenceStatus={definition.evidence.validationStatus}
                label={t("portalLabel")}
                cta={t("portalCta")}
              />
            );
          })()
        ))}
        <FeaturePortal
          href={compatibility.href}
          title={t(compatibility.titleKey)}
          desc={t(compatibility.descKey)}
          imageSrc={saju.imageSrc}
          imageAlt={t(compatibility.titleKey)}
          tier={compatibility.tier}
          evidenceStatus={compatibility.evidence.validationStatus}
          label={t("portalLabel")}
          cta={t("portalCta")}
        />
      </div>
    </section>
  );
}
