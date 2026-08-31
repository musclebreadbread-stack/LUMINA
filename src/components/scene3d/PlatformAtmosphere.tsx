"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";
import {
  PLATFORM_SCENE_PALETTES,
  type PlatformSceneTone,
} from "@/lib/scene3dAssets";
import { hasDedicatedPlatformScene, platformSceneTone } from "@/lib/platformSceneRoutes";
import { useScene3dCapability } from "./useScene3dCapability";

const PlatformAtmosphereScene = dynamic(
  () => import("./PlatformAtmosphereScene").then((module) => module.PlatformAtmosphereScene),
  { ssr: false, loading: () => null },
);

type PlatformSceneStyle = CSSProperties & Record<"--platform-primary" | "--platform-secondary" | "--platform-glow", string>;

export function PlatformAtmosphere() {
  const pathname = usePathname();
  const tone = platformSceneTone(pathname);
  return <PlatformAtmosphereFrame tone={tone} pathname={pathname} />;
}

function PlatformAtmosphereFrame({ tone, pathname }: { readonly tone: PlatformSceneTone; readonly pathname: string | null }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const capability = useScene3dCapability(stageRef);
  const [contextLost, setContextLost] = useState(false);
  const dedicated = hasDedicatedPlatformScene(pathname);
  const palette = PLATFORM_SCENE_PALETTES[tone];
  const mounted = capability.enabled && !dedicated && !contextLost;
  const style: PlatformSceneStyle = {
    "--platform-primary": palette.primary,
    "--platform-secondary": palette.secondary,
    "--platform-glow": palette.glow,
  };

  return (
    <div
      ref={stageRef}
      className={`platform-atmosphere platform-atmosphere-${tone} no-print`}
      aria-hidden="true"
      data-platform-scene-layer={mounted ? "2" : "1"}
      data-platform-scene-tone={tone}
      style={style}
    >
      <span className="platform-atmosphere-sweep" />
      <span className="platform-atmosphere-horizon" />
      <span className="platform-atmosphere-crosshair" />
      {mounted ? (
        <PlatformAtmosphereScene
          palette={palette}
          frameStep={capability.frameStep}
          placement="edge"
          onContextLost={() => setContextLost(true)}
        />
      ) : null}
    </div>
  );
}
