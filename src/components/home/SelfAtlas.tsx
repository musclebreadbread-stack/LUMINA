import { getTranslations } from "next-intl/server";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";
import { IntegratedReportAtlasEntry } from "./IntegratedReportAtlasEntry";
import { SelfAtlasGrid, type AtlasSlot } from "./SelfAtlasGrid";

/**
 * 홈의 자기 탐색 지도 섹션.
 *
 * 칸 목록은 카탈로그에서 그대로 파생하므로 분석이 늘면 지도도 같이 늘어난다.
 * 제목·설명은 서버에서 번역하고, 브라우저에만 있는 탐색 기록은 작은 Client Island 가 입힌다.
 */
export async function SelfAtlas() {
  const t = await getTranslations("home");
  const slots: readonly AtlasSlot[] = ANALYSIS_CATALOG.map((definition) => ({
    key: definition.key,
    href: definition.href,
    title: t(definition.titleKey),
  }));

  return (
    <section
      id="atlas"
      className="home-flow-section home-flow-atlas mt-16 border-t border-ink-700 pt-12"
      aria-labelledby="atlas-heading"
    >
      <p className="font-mono text-sm tracking-[0.18em] text-hobun-faint">{t("atlasEyebrow")}</p>
      <h2
        id="atlas-heading"
        className="mt-3 text-[clamp(1.65rem,4vw,2.35rem)] leading-tight font-medium tracking-tight"
      >
        {t("atlasHeading")}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-hobun-dim">{t("atlasBody")}</p>

      <SelfAtlasGrid slots={slots} />

      <IntegratedReportAtlasEntry />

      <p className="mt-6 border-l border-ink-600 pl-4 text-xs leading-relaxed text-hobun-faint">
        {t("atlasPrivacy")}
      </p>
    </section>
  );
}
