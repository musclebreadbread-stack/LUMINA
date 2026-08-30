"use client";

import Link from "next/link";
import type { AnalysisKey } from "@engine/shared/evidence";
import { track } from "@/lib/analytics";

/**
 * 공유 랜딩 페이지의 CTA만 클릭 신호가 필요해 이 링크 하나만 클라이언트 컴포넌트로 뺐다 —
 * 나머지 SharePage는 그대로 서버 컴포넌트로 남는다.
 */
export function ShareLandingCta({
  href,
  label,
  analysisKey,
}: {
  readonly href: string;
  readonly label: string;
  readonly analysisKey: AnalysisKey;
}) {
  return (
    <Link
      href={href}
      onClick={() => track("share_landing_cta", { analysis: analysisKey })}
      className="mt-6 inline-flex min-h-12 items-center rounded-full bg-hobun px-7 text-sm font-semibold text-ink-900 transition-transform duration-300 hover:-translate-y-0.5"
    >
      {label}
    </Link>
  );
}
