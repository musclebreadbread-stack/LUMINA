"use client";

import { useEffect, useRef } from "react";

/**
 * 한 문항 화면에 **실제로 머문** 시간을 잰다.
 *
 * 단순히 "문항이 바뀐 시각 - 답한 시각"으로 재면 잠깐 다른 탭을 보거나 자리를 비운 시간까지
 * "생각한 시간"이 된다. 이 검사는 제한 시간이 없다고 약속했으므로 그 숫자를 성적처럼 쓸 일은 없지만,
 * 응답자에게 돌려줄 값이라면 적어도 거짓말은 아니어야 한다. 그래서 문서가 보이는 동안만 센다.
 *
 * 누적은 상위(초안)에서 하고 여기서는 "보이던 구간의 길이"만 알려 준다 —
 * 문항 사이를 오갈 수 있으니 한 문항의 시간은 여러 구간의 합이다.
 * 상한은 cognitiveDraft.ts의 ITEM_ELAPSED_CAP_MS가 누적 시점에 건다.
 */
export function useVisibleElapsed(
  itemId: number | null,
  onAccumulate: (itemId: number, deltaMs: number) => void,
): void {
  const handlerRef = useRef(onAccumulate);
  useEffect(() => {
    handlerRef.current = onAccumulate;
  }, [onAccumulate]);

  useEffect(() => {
    if (itemId === null) return;
    // 아래 클로저(호이스팅되는 함수 선언)까지 좁혀진 타입이 따라가도록 상수에 옮겨 담는다.
    const activeItemId: number = itemId;

    // 이미 숨겨진 탭에서 문항이 바뀌었다면 그 순간부터는 세지 않는다.
    let startedAt: number | null =
      document.visibilityState === "visible" ? performance.now() : null;

    function flush(): void {
      if (startedAt === null) return;
      const delta = performance.now() - startedAt;
      startedAt = null;
      if (delta > 0) handlerRef.current(activeItemId, delta);
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") {
        startedAt = performance.now();
      } else {
        flush();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // 문항이 바뀌거나 화면을 떠날 때 마지막 구간을 닫는다.
      flush();
    };
  }, [itemId]);
}
