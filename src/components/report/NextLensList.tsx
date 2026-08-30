"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { AnalysisKey } from "@engine/shared/evidence";
import {
  exploredAnalysisKeys,
  getExplorationLogServerSnapshot,
  getExplorationLogSnapshot,
  subscribeExplorationLog,
} from "@/lib/explorationLog";
import { pickNextLenses, type LensRelation } from "@/lib/nextLens";

export interface NextLensOption {
  readonly key: AnalysisKey;
  readonly href: string;
  readonly relation: LensRelation;
  readonly title: string;
  readonly desc: string;
  /** 이 분석이 속한 묶음 이름 — "무엇의 다음인지"를 카드가 스스로 말한다. */
  readonly family: string;
  readonly reason: string;
}

/**
 * 추천 카드의 몸통만 브라우저에서 고른다.
 *
 * 서버 스냅샷은 빈 기록이라 첫 페인트는 언제나 "카탈로그 순서상 첫 두 장"이고,
 * 수화된 뒤에야 아직 열어 보지 않은 쪽으로 바뀐다 — 자바스크립트가 죽어 있어도
 * 추천은 남고, 결과 화면의 문서 구조도 그대로다.
 */
export function NextLensList({
  options,
  cta,
}: {
  readonly options: readonly NextLensOption[];
  readonly cta: string;
}) {
  const log = useSyncExternalStore(
    subscribeExplorationLog,
    getExplorationLogSnapshot,
    getExplorationLogServerSnapshot,
  );
  const picked = pickNextLenses(options, exploredAnalysisKeys(log));

  if (picked.length === 0) return null;

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {picked.map((option) => (
        <li key={option.key}>
          <Link
            href={option.href}
            data-next-lens={option.key}
            data-next-lens-relation={option.relation}
            className="flex h-full flex-col border border-ink-700 bg-ink-950/60 p-5 transition-colors hover:border-hobun/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hobun"
          >
            <p className="font-mono text-[11px] tracking-[0.16em] text-hobun-faint">
              {option.family}
            </p>
            <p className="mt-2 text-base font-medium tracking-tight text-hobun">{option.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{option.desc}</p>
            <p className="mt-3 border-l border-ink-600 pl-3 text-xs leading-relaxed text-hobun-faint">
              {option.reason}
            </p>
            <span className="mt-auto inline-flex min-h-11 items-center pt-3 font-mono text-[12px] text-hobun underline underline-offset-4">
              {cta}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
