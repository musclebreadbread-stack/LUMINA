/**
 * 구매 첫 터치 귀속 — 세션의 첫 페이지 로드에서 UTM·랜딩 경로를 한 번만 캡처한다.
 *
 * 마케팅 예산이 0원이라 유입은 사실상 전부 오가닉(SEO)이다. UTM 파라미터가 없는
 * 방문이 대부분일 것이므로, source/medium/campaign보다 landingPath(어느 페이지로
 * 들어왔는지)가 더 자주·더 값지게 채워지는 신호다.
 *
 * 캡처 자체는 세션스토리지에만 남으므로 동의와 무관하게 항상 실행된다. 서버로
 * 나가는 것은 getCheckoutAttribution()뿐이고, 그건 분석 동의를 "수락"한 방문자에게만,
 * 정제를 거친 값으로만 결제 요청에 실린다(billing.order_attribution, Track D7).
 */

import { loadConsent } from "./consent";
import { sanitizeAttribution, type AttributionPayload } from "./attributionPayload";

export interface StoredAttribution {
  readonly source: string | null;
  readonly medium: string | null;
  readonly campaign: string | null;
  readonly landingPath: string;
  readonly capturedAt: string;
}

const STORAGE_KEY = "lumina.attribution.v1";

/** 이미 저장된 값이 있으면 절대 덮어쓰지 않는다 — 첫 터치가 늘 이긴다. */
export function captureFirstTouchAttribution(location: { readonly search: string; readonly pathname: string }): void {
  if (typeof window === "undefined") return;
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) !== null) return;
    const params = new URLSearchParams(location.search);
    const attribution: StoredAttribution = {
      source: params.get("utm_source"),
      medium: params.get("utm_medium"),
      campaign: params.get("utm_campaign"),
      landingPath: location.pathname,
      capturedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // 저장 실패해도(사파리 프라이빗 모드 등) 페이지 동작에는 영향 없다 — 귀속 정보만 조용히 빠진다.
  }
}

export function getStoredAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

/**
 * 결제 요청에 실을 유입 경로. 저장된 값이 있어도 분석 동의를 명시적으로 수락하지
 * 않았다면(거부 또는 미선택) 아무것도 내보내지 않는다 — 이 값은 주문 기록에 붙어
 * 서버 DB에 남기 때문이다. 서버도 같은 정제 함수로 다시 거른다.
 */
export function getCheckoutAttribution(): AttributionPayload | null {
  if (loadConsent() !== "accepted") return null;
  const stored = getStoredAttribution();
  if (!stored) return null;
  return sanitizeAttribution(stored);
}
