/**
 * 구매 첫 터치 귀속 — 세션의 첫 페이지 로드에서 UTM·랜딩 경로를 한 번만 캡처한다.
 *
 * 마케팅 예산이 0원이라 유입은 사실상 전부 오가닉(SEO)이다. UTM 파라미터가 없는
 * 방문이 대부분일 것이므로, source/medium/campaign보다 landingPath(어느 페이지로
 * 들어왔는지)가 더 자주·더 값지게 채워지는 신호다.
 *
 * 지금은 세션스토리지에만 남긴다 — 결제 흐름(CheckoutButton, /api/billing/orders)에
 * 실어 보내는 배선과 서버 저장(billing.order_attribution)은 별도 후속 작업이다.
 */

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
