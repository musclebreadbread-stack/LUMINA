import type { CSSProperties } from "react";

export type AmbientTone =
  | "home"
  | "tarot"
  | "saju"
  | "numerology"
  | "psychometrics"
  | "darktriad"
  | "attachment"
  | "horoscope"
  | "neutral";

interface Props {
  readonly tone?: AmbientTone;
  readonly tint?: string;
}

/**
 * 장면의 가장 뒤에 놓이는 정적 배경 레이어.
 *
 * 포인터·스크롤 상태를 읽지 않는 서버 컴포넌트다. 반복 모션은 CSS가 담당하고,
 * 저동작 설정에서는 globals.css가 장식 모션을 자동으로 끈다.
 */
export function AmbientLayer({ tone = "neutral", tint }: Props) {
  const style: CSSProperties & Record<"--ambient-tint", string> = {
    "--ambient-tint": tint ?? "var(--color-hobun)",
  };

  return (
    <div aria-hidden className={`ambient-layer ambient-layer-${tone} no-print`} style={style}>
      <span className="ambient-orb ambient-orb-a" />
      <span className="ambient-orb ambient-orb-b" />
      <span className="ambient-grid" />
      <span className="ambient-vignette" />
    </div>
  );
}
