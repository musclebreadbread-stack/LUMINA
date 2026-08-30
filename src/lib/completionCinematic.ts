import type { AnalysisKey } from "@engine/shared/evidence";

/**
 * 설문 제출 직후, 결과 화면에 막 도착한 그 순간에만 재생할 완료 연출 플래그.
 *
 * sessionStorage를 쓴다 — 새로고침·다른 탭에서 같은 결과 링크를 다시 열었을 때는 재생하지
 * 않고, 이번 "제출 → 도착" 한 번의 항해에서만 살아 있으면 충분하기 때문이다(로컬스토리지처럼
 * 영구히 남을 이유가 없다). 값은 분석 키 문자열 하나뿐이라 응답 내용이나 식별 정보는 담기지 않는다.
 */
const STORAGE_KEY = "lumina.completionCinematic.v1";

/** 결과 화면으로 이동하기 직전, 설문 제출 핸들러에서 호출한다. */
export function markCompletionArrival(key: AnalysisKey): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // 저장 실패해도 결과 화면 자체는 정상 동작해야 한다 — 연출만 조용히 빠질 뿐이다.
  }
}

/**
 * 완료 표식이 있는지만 확인한다. 결과 보관 recorder와 시각 연출이 같은 결과 화면에
 * 함께 마운트되므로, 읽기만 하는 소비자가 표식을 먼저 지우지 않도록 분리한다.
 */
export function peekCompletionArrival(key: AnalysisKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === key;
  } catch {
    return false;
  }
}

/**
 * 결과 화면이 마운트될 때 한 번만 소비한다. true를 반환하는 즉시 플래그를 지우므로
 * 새로고침·뒤로가기·직접 링크 진입으로 같은 화면을 다시 열어도 연출이 반복되지 않는다.
 */
export function consumeCompletionArrival(key: AnalysisKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored !== key) return false;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
