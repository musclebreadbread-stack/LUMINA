"use client";

import { useRef, useSyncExternalStore } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import { peekCompletionArrival } from "@/lib/completionCinematic";

/** 이 저장소는 절대 알림을 보내지 않는다 — sessionStorage 값은 마운트 시 한 번만 읽고 끝이다. */
function subscribeNever(): () => void {
  return () => {};
}

/**
 * 설문을 막 제출하고 결과 화면에 막 도착했을 때만 켜지는 완료 연출(먹물이 번졌다 걷히는 잉크 워시).
 *
 * useSyncExternalStore를 쓰는 이유는 이 저장소들(psychometricsDraft·explorationLog·profile 등)이
 * 이미 쓰고 있는 것과 같다 — 서버 HTML은 getServerSnapshot(항상 false)으로 그려서 "의미 있는" 콘텐츠를
 * 가리는 opacity:0 이 애초에 생기지 않고(Reveal.tsx가 지키는 것과 같은 원칙), 수화 직후 React가
 * getSnapshot을 다시 불러 클라이언트 값(sessionStorage 표식)으로 안전하게 갱신한다.
 * ref에 결과를 캐시해 두는 이유는 sessionStorage.removeItem을 소비 시점에 단 한 번만 실행하기
 * 위해서다 — getSnapshot은 같은 커밋 안에서 여러 번 불릴 수 있고, 그때마다 값이 달라지면
 * useSyncExternalStore가 찢어짐(tearing)으로 간주해 오작동한다. 보관 recorder도 같은 표식을
 * 사용하므로 이 시각 소비자는 peek만 한다. 실제 표식 삭제는 recorder가 담당한다.
 */
export function CompletionCinematic({ analysisKey }: { readonly analysisKey: AnalysisKey }) {
  const consumedRef = useRef<boolean | null>(null);

  const arrived = useSyncExternalStore(
    subscribeNever,
    () => {
      if (consumedRef.current === null) {
        consumedRef.current = peekCompletionArrival(analysisKey);
      }
      return consumedRef.current;
    },
    () => false,
  );

  if (!arrived) return null;

  return <div className="completion-cinematic" aria-hidden />;
}
