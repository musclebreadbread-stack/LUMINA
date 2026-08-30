import { getTranslations } from "next-intl/server";
import type { AnalysisDefinition, AnalysisKey } from "@engine/shared/evidence";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { TierBadge } from "@/components/ui/Chrome";
import { groupAnalyses } from "@/lib/analysisGroups";
import { assetPath } from "@/lib/assets";
import { MANDALA_FEATURES } from "@/lib/mandalaModel";
import { ExploredMark } from "./ExploredMark";
import { FeaturePortal } from "./FeaturePortal";
import { SajuHubTrigger } from "./SajuHubTrigger";

/** 만다라에 오르지 않는 두 분석(점성술·궁합)의 카드 아트. 나머지는 만다라 설정에서 가져온다. */
const OFF_MANDALA_IMAGES: Readonly<Partial<Record<AnalysisKey, string>>> = Object.freeze({
  astro: assetPath("astro", "hub"),
  compatibility: assetPath("compatibility", "hub"),
});

function cardImage(key: AnalysisKey): string {
  const mandala = MANDALA_FEATURES.find((feature) => feature.key === key);
  // 새 분석이 아트 없이 추가돼도 카드가 깨지지 않도록 사주 아트로 떨어뜨린다.
  return mandala?.imageSrc ?? OFF_MANDALA_IMAGES[key] ?? assetPath("saju/zodiac", "dragon");
}

/**
 * 탐구 방법 허브.
 *
 * 카탈로그를 계층·목적으로 나눈 묶음 순서 그대로 그린다 — 과학 계층이 먼저 오고,
 * 각 묶음의 머리말이 "이건 어떤 종류의 앎인가"를 먼저 말한다. 손으로 예외를 끼워 넣는
 * 자리는 남기지 않는다(예전 궁합 카드가 그랬다).
 */
export async function FeatureHub() {
  const t = await getTranslations("home");
  const groups = groupAnalyses().filter((group) => group.analyses.length > 0);

  function renderCard(definition: AnalysisDefinition) {
    const mark = <ExploredMark analysisKey={definition.key} label={t("hubExploredMark")} />;

    if (definition.key === "saju") {
      return (
        <SajuHubTrigger
          key={definition.key}
          glyph="四"
          title={t(definition.titleKey)}
          desc={t(definition.descKey)}
          tierBadge={<TierBadge tier={definition.tier} tone="light" />}
          evidenceStatus={
            <EvidenceStatusBadge status={definition.evidence.validationStatus} tone="light" />
          }
          imageSrc={cardImage(definition.key)}
          imageAlt={t(definition.titleKey)}
          cta={t("portalOpen")}
          mark={mark}
          featured
        />
      );
    }

    return (
      <FeaturePortal
        key={definition.key}
        href={definition.href}
        title={t(definition.titleKey)}
        desc={t(definition.descKey)}
        imageSrc={cardImage(definition.key)}
        imageAlt={t(definition.titleKey)}
        tier={definition.tier}
        evidenceStatus={definition.evidence.validationStatus}
        label={t("portalLabel")}
        cta={t("portalCta")}
        mark={mark}
      />
    );
  }

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

      <div className="mt-10 space-y-12">
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`hub-group-${group.key}`}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3 border-t border-ink-800 pt-6">
              <h3
                id={`hub-group-${group.key}`}
                className="text-[clamp(1.15rem,3vw,1.45rem)] leading-tight font-medium tracking-tight text-hobun"
              >
                {t(group.titleKey)}
              </h3>
              <TierBadge tier={group.tier} />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">
              {t(group.descKey)}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.analyses.map((definition) => renderCard(definition))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
