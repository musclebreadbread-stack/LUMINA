import type { ReactElement, ReactNode } from "react";
import { HOBUN, HOBUN_FAINT, INK, INK_LINE } from "@/lib/og/theme";

/**
 * 모든 공유 카드(kind)가 공유하는 1200×630 뼈대.
 *
 * 헤더(워드마크+상태 칩)·꼬리(구분선+안내문)는 카드 종류와 무관하게 동일해야
 * 결과를 못 믿을 때에도 "LUMINA에서 왔다"는 사실만은 항상 알아볼 수 있다.
 * 가운데 영역은 카드 종류별 렌더러(jungian.tsx 등)가 채운다.
 *
 * Satori(next/og)는 폰트를 요청 시점에 서브셋으로만 실어야 하므로, 이 프레임이
 * 실제로 그리는 글자(워드마크·칩·꼬리 문구)를 센터 콘텐츠의 글자와 합쳐
 * serifText/sansText로 반환한다 — 호출자는 이 값을 그대로 loadOgFonts에 넘기면 된다.
 */

const WORDMARK = "LUMINA";

export interface OgFrameInput {
  /** 우측 상단 칩에 들어갈 근거 상태 문구, 예: 공용 "파생 요약" 라벨. */
  readonly statusLabel: string;
  /** 하단 구분선 아래 한 줄짜리 고지문. */
  readonly footerText: string;
  /** 가운데 영역에 그릴, 카드 종류별로 이미 완성된 Satori 엘리먼트. */
  readonly centerContent: ReactNode;
  /** centerContent가 세리프(국문 표제 등)로 그리는 글자 — 폰트 서브셋 집계용. */
  readonly centerSerifText?: string;
  /** centerContent가 산세리프로 그리는 글자 — 폰트 서브셋 집계용. */
  readonly centerSansText?: string;
}

export interface OgFrameResult {
  readonly node: ReactElement;
  readonly serifText: string;
  readonly sansText: string;
}

/**
 * kind별 카드 렌더러(jungian.tsx, fallback.tsx, ...)가 공통으로 반환하는 모양.
 * opengraph-image.tsx는 이 값을 그대로 renderOgFrame의 center* 인자로 펼쳐 넣는다.
 */
export interface OgCard {
  readonly centerContent: ReactNode;
  readonly statusLabel: string;
  readonly footerText: string;
  readonly serifText: string;
  readonly sansText: string;
}

export function renderOgFrame({
  statusLabel,
  footerText,
  centerContent,
  centerSerifText = "",
  centerSansText = "",
}: OgFrameInput): OgFrameResult {
  const node = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: INK,
        padding: "56px 64px",
        fontFamily: "Sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", color: HOBUN, fontSize: 22, letterSpacing: 10, fontFamily: "Sans" }}>
          {WORDMARK}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: `1px solid ${INK_LINE}`,
            borderRadius: 999,
            color: HOBUN_FAINT,
            fontSize: 16,
            fontFamily: "Sans",
            padding: "8px 18px",
          }}
        >
          {statusLabel}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "row" }}>{centerContent}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", width: "100%", height: 1, background: INK_LINE }} />
        <div style={{ display: "flex", color: HOBUN_FAINT, fontSize: 18, fontFamily: "Sans" }}>{footerText}</div>
      </div>
    </div>
  );

  return {
    node,
    serifText: centerSerifText,
    sansText: `${WORDMARK}${statusLabel}${footerText}${centerSansText}`,
  };
}
