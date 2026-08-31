import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { TierBadge } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { CompletionCinematic } from "@/components/report/CompletionCinematic";
import { ResultSceneLayer } from "@/components/scene3d/ResultSceneLayer";
import type { AnalysisKey, ValidationStatus } from "@engine/shared/evidence";
import type { EvidenceTier } from "@engine/shared/tier";
import type { LensScenePreset } from "@/lib/scene3dAssets";

interface Props {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly imageSrc?: string;
  readonly imageAlt?: string;
  readonly imageFrameClassName?: string;
  readonly tier: EvidenceTier;
  readonly evidenceStatus?: ValidationStatus;
  /** derived 상태 라벨을 특정 분석 전용 문구로 바꿔야 할 때 EvidenceStatusBadge로 전달한다. */
  readonly evidenceStatusOverride?: string;
  readonly imageLabel?: string;
  readonly scenePreset?: LensScenePreset;
  /**
   * 다섯 개 설문형 검사(빅파이브/융 유형·다크 트라이어드·EQ·애착·인지능력)의 결과 화면에서만 전달한다.
   * 설문 제출 직후 도착했을 때만 완료 연출이 한 번 재생되고, 그 외 진입(새로고침·공유 링크·재방문)에는
   * 아무 효과가 없다 — 사주·타로처럼 제출이라는 순간이 없는 분석에는 이 prop 자체를 넘기지 않는다.
   */
  readonly completionAnalysisKey?: AnalysisKey;
}

/** 결과 첫 화면에서 제목·핵심 문장·대표 이미지를 한 장면으로 보여준다. */
export async function ResultCover({
  eyebrow,
  title,
  summary,
  imageSrc,
  imageAlt = "",
  imageFrameClassName,
  tier,
  evidenceStatus,
  evidenceStatusOverride,
  imageLabel,
  scenePreset = "result",
  completionAnalysisKey,
}: Props) {
  return (
    <section className="result-cover reading-panel relative overflow-hidden rounded-[1.75rem] border border-ink-700 p-5 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
      <div className="result-cover-glow" aria-hidden />
      {completionAnalysisKey && <CompletionCinematic analysisKey={completionAnalysisKey} />}
      <div className="relative z-10 grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.52fr)]">
        <div>
          <p className="font-mono text-[12px] tracking-[0.2em] text-ink-700/75">{eyebrow}</p>
          <h1 className="mt-3 max-w-[18ch] text-[clamp(1.8rem,5vw,3.2rem)] leading-[1.06] font-semibold tracking-[-0.045em] text-ink-950">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-800/85">{summary}</p>
          <div className="mt-6">
            {evidenceStatus ? (
              <EvidenceStatusBadge status={evidenceStatus} tone="light" derivedOverride={evidenceStatusOverride} />
            ) : (
              <TierBadge tier={tier} tone="light" />
            )}
          </div>
        </div>

        {imageSrc ? (
          <div className={`result-cover-art relative mx-auto w-full overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)] ${imageFrameClassName ?? "aspect-[2/3] max-w-[210px]"}`}>
            <MotionSafeImage
              src={imageSrc}
              alt={imageAlt}
              sizes="(min-width: 640px) 210px, 46vw"
              priority
              className="object-cover"
              fallbackLabel={imageLabel ?? title}
            />
            <ResultSceneLayer preset={scenePreset} />
          </div>
        ) : (
          <div className="result-cover-mark relative mx-auto flex aspect-square w-full max-w-[190px] items-center justify-center overflow-hidden rounded-full border border-ink-900/15 bg-ink-900/5">
            <span className="font-hanja text-7xl text-ink-900/75" aria-hidden>
              ✦
            </span>
            <ResultSceneLayer preset={scenePreset} />
          </div>
        )}
      </div>
    </section>
  );
}
