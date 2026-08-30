import { getTranslations } from "next-intl/server";
import { FACTORS as EQ_FACTORS, TOTAL_ITEM_COUNT, type EqFactor } from "@engine/eq/items";
import { totalNormScoreFor } from "@engine/eq/norms";
import { STATUS_KEYS } from "@/components/ui/EvidenceStatusBadge";
import { analysisDefinition } from "@/lib/analysisCatalog";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import { SHARE_KIND_ANALYSIS_KEY } from "@/lib/shareMeta";
import type { EqSummaryV1 } from "@/lib/shareCode";

/**
 * SSEIT(정서지능) 공유 카드의 가운데 콘텐츠.
 *
 * 원저자들이 단일 총점을 전제로 만든 척도라 헤드라인은 총점 원점수이고, 하위요인은
 * 오른쪽에 막대로만 딸려 나온다 — 하위요인을 표제로 올리면 "규준 없는 보조 지표를
 * 대표값처럼 읽는" 해석을 카드가 먼저 부추기게 된다.
 *
 * darktriad.tsx와 마찬가지로 전용 삽화가 없어(psychometrics/factors/*.png는 Big Five
 * 전용) 이미지 박스를 넣지 않고 활자만으로 구성한다.
 */

const TRACK_WIDTH = 320;
const LABEL_WIDTH = 210;
const TOTAL_MAX = TOTAL_ITEM_COUNT * 5;
const ILLUSTRATION_WIDTH = 180;
const ILLUSTRATION_HEIGHT = 140;

interface SubscaleBarDatum {
  readonly subscale: EqFactor;
  readonly tScore: number;
  readonly label: string;
}

export async function buildEqOgCard(summary: EqSummaryV1): Promise<OgCard> {
  const [tCommon, tEq, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "common" }),
    getTranslations({ locale: summary.locale, namespace: "eq" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const evidence = analysisDefinition(SHARE_KIND_ANALYSIS_KEY.eq);
  const byFactor = new Map(summary.subscales.map((entry) => [entry.subscale, entry.tScore] as const));

  const bars: readonly SubscaleBarDatum[] = EQ_FACTORS.map((subscale) => ({
    subscale,
    tScore: byFactor.get(subscale) ?? 50,
    label: tEq(`factors.${subscale}.label`),
  }));

  // 규준이 붙는 점수는 총점 하나뿐이다. 파생값을 코드에 싣지 않고 원점수에서 그 자리에서
  // 다시 계산하므로, 규준 표가 갱신되면 오래된 링크도 새 수치로 그려진다.
  const norm = totalNormScoreFor(summary.totalRawSum);
  const kicker = tEq("kicker");
  const totalHeadline = `${summary.totalRawSum} / ${TOTAL_MAX}`;
  const totalLabel = tEq("totalLabel");
  const normLine = norm
    ? `${tEq("tScoreLabel", { score: norm.tScore.toFixed(1) })} · ${tEq("percentileLabel", { n: norm.percentile })}`
    : tEq("normUnavailable");
  const subscaleHeading = tEq("factorsAside");
  const topFactor = bars.reduce((top, bar) => (bar.tScore > top.tScore ? bar : top));
  const illustration = await loadOgPng(`og/eq/${topFactor.subscale}.png`);

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flex: 1, gap: 24 }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
            {kicker}
          </div>
          <div style={{ display: "flex", fontFamily: "Serif", fontSize: 72, lineHeight: 1.05, color: HOBUN }}>
            {totalHeadline}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "Sans" }}>
            <div style={{ display: "flex", color: HOBUN_DIM, fontSize: 22 }}>{totalLabel}</div>
            <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 20 }}>{normLine}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 3, fontFamily: "Sans" }}>
          {subscaleHeading}
        </div>
        {bars.map((bar) => {
          const fillWidth = Math.max(2, Math.min(TRACK_WIDTH, (bar.tScore / 100) * TRACK_WIDTH));
          return (
            <div key={bar.subscale} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", width: LABEL_WIDTH, color: HOBUN_DIM, fontSize: 18, fontFamily: "Sans" }}>
                {bar.label}
              </div>
              {/*
                하위요인은 출판 규준이 없어 숫자를 붙이지 않는다 — 막대 옆에 T점수처럼 보이는
                수를 찍으면 규준이 있는 총점과 구분되지 않는다.
              */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  width: TRACK_WIDTH,
                  height: 10,
                  borderRadius: 5,
                  background: INK_LINE,
                }}
              >
                <div style={{ display: "flex", width: fillWidth, height: 10, borderRadius: 5, background: HOBUN }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: tCommon(STATUS_KEYS[evidence.evidence.validationStatus]),
    footerText: tShare("eq.footerNotice"),
    // 헤드라인의 숫자·슬래시는 어떤 로케일의 문장에도 안 나오므로 세리프 서브셋에
    // 반드시 직접 넣어야 한다 — 빠지면 총점이 통째로 두부(tofu)로 렌더링된다.
    serifText: totalHeadline,
    sansText: `${kicker}${totalLabel}${normLine}${subscaleHeading}${bars.map((bar) => bar.label).join("")}`,
  };
}
