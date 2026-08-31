import type { LensScenePreset } from "@/lib/scene3dAssets";

interface Props {
  readonly preset: LensScenePreset;
}

export function LensSceneFallback({ preset }: Props) {
  return (
    <div className={`lens-orbit-fallback lens-orbit-fallback-${preset}`} aria-hidden="true">
      <span className="lens-orbit-fallback-ring lens-orbit-fallback-ring-a" />
      <span className="lens-orbit-fallback-ring lens-orbit-fallback-ring-b" />
      <span className="lens-orbit-fallback-ring lens-orbit-fallback-ring-c" />
      <span className="lens-orbit-fallback-core" />
    </div>
  );
}
