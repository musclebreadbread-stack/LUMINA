import type { OgCard } from "@/lib/og/cards/frame";
import { ELEMENT_HEX, HOBUN, HOBUN_DIM, HOBUN_FAINT } from "@/lib/og/theme";

/**
 * 공유 카드가 아니라 `/saju/2027/**` 공개 가이드 페이지들의 OG 이미지에 쓰는
 * 카드. 이 페이지들은 birth data가 전혀 없으므로 캐릭터·띠 삽화(래스터)는 넣지
 * 않는다 — `public/characters`·`public/saju/zodiac`에 PNG 파생본이 없어
 * Satori(next/og)의 `loadOgPng`가 못 읽고, 기존 saju/eq/darktriad OG 카드도
 * 애초에 타이포그래피+색상만 쓰는 패턴이라 그대로 따른다.
 */

export interface SajuGuideOgCardInput {
  readonly kicker: string;
  /** 큰 세리프 표제 — 간지 한자(丁未 등)나 "午" 같은 짧은 한자/한글. */
  readonly headline: string;
  readonly subheadline: string;
  readonly footerText: string;
  readonly statusLabel: string;
  /** 표제 옆 세로 색 바에 쓸 오행. 없으면 중립색. */
  readonly accentElement?: "wood" | "fire" | "earth" | "metal" | "water";
}

export function buildSajuGuideOgCard(input: SajuGuideOgCardInput): OgCard {
  const accentColor = input.accentElement ? ELEMENT_HEX[input.accentElement] : HOBUN_FAINT;

  const centerContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        alignItems: "center",
        gap: 40,
      }}
    >
      <div style={{ display: "flex", width: 8, height: 220, background: accentColor, borderRadius: 4 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 16, letterSpacing: 4, fontFamily: "Sans" }}>
          {input.kicker}
        </div>
        <div style={{ display: "flex", fontFamily: "Serif", fontSize: 96, lineHeight: 1.05, color: HOBUN }}>
          {input.headline}
        </div>
        <div style={{ display: "flex", fontFamily: "Sans", fontSize: 26, color: HOBUN_DIM, maxWidth: 760 }}>
          {input.subheadline}
        </div>
      </div>
    </div>
  );

  return {
    centerContent,
    statusLabel: input.statusLabel,
    footerText: input.footerText,
    serifText: input.headline,
    sansText: `${input.kicker}${input.subheadline}`,
  };
}
