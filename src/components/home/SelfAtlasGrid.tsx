"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import type { AnalysisKey } from "@engine/shared/evidence";
import {
  exploredAnalysisKeys,
  getExplorationLogServerSnapshot,
  getExplorationLogSnapshot,
  subscribeExplorationLog,
} from "@/lib/explorationLog";

export interface AtlasSlot {
  readonly key: AnalysisKey;
  readonly href: string;
  readonly title: string;
}

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * 자기 탐색 지도.
 *
 * 서버 스냅샷이 빈 기록이므로 첫 페인트는 언제나 "0 / N" 이고, 수화 뒤에도 DOM 구조가
 * 그대로라 자리가 밀리지 않는다. 고리는 장식이라 aria-hidden 이고, 진행 상황은
 * 바로 옆 문장과 각 칸의 상태 라벨이 텍스트로 전한다.
 */
export function SelfAtlasGrid({ slots }: { readonly slots: readonly AtlasSlot[] }) {
  const t = useTranslations("home");
  const log = useSyncExternalStore(
    subscribeExplorationLog,
    getExplorationLogSnapshot,
    getExplorationLogServerSnapshot,
  );

  const explored = exploredAnalysisKeys(log);
  const total = slots.length;
  const done = slots.filter((slot) => explored.has(slot.key)).length;
  const next = slots.find((slot) => !explored.has(slot.key));
  const ratio = total === 0 ? 0 : done / total;

  return (
    <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex items-center gap-5">
        <span className="relative block h-[132px] w-[132px] shrink-0">
          <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden focusable="false">
            <circle
              cx="66"
              cy="66"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-ink-700"
            />
            <circle
              cx="66"
              cy="66"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              className="atlas-ring-progress text-hobun"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - ratio)}
            />
          </svg>
          <span
            aria-hidden
            className="tabular absolute inset-0 flex flex-col items-center justify-center font-mono text-hobun"
          >
            <span className="text-2xl leading-none">{done}</span>
            <span className="mt-1 text-[11px] tracking-[0.16em] text-hobun-faint">/ {total}</span>
          </span>
        </span>

        <div className="min-w-0">
          <p className="text-base leading-relaxed text-hobun">{t("atlasProgress", { done, total })}</p>
          {next ? (
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">
              {t("atlasNextLabel")}{" "}
              <Link
                href={next.href}
                prefetch={false}
                className="font-medium text-hobun underline underline-offset-4 hover:text-hobun-dim"
              >
                {t("atlasNextCta", { title: next.title })}
              </Link>
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{t("atlasComplete")}</p>
          )}
        </div>
      </div>

      <ul className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => {
          const isExplored = explored.has(slot.key);
          return (
            <li key={slot.key}>
              <Link
                href={slot.href}
                prefetch={false}
                data-atlas-slot={slot.key}
                data-explored={isExplored ? "true" : "false"}
                className={`flex h-full flex-col justify-between gap-2 rounded-xl border px-3 py-3 transition-[border-color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun ${
                  isExplored
                    ? "border-hobun/45 bg-ink-850/70 text-hobun hover:border-hobun"
                    : "border-ink-800 bg-ink-950/50 text-hobun-dim hover:border-ink-600"
                }`}
              >
                <span className="text-[13px] leading-snug font-medium">{slot.title}</span>
                <span className="font-mono text-[10px] tracking-[0.14em] text-hobun-faint">
                  {isExplored ? t("atlasSlotExplored") : t("atlasSlotOpen")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
