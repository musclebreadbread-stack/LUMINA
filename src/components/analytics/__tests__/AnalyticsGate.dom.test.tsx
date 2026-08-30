import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnalyticsGate } from "../AnalyticsGate";

/**
 * 이 저장소엔 React Testing Library가 없어(다른 *.dom.test.tsx도 순수 DOM만 다룬다)
 * react-dom/client로 직접 렌더한다 — act()가 테스트 환경임을 알도록 이 플래그가 필요하다.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * AdSlot이 동의 미선택 상태에서 아무것도 렌더하지 않는 것과 같은 계약을 검증한다 —
 * 실제 @vercel/* 스크립트 주입은 jsdom에서 신뢰성 있게 흉내 낼 수 없으므로(동의가
 * 있을 때의 마운트는 build/typecheck가 구조적으로 검증한다), 여기서는 게이팅
 * 조건 하나(동의 미선택 → 렌더 없음)만 확실히 잠근다.
 */
describe("AnalyticsGate", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders nothing when no consent choice has been recorded", () => {
    act(() => {
      root.render(<AnalyticsGate />);
    });

    expect(container.innerHTML).toBe("");
  });
});
