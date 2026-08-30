import { getTranslations } from "next-intl/server";
import { FACTOR_META } from "@engine/psychometrics/meta";
import { FACTORS as BIGFIVE_FACTORS, type BigFiveFactor } from "@engine/psychometrics/items";
import { STATUS_KEYS } from "@/components/ui/EvidenceStatusBadge";
import { analysisDefinition } from "@/lib/analysisCatalog";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import { SHARE_KIND_ANALYSIS_KEY } from "@/lib/shareMeta";
import type { BigFiveSummaryV1 } from "@/lib/shareCode";

/**
 * Big Five 공유 카드의 가운데 콘텐츠.
 *
 * jungian.tsx와 같은 뼈대(kicker + Serif 헤드라인 + Sans 막대 + 삽화)를 쓴다 —
 * 다섯 요인 중 T점수가 가장 높은 요인의 이름을 헤드라인으로, 그 요인의 삽화를
 * 오른쪽에 싣는다. T점수는 항상 0..100로 인코딩되므로(shareCode.ts FIELD_SPECS)
 * 트랙 채움 비율 계산에 별도 클램프가 필요 없다.
 */

const TRACK_WIDTH = 300;
const ILLUSTRATION_WIDTH = 300;
const ILLUSTRATION_HEIGHT = 430;

interface FactorBarDatum {
  readonly factor: BigFiveFactor;
  readonly tScore: number;
  readonly label: string;
}

export async function buildBigFiveOgCard(summary: BigFiveSummaryV1): Promise<OgCard> {
  const [tCommon, tPsychometrics, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "psychometrics" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.bigfive);
  const byFactor = new Map(summary.factors.map((entry) => [entry.factor, entry.tScore] as const));

  const bars: readonly FactorBarDatum[] = BIGFIVE_FACTORS.map((factor) => ({
    factor,
    tScore: byFactor.get(factor) ?? 50,
    label: summary.locale === "en" ? FACTOR_META[factor].en : FACTOR_META[factor].ko,
  }));

  const topFactor = bars.reduce((top, bar) => (bar.tScore > top.tScore ? bar : top));
  const illustration = await loadOgPng(`psychometrics/factors/${topFactor.factor}.png`);
  const kicker = tPsychometrics("kicker");

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 48,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {kicker}
        </div>

        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 64, lineHeight: 1.1, color: HOBUN }}>
          {topFactor.label}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {bars.map((bar) => {
            const fillWidth = Math.max(2, (bar.tScore / 100) * TRACK_WIDTH);
            return (
              <div key={bar.factor} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 150, color: HOBUN_DIM, fontSize: 16, fontFamily: "Sans" }}>
                  {bar.label}
                </div>
                <div style={{ display: "flex", flexDirection: "row", width: TRACK_WIDTH, height: 8, borderRadius: 4, background: INK_LINE }}>
                  <div style={{ display: "flex", width: fillWidth, height: 8, borderRadius: 4, background: HOBUN }} />
                </div>
                <div style={{ display: "flex", width: 40, justifyContent: "flex-end", color: HOBUN_DIM, fontSize: 16, fontFamily: "Sans" }}>
                  {Math.round(bar.tScore)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: ILLUSTRATION_WIDTH,
          height: ILLUSTRATION_HEIGHT,
          borderRadius: 28,
          overflow: "hidden",
          border: `1px solid ${INK_LINE}`,
        }}
      >
        {illustration ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og)는 next/image를 지원하지 않는다.
          <img
            src={illustration}
            alt=""
            width={ILLUSTRATION_WIDTH}
            height={ILLUSTRATION_HEIGHT}
            style={{ objectFit: "cover", width: ILLUSTRATION_WIDTH, height: ILLUSTRATION_HEIGHT }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Serif",
              fontSize: 48,
              color: HOBUN_FAINT,
            }}
          >
            {topFactor.label}
          </div>
        )}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("bigfive.footerNotice"),
    serifText: topFactor.label,
    // 막대 옆 숫자(0-9)는 어떤 로케일의 kicker/라벨에도 안 나올 수 있어, 폰트
    // 서브셋 선택이 놓치지 않도록 명시적으로 sansText에 포함시킨다.
    sansText: `${kicker}${bars.map((bar) => bar.label).join("")}${bars.map((bar) => Math.round(bar.tScore)).join(" ")}`,
  };
}
