"use client";

import { useEffect, useState, type RefObject } from "react";

interface NavigatorWithConnection extends Navigator {
  readonly connection?: { readonly saveData?: boolean };
}

export interface MandalaCapability {
  readonly enabled: boolean;
  /** 네 개 코어 미만이거나 절전 장치이면 애니메이션 업데이트를 절반으로 줄인다. */
  readonly frameStep: 1 | 2;
}

function canCreateWebGL2(): boolean {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2");
  if (!context) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

/**
 * 3D 향상 계층의 장착 조건을 한 곳에서 판정한다.
 * 서버/저동작/절전/저사양 환경에서는 Layer 1 CSS 만다라만 남긴다.
 */
export function useMandalaCapability(
  stageRef: RefObject<HTMLElement | null>,
): MandalaCapability {
  const [capability, setCapability] = useState<MandalaCapability>({ enabled: false, frameStep: 2 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const navigatorWithConnection = window.navigator as NavigatorWithConnection;
    const cores = navigator.hardwareConcurrency || 0;
    const frameStep: 1 | 2 = cores < 8 ? 2 : 1;
    const connectionSaveData = navigatorWithConnection.connection?.saveData === true;

    if (media.matches || connectionSaveData || cores < 4 || !canCreateWebGL2()) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCapability({ enabled: entry?.isIntersecting === true, frameStep });
      },
      { threshold: 0.08 },
    );
    observer.observe(stage);

    function updateMotionPreference(event: MediaQueryListEvent): void {
      setCapability({ enabled: !event.matches, frameStep });
    }

    media.addEventListener("change", updateMotionPreference);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotionPreference);
    };
  }, [stageRef]);

  return capability;
}
