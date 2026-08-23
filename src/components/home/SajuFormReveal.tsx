"use client";

import { motion, useReducedMotion } from "motion/react";
import { BirthForm } from "@/components/BirthForm";
import { useSajuReveal } from "./SajuRevealContext";

/**
 * "사주" 카드를 고르기 전에는 긴 입력 폼을 아예 그리지 않는다 — 대신 같은 자리에
 * 점선 버튼 하나만 둔다. 허브 카드를 누르지 않고 스크롤만 내린 사람을 위한
 * 안전망이자, 폼이 열리는 계기를 한 군데로 통일한다(reveal 은 어디서 불러도
 * 같은 상태를 연다).
 *
 * open 은 클라이언트 상태로 시작하고(항상 false) 폼은 그 뒤에만 마운트되므로,
 * 등장 애니메이션에 opacity 를 써도 서버 HTML과 어긋날 일이 없다 — 사용자가
 * 실제로 누른 뒤에야 나타나는 내용이기 때문이다.
 */
export function SajuFormReveal({ prompt }: { readonly prompt: string }) {
  const { open, reveal } = useSajuReveal();
  const shouldReduceMotion = useReducedMotion();

  if (!open) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="w-full border border-dashed border-ink-700 px-5 py-10 text-center text-sm text-hobun-faint transition-colors hover:border-ink-600 hover:text-hobun-dim"
      >
        {prompt}
      </button>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <BirthForm />
    </motion.div>
  );
}
