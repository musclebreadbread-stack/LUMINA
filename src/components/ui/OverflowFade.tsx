"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  readonly children: ReactNode;
  /** 스크롤 박스 자체에 붙일 클래스 (overflow-x-auto, print-scroll 등) */
  readonly className?: string;
  /** 마운트 직후 [aria-current] 칸을 스크롤 시야의 가운데로 옮긴다 */
  readonly centerCurrent?: boolean;
}

/**
 * 가로로 넘치는 콘텐츠(표·대운 타임라인)를 위한 스크롤 박스.
 *
 * 실제로 넘칠 때만 오른쪽 가장자리에 "아직 더 있다" 페이드를 얹는다 —
 * 넘치지 않는 데서는 아무 표시도 하지 않아 거짓 신호가 되지 않는다.
 * 서버에서 렌더된 자식을 그대로 감싸는 최소 클라이언트 섬(island)이므로,
 * 페이지 본문은 서버 컴포넌트로 남는다.
 */
export function OverflowFade({ children, className, centerCurrent = false }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      setOverflowing(scroller.scrollWidth > scroller.clientWidth + 1);
    };
    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!centerCurrent) return;
    const scroller = scrollerRef.current;
    const current = scroller?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!scroller || !current) return;

    /* scrollIntoView 는 세로 방향까지 끌고 가 페이지를 통째로 점프시킨다.
       가로 오프셋만 계산해 직접 밀어 현재 대운만 시야 중앙에 오게 한다. */
    const scrollerRect = scroller.getBoundingClientRect();
    const rect = current.getBoundingClientRect();
    scroller.scrollLeft += rect.left + rect.width / 2 - (scrollerRect.left + scroller.clientWidth / 2);
  }, [centerCurrent]);

  return (
    <div className="relative">
      <div ref={scrollerRef} className={className}>
        {children}
      </div>
      {overflowing && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-ink-900 to-transparent"
        />
      )}
    </div>
  );
}
