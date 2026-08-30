import { getTranslations } from "next-intl/server";
import type { AnalysisKey } from "@engine/shared/evidence";
import { nextLensCandidates } from "@/lib/nextLens";
import { NextLensList, type NextLensOption } from "./NextLensList";

/**
 * 결과 화면 끝의 "다음 렌즈".
 *
 * 열두 개의 검사가 서로 남남으로 끝나지 않게 잇는 자리다. 후보는 카탈로그와 묶음에서
 * 파생하므로(@/lib/nextLens) 이 컴포넌트는 번역과 배치만 맡는다 — 화면마다 링크 목록을
 * 손으로 적어 두면 분석이 늘 때 반드시 어긋난다.
 *
 * 제목·설명은 서버에서 번역해 SSR 에 남기고, 브라우저에만 있는 탐색 기록으로
 * 두 장을 고르는 일만 작은 Client Island 에 넘긴다.
 */
export async function NextLens({
  analysisKey,
  id,
}: {
  readonly analysisKey: AnalysisKey;
  readonly id: string;
}) {
  const [t, tCommon] = await Promise.all([getTranslations("home"), getTranslations("common")]);
  const options: readonly NextLensOption[] = nextLensCandidates(analysisKey).map((candidate) => ({
    key: candidate.key,
    href: candidate.href,
    relation: candidate.relation,
    title: t(candidate.titleKey),
    desc: t(candidate.descKey),
    family: t(candidate.groupTitleKey),
    reason:
      candidate.relation === "sibling"
        ? tCommon("nextLensSibling")
        : tCommon("nextLensCrossing"),
  }));

  if (options.length === 0) return null;

  return (
    <section
      id={id}
      className="no-print mt-12 scroll-mt-24 border-t border-ink-700 pt-8"
      aria-labelledby={`${id}-heading`}
    >
      <p className="font-mono text-[12px] tracking-[0.18em] text-hobun-faint">
        {tCommon("nextLensKicker")}
      </p>
      <h2 id={`${id}-heading`} className="mt-3 text-lg font-medium tracking-tight text-hobun">
        {tCommon("nextLensTitle")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hobun-dim">
        {tCommon("nextLensIntro")}
      </p>
      <NextLensList options={options} cta={tCommon("nextLensCta")} />
    </section>
  );
}
