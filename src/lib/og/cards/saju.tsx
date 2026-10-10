import { getTranslations } from "next-intl/server";
import { pillarFromSexagenary, pillarLabel } from "@engine/saju";
import { STATUS_KEYS } from "@/components/ui/EvidenceStatusBadge";
import { analysisDefinition } from "@/lib/analysisCatalog";
import { ELEMENT_STYLE } from "@/lib/elements";
import type { OgCard } from "@/lib/og/cards/frame";
import { ELEMENT_HEX, HOBUN, HOBUN_DIM, HOBUN_FAINT } from "@/lib/og/theme";
import { SHARE_KIND_ANALYSIS_KEY } from "@/lib/shareMeta";
import type { SajuSummaryV1 } from "@/lib/shareCode";

/**
 * 사주 공유 카드 — 오행 색 세로 바 + 큰 세리프 한자 헤드라인, 래스터 삽화 없음.
 * 이미 배포된 src/lib/og/cards/sajuGuide.tsx와 같은 비주얼 패턴을 쓴다
 * (한자 글리프·삽화 부재 관련 확인 완료 사항도 동일하게 적용된다).
 */
export async function buildSajuOgCard(summary: SajuSummaryV1): Promise<OgCard> {
  const [tCommon, tSaju, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "saju" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.saju);
  const pillar = pillarFromSexagenary(summary.sexagenary);
  const headline = pillarLabel(pillar, "hanja");
  const elementStyle = ELEMENT_STYLE[summary.dominantElement];
  const elementName = summary.locale !== "ko" ? elementStyle.en : elementStyle.ko;
  const strengthLabel = tSaju(
    summary.strength === "strong" ? "strengthStrong" : summary.strength === "balanced" ? "strengthBalanced" : "strengthWeak",
  );
  const kicker = tShare("fallback.heroKicker");
  const subheadline = `${elementName} · ${strengthLabel}`;
  const accentColor = ELEMENT_HEX[summary.dominantElement];

  const centerContent = (
    <div style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", width: 8, height: 220, background: accentColor, borderRadius: 4 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>{kicker}</div>
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 96, lineHeight: 1.05, color: HOBUN }}>{headline}</div>
        <div style={{ display: "flex", fontFamily: "Sans", fontSize: 26, color: HOBUN_DIM }}>{subheadline}</div>
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("saju.footerNotice"),
    serifText: headline,
    sansText: `${kicker}${subheadline}`,
  };
}
