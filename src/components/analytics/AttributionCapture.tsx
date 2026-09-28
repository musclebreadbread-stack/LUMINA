"use client";

import { useEffect } from "react";
import { captureFirstTouchAttribution } from "@/lib/attribution";

/**
 * 네트워크 요청이 전혀 없는 순수 로컬 저장이라 AnalyticsGate와 달리 동의(consent)와
 * 무관하게 항상 실행한다 — 동의를 기다리다 진짜 첫 랜딩을 놓치면 안 되기 때문이다.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureFirstTouchAttribution({ search: window.location.search, pathname: window.location.pathname });
  }, []);
  return null;
}
