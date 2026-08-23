"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

interface Props {
  readonly children: ReactNode;
  readonly className?: string;
}

/** 데스크톱 포인터 깊이와 모바일의 탭 대체를 한 곳에서 관리한다. */
export function PortalMotion({ children, className }: Props) {
  const reduce = useReducedMotion();

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--portal-x", `${x.toFixed(3)}`);
    event.currentTarget.style.setProperty("--portal-y", `${y.toFixed(3)}`);
  }

  function resetPointer(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--portal-x", "0");
    event.currentTarget.style.setProperty("--portal-y", "0");
  }

  return (
    <motion.div
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      whileHover={reduce ? undefined : { y: -5 }}
      transition={{ type: "spring", stiffness: 280, damping: 24, mass: 0.7 }}
    >
      {children}
    </motion.div>
  );
}
