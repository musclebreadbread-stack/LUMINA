"use client";

import { useEffect, useState, type RefObject } from "react";
import { scheduleScene3dIdle } from "@/lib/scene3dIdle";

interface NavigatorWithConnection extends Navigator {
  readonly connection?: { readonly saveData?: boolean };
}

export interface Scene3dCapability {
  readonly enabled: boolean;
  readonly frameStep: 1 | 2;
}

function canCreateWebGL2(): boolean {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2");
  if (!context) return false;
  context.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

export function useScene3dCapability(
  stageRef: RefObject<HTMLElement | null>,
): Scene3dCapability {
  const [capability, setCapability] = useState<Scene3dCapability>({ enabled: false, frameStep: 2 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const navigatorWithConnection = window.navigator as NavigatorWithConnection;
    const cores = window.navigator.hardwareConcurrency || 0;
    const frameStep: 1 | 2 = cores < 8 ? 2 : 1;
    const saveData = navigatorWithConnection.connection?.saveData === true;
    const webglAvailable = !media.matches && !saveData && cores >= 4 && canCreateWebGL2();

    if (!webglAvailable || !("IntersectionObserver" in window)) return;

    let isIntersecting = false;
    let idleReady = false;
    const updateCapability = (): void => {
      setCapability({ enabled: !media.matches && idleReady && isIntersecting, frameStep });
    };
    const cancelIdle = scheduleScene3dIdle(() => {
      idleReady = true;
      updateCapability();
    });
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry?.isIntersecting === true;
        updateCapability();
      },
      { threshold: 0.08 },
    );
    observer.observe(stage);

    function updateMotionPreference(event: MediaQueryListEvent): void {
      updateCapability();
      if (event.matches) setCapability({ enabled: false, frameStep });
    }

    media.addEventListener("change", updateMotionPreference);
    return () => {
      cancelIdle();
      observer.disconnect();
      media.removeEventListener("change", updateMotionPreference);
    };
  }, [stageRef]);

  return capability;
}
