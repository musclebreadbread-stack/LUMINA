import Link from "next/link";

import type { Locale } from "@/i18n/locale";
import type { ScoredRun } from "@engine/cognitive-standardized/types";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { COGNITIVE_OVERVIEW_IMAGE } from "@/lib/psychometricsAssets";
import { EstimatedResult } from "./EstimatedResult";
import { StandardizedResult } from "./StandardizedResult";
import { ResultSceneLayer } from "@/components/scene3d/ResultSceneLayer";

interface PilotResultProps {
  readonly result: ScoredRun;
  readonly locale: Locale;
  readonly imageAlt: string;
}

/**
 * 승인된 규준이 있으면 표준화 점수, 없으면 이론 분포 기반 추정치, 둘 다 없으면
 * 참여 기록만 표시한다(IQ·백분위·정답 비노출).
 */
export function PilotResult({ result, locale, imageAlt }: PilotResultProps) {
  const korean = locale === "ko";
  if (result.status === "standardized_scored") {
    return <StandardizedResult score={result.score} locale={locale} imageAlt={imageAlt} />;
  }
  if (result.status === "estimated_scored") {
    return <EstimatedResult score={result.score} locale={locale} imageAlt={imageAlt} />;
  }

  return (
    <section className="space-y-5 border border-ink-700 p-6" aria-labelledby="pilot-result-title">
      <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">LUMINA / PILOT</p>
      <h1 id="pilot-result-title" className="text-3xl font-semibold text-hobun">
        {korean ? "파일럿 참여가 기록되었습니다" : "Pilot participation recorded"}
      </h1>
      <div className="assessment-result-art relative aspect-[3/2] w-full max-w-[260px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900">
        <MotionSafeImage
          src={COGNITIVE_OVERVIEW_IMAGE}
          alt={imageAlt}
          sizes="(min-width: 640px) 260px, 82vw"
          priority
          className="object-cover"
          fallbackLabel={korean ? "인지능력" : "Cognitive ability"}
        />
        <ResultSceneLayer preset="evidence" />
      </div>
      <p className="max-w-xl text-sm leading-relaxed text-hobun-dim">
        {korean
          ? "응답은 검사 도구를 검증하기 위한 연구 자료로 기록되었습니다. 사전 등록한 검증 절차가 끝난 뒤 결과 공개 여부를 결정합니다."
          : "Your responses were recorded for instrument validation. A public result will be considered only after the approval process is complete."}
      </p>
      <p className="border-l border-hobun pl-3 text-xs leading-relaxed text-hobun-faint">
        {korean
          ? "현재는 IQ·백분위·하위점수·문항별 정답과 해설을 제공하지 않습니다."
          : "IQ, percentile, sub-scores, item answers and explanations are withheld during the pilot."}
      </p>
      <Link href="/cognitive" className="inline-block min-h-11 bg-hobun px-5 py-3 text-sm font-medium text-ink-900">
        {korean ? "인지능력 파일럿으로 돌아가기" : "Return to cognitive pilot"}
      </Link>
    </section>
  );
}
