"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useSyncExternalStore } from "react";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsent,
} from "@/lib/consent";
import { scrubAnalyticsUrl } from "@/lib/analyticsScrub";

/**
 * beforeSend에서 스크러빙에 실패하면(null) 이벤트 전체를 버린다 — url 없이 보내는
 * 절충안은 없다. 원본 이벤트의 다른 필드(type 등)는 그대로 두고 url만 바꿔치기한다.
 */
function withScrubbedUrl<T extends { readonly url: string }>(event: T): T | null {
  const url = scrubAnalyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}

/**
 * 익명 방문 통계(Vercel Web Analytics·Speed Insights) 게이트.
 *
 * AdSlot·ConsentBanner와 같은 저장소·같은 훅으로 동의 상태를 읽는다 — "선택 전에는
 * 요청 자체를 안 함"이 광고뿐 아니라 통계에도 동일하게 적용돼야 하기 때문이다.
 * 다만 쿠키 없는 익명 집계 텔레메트리라, 개인화 여부를 가르는 광고와 달리 accepted든
 * rejected든 선택만 있으면 마운트한다(방문자 수를 세는 것 자체는 두 경우 모두 같다).
 */
export function AnalyticsGate() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  if (consent === null) return null;

  return (
    <>
      <Analytics beforeSend={(event) => withScrubbedUrl(event)} />
      <SpeedInsights beforeSend={(event) => withScrubbedUrl(event)} />
    </>
  );
}
