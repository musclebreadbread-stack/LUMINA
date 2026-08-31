"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { LENS_SCENE_PALETTES, type LensScenePreset } from "@/lib/scene3dAssets";
import { LensSceneFallback } from "./LensSceneFallback";
import { useScene3dCapability } from "./useScene3dCapability";

const PlatformAtmosphereScene = dynamic(
  () => import("./PlatformAtmosphereScene").then((module) => module.PlatformAtmosphereScene),
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
  const palette = LENS_SCENE_PALETTES[preset];

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
        <PlatformAtmosphereScene
          palette={palette}
          frameStep={capability.frameStep}
          onContextLost={() => setContextLost(true)}
        />
      ) : null}
    </div>
  );
}
