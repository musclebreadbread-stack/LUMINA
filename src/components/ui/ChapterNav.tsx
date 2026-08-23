"use client";

import { useEffect, useRef, useState } from "react";

export interface Chapter {
  readonly id: string;
  readonly label: string;
}

export function ChapterNav({ chapters, label }: { readonly chapters: readonly Chapter[]; readonly label: string }) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "");
  const [overflowing, setOverflowing] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.2, 0.7] },
    );

    for (const chapter of chapters) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [chapters]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    /* 장 넘침이 실제로 있을 때만 가장자리 페이드를 내린다. */
    const update = () => {
      setOverflowing(nav.scrollWidth > nav.clientWidth + 1);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(nav);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !current) return;

    /* scrollIntoView 는 세로 방향까지 끌고 가 읽던 위치를 잃는다.
       가로 오프셋만 계산해 현재 장 pill 만 시야 중앙으로 옮긴다. */
    const navRect = nav.getBoundingClientRect();
    const rect = current.getBoundingClientRect();
    nav.scrollLeft += rect.left + rect.width / 2 - (navRect.left + nav.clientWidth / 2);
  }, [activeId]);

  if (chapters.length === 0) return null;

  return (
    <nav ref={navRef} aria-label={label} className="chapter-nav no-print overflow-x-auto">
      <ol className="flex min-w-max gap-2">
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              aria-current={activeId === chapter.id ? "location" : undefined}
              className="chapter-link inline-flex min-h-11 items-center border border-ink-700 px-3 font-mono text-[12px] text-hobun-faint transition-[color,border-color,background-color] hover:border-hobun/60 hover:text-hobun aria-[current=location]:border-hobun/70 aria-[current=location]:bg-ink-850 aria-[current=location]:text-hobun"
            >
              {chapter.label}
            </a>
          </li>
        ))}
        {/* 오른쪽에 숨은 pill 이 있음을 알리는 가장자리. 흐름상 끝에 붙어 있다가
            스크롤이 남으면 오른쪽 모서리에 붙어 버튼처럼 읽힌다. */}
        {overflowing && (
          <li aria-hidden className="pointer-events-none sticky right-0 -ml-5 w-5 shrink-0 self-stretch bg-gradient-to-l from-ink-900/95 to-transparent" />
        )}
      </ol>
    </nav>
  );
}
