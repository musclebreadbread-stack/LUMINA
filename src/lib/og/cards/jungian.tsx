import { getTranslations } from "next-intl/server";
import { JUNGIAN_AXES, jungianAxisConfig, type JungianAxis } from "@engine/psychometrics/jungian";
import { ogTypeImagePath } from "@/lib/assets";
import type { OgCard } from "@/lib/og/cards/frame";
import { loadOgPng } from "@/lib/og/image";
import { HOBUN, HOBUN_DIM, HOBUN_FAINT, INK_LINE } from "@/lib/og/theme";
import type { JungianSummaryV1 } from "@/lib/shareCode";

/**
 * MBTI(jungian) 공유 카드의 가운데 콘텐츠.
 *
 * 본문 결과 페이지와 같은 규칙을 쓴다 — 경계(isBoundary) 축은 글자를 단정하지
 * 않고 "?"로 남긴다. 카드가 본문보다 더 확신에 차 보이면 안 된다.
 */

const TRACK_WIDTH = 320;
const ILLUSTRATION_WIDTH = 300;
const ILLUSTRATION_HEIGHT = 430;

interface AxisLetter {
  readonly axis: JungianAxis;
  readonly pole: string;
  readonly isBoundary: boolean;
}

interface AxisBar {
  readonly axis: JungianAxis;
  readonly continuous: number;
  readonly isBoundary: boolean;
  readonly negativePole: string;
  readonly positivePole: string;
}

export async function buildJungianOgCard(summary: JungianSummaryV1): Promise<OgCard> {
  const [t, tShare] = await Promise.all([
    getTranslations({ locale: summary.locale, namespace: "jungian" }),
    getTranslations({ locale: summary.locale, namespace: "share" }),
  ]);
  const byAxis = new Map(summary.axes.map((entry) => [entry.axis, entry] as const));
  // 유형 삽화는 기본 16유형만 있다 — "INFP-AV" 같은 v2 코드는 대시 앞부분만 넘긴다.
  const illustration = await loadOgPng(ogTypeImagePath(summary.typeCode.split("-")[0] ?? summary.typeCode));

  const letters: readonly AxisLetter[] = JUNGIAN_AXES.map((axis) => {
    const entry = byAxis.get(axis);
    const continuous = entry?.continuous ?? 0;
    const isBoundary = entry?.isBoundary ?? true;
    const config = jungianAxisConfig(axis);
    const pole = isBoundary ? "?" : continuous < 0 ? config.negativePole : config.positivePole;
    return { axis, pole, isBoundary };
  });

  const bars: readonly AxisBar[] = JUNGIAN_AXES.map((axis) => {
    const entry = byAxis.get(axis);
    const config = jungianAxisConfig(axis);
    return {
      axis,
      continuous: entry?.continuous ?? 0,
      isBoundary: entry?.isBoundary ?? true,
      negativePole: config.negativePole,
      positivePole: config.positivePole,
    };
  });

  const letterGlyphs = letters.length <= 4
    ? letters.map((letter) => letter.pole).join("")
    : `${letters.slice(0, 4).map((letter) => letter.pole).join("")}-${letters.slice(4).map((letter) => letter.pole).join("")}`;
  const kicker = t("resultKicker");
  const barLabels = bars.flatMap((bar) => [bar.negativePole, bar.positivePole]).join("");

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
      <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {kicker}
        </div>

        <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          {letters.map((letter) => (
            <div key={letter.axis} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: "Serif",
                  fontSize: 108,
                  lineHeight: 1,
                  color: letter.isBoundary ? HOBUN_FAINT : HOBUN,
                }}
              >
                {letter.pole}
              </div>
              <div
                style={{
                  display: "flex",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: letter.isBoundary ? HOBUN_FAINT : "transparent",
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bars.map((bar) => {
            const position = ((bar.continuous + 100) / 200) * TRACK_WIDTH;
            const center = TRACK_WIDTH / 2;
            const fillLeft = Math.min(center, Math.max(0, position));
            const fillWidth = Math.max(2, Math.abs(position - center));
            const fillRight = Math.max(0, TRACK_WIDTH - fillLeft - fillWidth);
            const fillColor = bar.isBoundary ? HOBUN_FAINT : HOBUN;

            return (
              <div key={bar.axis} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 22, justifyContent: "center", color: HOBUN_DIM, fontSize: 18, fontFamily: "Sans" }}>
                  {bar.negativePole}
                </div>
                <div style={{ display: "flex", flexDirection: "row", width: TRACK_WIDTH, height: 8, borderRadius: 4, background: INK_LINE }}>
                  <div style={{ display: "flex", width: fillLeft, height: 8 }} />
                  <div style={{ display: "flex", width: fillWidth, height: 8, borderRadius: 4, background: fillColor }} />
                  <div style={{ display: "flex", width: fillRight, height: 8 }} />
                </div>
                <div style={{ display: "flex", width: 22, justifyContent: "center", color: HOBUN_DIM, fontSize: 18, fontFamily: "Sans" }}>
                  {bar.positivePole}
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
              fontSize: 64,
              color: HOBUN_FAINT,
            }}
          >
            {letterGlyphs}
          </div>
        )}
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: t("evidenceStatusOverride"),
    footerText: tShare("jungian.footerNotice"),
    serifText: letterGlyphs,
    sansText: `${kicker}${barLabels}`,
  };
}
