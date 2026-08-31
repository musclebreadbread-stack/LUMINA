import type { ReactNode } from "react";
import { AmbientLayer, type AmbientTone } from "@/components/ambient/AmbientLayer";

interface Props {
  readonly children: ReactNode;
  readonly tone?: AmbientTone;
  readonly tint?: string;
  readonly className?: string;
}

/** 기능별 색온도와 콘텐츠 깊이를 묶는 공통 장면 골격. */
export function SceneShell({ children, tone = "neutral", tint, className }: Props) {
  return (
    <div
      className={`scene-shell scene-shell-${tone} ${className ?? ""}`}
      data-lumina-theme="lens-observatory"
      data-lumina-tone={tone}
    >
      <AmbientLayer tone={tone} tint={tint} />
      <div className="relative z-10 scene-content">{children}</div>
    </div>
  );
}
