"use client";

import { useEffect } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import { track } from "@/lib/analytics";

/** 공유 링크로 들어온 방문 자체는 화면에 그릴 것이 없는 부수효과라 렌더 없이 훅만 쓴다. */
export function ShareLandingAnalytics({ analysisKey }: { readonly analysisKey: AnalysisKey }) {
  useEffect(() => {
    track("share_landing_view", { analysis: analysisKey });
  }, [analysisKey]);

  return null;
}
