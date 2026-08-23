"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * 허브에서 "사주" 카드를 고르기 전에는 출생 정보 입력 폼을 아예 그리지 않는다.
 * 두 컴포넌트(허브 카드, 폼 섹션)가 서버 컴포넌트 트리 안에서 형제 사이라
 * 상태를 끌어올릴 부모가 없다 — 이 컨텍스트가 그 자리를 대신한다.
 */

interface SajuRevealState {
  readonly open: boolean;
  readonly reveal: () => void;
}

const SajuRevealCtx = createContext<SajuRevealState | null>(null);

export function SajuRevealProvider({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SajuRevealCtx.Provider value={{ open, reveal: () => setOpen(true) }}>
      {children}
    </SajuRevealCtx.Provider>
  );
}

export function useSajuReveal(): SajuRevealState {
  const ctx = useContext(SajuRevealCtx);
  if (!ctx) throw new Error("useSajuReveal must be used within a SajuRevealProvider");
  return ctx;
}
