"use client";

import { useEffect } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import { recordExploration } from "@/lib/explorationLog";

/**
 * 결과 화면을 실제로 열어 본 순간에만 탐색 기록을 남긴다.
 *
 * 그릴 것이 없는 부수효과라 렌더는 null 이다 — 결과 페이지마다 같은 useEffect 를
 * 복사하지 않으려고 한 곳으로 모았다. 저장하는 값은 분석 키와 시각뿐이다.
 */
export function ExplorationRecorder({ analysisKey }: { readonly analysisKey: AnalysisKey }) {
  useEffect(() => {
    recordExploration(analysisKey);
  }, [analysisKey]);

  return null;
}
