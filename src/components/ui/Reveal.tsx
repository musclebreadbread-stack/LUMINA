import type { ReactNode } from "react";

/**
 * 스크롤 리빌.
 *
 * 자바스크립트를 쓰지 않는다. CSS 스크롤 타임라인(animation-timeline: view())으로만
 * 움직이므로, 다음이 모두 안전하다.
 *
 *  - 서버가 보낸 HTML에 opacity:0 이 들어가지 않는다 → JS가 죽어도 글이 보인다
 *  - 인쇄·PDF·스크린샷에서 내용이 사라지지 않는다
 *  - 스크롤 타임라인을 모르는 브라우저에서는 지속시간 0으로 끝 상태에 바로 놓인다
 *  - 움직임 축소를 켜면 규칙 자체가 적용되지 않는다
 */
export function Reveal({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`reveal ${className ?? ""}`}>{children}</div>;
}
