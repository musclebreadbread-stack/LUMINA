/**
 * 광고 동의 상태.
 *
 * "Google 인증 CMP"는 실제 인증을 받은 외부 서비스(Cookiebot, Quantcast Choice,
 * Osano 등)에 가입해야 얻는 자격이라 이 코드베이스만으로는 대신할 수 없다.
 * 여기서는 그 서비스가 대신 채워질 자리를 배너·저장소·게이팅 로직으로 미리
 * 마련해 둔다 — 실제 CMP를 붙일 때는 이 저장소 읽기/쓰기 부분만 그 SDK 호출로
 * 바꾸면 된다.
 */

export type ConsentChoice = "accepted" | "rejected";

const STORAGE_KEY = "lumina.adConsent.v1";

export function loadConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* 저장에 실패해도 이번 세션은 비개인화 광고로 안전하게 폴백한다. */
  }
}

const listeners = new Set<() => void>();

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function notifyConsentChanged(): void {
  listeners.forEach((l) => l());
}

export function getConsentSnapshot(): ConsentChoice | null {
  return loadConsent();
}

export function getConsentServerSnapshot(): ConsentChoice | null {
  return null;
}
