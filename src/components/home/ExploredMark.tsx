"use client";

import { useSyncExternalStore } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import {
  getExplorationLogServerSnapshot,
  getExplorationLogSnapshot,
  subscribeExplorationLog,
} from "@/lib/explorationLog";

/**
 * 허브 카드 위의 "이미 열어 봄" 표시.
 *
 * 서버 HTML 에는 아무것도 없다가 수화 뒤에 나타나므로, 배지 자리가 밀리지 않도록
 * 이미지 영역 안에 절대 위치로 띄운다 — 보여야 할 것을 opacity:0 으로 숨겨 두는
 * 방식은 쓰지 않는다.
 */
export function ExploredMark({
  analysisKey,
  label,
}: {
  readonly analysisKey: AnalysisKey;
  readonly label: string;
}) {
  const log = useSyncExternalStore(
    subscribeExplorationLog,
    getExplorationLogSnapshot,
    getExplorationLogServerSnapshot,
  );

  if (!log.some((entry) => entry.key === analysisKey)) return null;

  return (
    <span
      data-explored-mark={analysisKey}
      className="absolute bottom-4 left-5 inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-ink-950/55 px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-white backdrop-blur-sm"
    >
      <span aria-hidden>✓</span>
      {label}
    </span>
  );
}
