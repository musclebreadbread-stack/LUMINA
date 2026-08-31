"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { LensScenePreset } from "@/lib/scene3dAssets";
import { LensSceneFallback } from "./LensSceneFallback";
import { useScene3dCapability } from "./useScene3dCapability";

const LensOrbitScene = dynamic(
  () => import("./LensOrbitScene").then((module) => module.LensOrbitScene),
  { ssr: false, loading: () => null },
);

interface Props {
  readonly preset?: LensScenePreset;
}

export function ResultSceneLayer({ preset = "result" }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const capability = useScene3dCapability(stageRef);
  const [contextLost, setContextLost] = useState(false);
  const mounted = capability.enabled && !contextLost;

  return (
    <div
      ref={stageRef}
      className={`lens-orbit-layer lens-orbit-layer-${preset} no-print`}
      aria-hidden="true"
      data-scene3d-layer={mounted ? "2" : "1"}
      data-scene3d-preset={preset}
    >
      <LensSceneFallback preset={preset} />
      {mounted ? (
        <LensOrbitScene
          preset={preset}
          frameStep={capability.frameStep}
          onContextLost={() => setContextLost(true)}
        />
      ) : null}
    </div>
  );
}
