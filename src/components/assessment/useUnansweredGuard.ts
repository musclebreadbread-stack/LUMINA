"use client";

import { useCallback, useState } from "react";

interface UnansweredGuard {
  /** 한 번이라도 제출을 시도했는지. 미응답 표시는 그 전까지 나타나지 않는다. */
  readonly attempted: boolean;
  readonly reportUnanswered: () => void;
}

/**
 * 미응답 상태로 제출했을 때의 처리.
 *
 * 네이티브 alert()로는 어느 문항이 비었는지 알 수 없고 화면 낭독기에도 맥락이 남지 않는다.
 * 대신 첫 미응답 문항으로 화면을 옮기고, 그 문항에 표시를 남기고, role="alert" 한 줄을 띄운다.
 */
export function useUnansweredGuard(firstUnansweredId: number | null): UnansweredGuard {
  const [attempted, setAttempted] = useState(false);

  const reportUnanswered = useCallback(() => {
    setAttempted(true);
    if (firstUnansweredId === null) return;
    document
      .getElementById(`item-${firstUnansweredId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [firstUnansweredId]);

  return { attempted, reportUnanswered };
}
