import Link from "next/link";

import type { Locale } from "@/i18n/locale";
import type { ScoredRun } from "@engine/cognitive-standardized/types";

interface PilotResultProps {
  readonly result: ScoredRun;
  readonly locale: Locale;
}

/** 규준 승인 전 파일럿은 참여 기록만 알리고 개인 능력 판정을 내리지 않는다. */
export function PilotResult({ result, locale }: PilotResultProps) {
  const korean = locale === "ko";
  if (result.status === "standardized_scored") {
    return (
      <section className="space-y-5 border border-hobun p-6">
        <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">LUMINA / STANDARDIZED</p>
        <h1 className="text-3xl font-semibold text-hobun">{korean ? "표준화 결과" : "Standardized result"}</h1>
        <p className="text-6xl font-semibold tabular text-hobun">{result.score.fullScaleIq}</p>
        <p className="text-sm text-hobun-dim">{korean ? `연령 규준 백분위 ${result.score.percentile}` : `Age-norm percentile ${result.score.percentile}`}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 border border-ink-700 p-6">
      <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">LUMINA / PILOT</p>
      <h1 className="text-3xl font-semibold text-hobun">{korean ? "파일럿 참여가 기록되었습니다" : "Pilot participation recorded"}</h1>
      <p className="max-w-xl text-sm leading-relaxed text-hobun-dim">
        {korean
          ? "응답은 검사 도구를 검증하기 위한 연구 자료로 기록되었습니다. 승인 절차가 끝난 뒤 결과 공개 여부를 결정합니다."
          : "Your responses were recorded for instrument validation. A public result will be considered only after the approval process is complete."}
      </p>
      <Link href="/cognitive" className="inline-block min-h-11 bg-hobun px-5 py-3 text-sm font-medium text-ink-900">
        {korean ? "인지 파일럿으로 돌아가기" : "Return to cognitive pilot"}
      </Link>
    </section>
  );
}
