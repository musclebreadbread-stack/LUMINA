import { getTranslations } from "next-intl/server";
import { FACTORS as DARKTRIAD_FACTORS, type DarkTriadFactor } from "@engine/darktriad/items";
import { STATUS_KEYS } from "@/components/ui/EvidenceStatusBadge";
import { analysisDefinition } from "@/lib/analysisCatalog";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import { SHARE_KIND_ANALYSIS_KEY } from "@/lib/shareMeta";
import type { DarkTriadSummaryV1 } from "@/lib/shareCode";

/**
 * Dark Triad 공유 카드의 가운데 콘텐츠.
 *
 * bigfive.tsx와 같은 "kicker + Serif 헤드라인 + Sans 막대" 뼈대를 쓰되, 전용
 * 삽화가 없어(public/psychometrics/factors/*.png는 Big Five 전용) 오른쪽 이미지
 * 박스를 넣지 않는다 — 없는 이미지를 억지로 채우지 않는다.
 */

const TRACK_WIDTH = 420;
const ILLUSTRATION_WIDTH = 190;
const ILLUSTRATION_HEIGHT = 190;

interface SubscaleBarDatum {
  readonly subscale: DarkTriadFactor;
  readonly tScore: number;
  readonly label: string;
}

export async function buildDarkTriadOgCard(summary: DarkTriadSummaryV1): Promise<OgCard> {
  const [tCommon, tDarkTriad, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "darktriad" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.darktriad);
  const bySubscale = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));

  const bars: readonly SubscaleBarDatum[] = DARKTRIAD_FACTORS.map((subscale) => ({
    subscale,
    tScore: bySubscale.get(subscale) ?? 50,
    label: tDarkTriad(`factors.${subscale}.label`),
  }));

  const topSubscale = bars.reduce((top, bar) => (bar.tScore > top.tScore ? bar : top));
  const kicker = tDarkTriad("kicker");
  const illustration = await loadOgPng(`og/darktriad/${topSubscale.subscale}.png`);

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        gap: 40,
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 24 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {kicker}
        </div>

        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 64, lineHeight: 1.1, color: HOBUN }}>
          {topSubscale.label}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {bars.map((bar) => {
            const fillWidth = Math.max(2, (bar.tScore / 100) * TRACK_WIDTH);
            return (
              <div key={bar.subscale} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", width: 220, color: HOBUN_DIM, fontSize: 18, fontFamily: "Sans" }}>
                  {bar.label}
                </div>
                <div style={{ display: "flex", flexDirection: "row", width: TRACK_WIDTH, height: 10, borderRadius: 5, background: INK_LINE }}>
                  <div style={{ display: "flex", width: fillWidth, height: 10, borderRadius: 5, background: HOBUN }} />
                </div>
                <div style={{ display: "flex", width: 40, justifyContent: "flex-end", color: HOBUN_DIM, fontSize: 18, fontFamily: "Sans" }}>
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
          borderRadius: 20,
          overflow: "hidden",
          border: `1px solid ${INK_LINE}`,
        }}
      >
        {illustration ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori(next/og) requires a data URI image.
          <img
            src={illustration}
            alt=""
            width={ILLUSTRATION_WIDTH}
            height={ILLUSTRATION_HEIGHT}
            style={{ objectFit: "cover", width: ILLUSTRATION_WIDTH, height: ILLUSTRATION_HEIGHT }}
          />
        ) : null}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("darktriad.footerNotice"),
    serifText: topSubscale.label,
    // 막대 옆 숫자(0-9)는 어떤 로케일의 kicker/라벨에도 안 나올 수 있어, 폰트
    // 서브셋 선택이 놓치지 않도록 명시적으로 sansText에 포함시킨다.
    sansText: `${kicker}${bars.map((bar) => bar.label).join("")}${bars.map((bar) => Math.round(bar.tScore)).join(" ")}`,
  };
}
