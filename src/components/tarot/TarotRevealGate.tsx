"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useState } from "react";

interface Props {
  readonly children: ReactNode;
  readonly openLabel: string;
  readonly hint: string;
  readonly choices: readonly string[];
}

/** 결과를 먼저 고정한 뒤, 공개 순간만 사용자의 행동으로 연출한다. */
export function TarotRevealGate({ children, openLabel, hint, choices }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      {/* 공개 전에는 카드 격자가 게이트를 뷰포트보다 크게 늘리지 않도록 높이를 묶는다.
          늘려 버리면 inset-0 게이트의 선택 버튼이 화면 밖 수천 px 아래로 밀린다. */}
      <div
        aria-hidden={!revealed}
        className={!revealed ? "pointer-events-none select-none max-h-[82vh] overflow-hidden" : undefined}
      >
        {children}
      </div>

      {!revealed && (
        <motion.div
          className="tarot-reveal-gate absolute inset-0 z-10 flex min-h-[360px] items-stretch justify-center overflow-y-auto overscroll-contain rounded-[1rem] border border-ink-600 p-5"
          initial={reduce ? undefined : { opacity: 0.96 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative z-10 m-auto flex w-full max-w-2xl flex-col items-center text-center">
            <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">LUMINA / TAROT</p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-hobun-dim">{hint}</p>
            <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-5 sm:gap-3">
              {choices.map((choice, index) => {
                const selected = selectedIndex === index;
                return (
                  <button
                    key={`${choice}-${index}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedIndex(index)}
                    className={`tarot-reveal-choice group min-h-24 rounded-xl border px-3 py-3 text-center transition-[border-color,transform,background] duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun sm:min-h-28 ${
                      selected
                        ? "border-hobun bg-hobun/15 text-hobun"
                        : "border-ink-600 bg-ink-950/55 text-hobun-dim hover:border-hobun/60"
                    }`}
                  >
                    <span className="tarot-reveal-back mx-auto block h-14 w-10 rounded-lg border border-hobun/30 sm:h-16 sm:w-11" aria-hidden>
                      <span className="tarot-reveal-mark text-2xl">✦</span>
                    </span>
                    <span className="mt-2 block text-[13px] leading-tight">{choice}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={selectedIndex === null}
              onClick={() => setRevealed(true)}
              className="mt-6 inline-flex min-h-12 items-center justify-center border border-hobun/60 bg-hobun px-5 text-sm font-semibold text-ink-900 transition-[transform,opacity] duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun"
            >
              {openLabel}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
