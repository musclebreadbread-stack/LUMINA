"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { MandalaModel } from "@/lib/mandalaModel";
import { useMandalaCapability } from "./useMandalaCapability";

const MandalaScene = dynamic(
  () => import("./MandalaScene").then((module) => module.MandalaScene),
  { ssr: false, loading: () => null },
);

export function MandalaEnhanced({ model }: { readonly model: MandalaModel }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const capability = useMandalaCapability(stageRef);
  const [contextLost, setContextLost] = useState(false);
  const mounted = capability.enabled && !contextLost;

  return (
    <div
      ref={stageRef}
      className="mandala-3d-layer no-print"
      aria-hidden="true"
      data-mandala-layer={mounted ? "2" : "1"}
    >
      {mounted ? (
        <MandalaScene
          model={model}
          frameStep={capability.frameStep}
          onContextLost={() => setContextLost(true)}
        />
      ) : null}
    </div>
  );
}
