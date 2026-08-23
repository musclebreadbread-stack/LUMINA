"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

/**
 * 포인터를 따라 아주 조금 기우는 무대.
 *
 * 서버에서 그린 내용을 그대로 감싸므로, 안에 든 컴포넌트는 클라이언트가 되지 않는다.
 * 마우스에만 반응한다 — 터치에서는 스크롤을 방해하지 않아야 한다.
 */
export function Tilt({
  children,
  amount = 8,
  className,
}: {
  readonly children: ReactNode;
  /** 최대 기울기(도) */
  readonly amount?: number;
  readonly className?: string;
}) {
  const reduce = useReducedMotion();

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 100, damping: 20, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [amount, -amount]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [-amount * 0.7, amount * 0.7]), spring);

  // 구조는 언제나 같게 둔다. 움직임 축소 여부로 DOM 모양이 갈리면
  // 서버 렌더 결과와 어긋나 하이드레이션이 깨진다. 갈리는 것은 핸들러뿐이다.
  return (
    <div
      className={`scene ${className ?? ""}`}
      onPointerMove={(event: ReactPointerEvent<HTMLDivElement>) => {
        if (reduce || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width - 0.5);
        py.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div className="preserve-3d" style={{ rotateX, rotateY }}>
        {children}
      </motion.div>
    </div>
  );
}
