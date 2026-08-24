import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { TierBadge } from "@/components/ui/Chrome";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import type { ValidationStatus } from "@engine/shared/evidence";
import type { EvidenceTier } from "@engine/shared/tier";

interface Props {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly imageSrc?: string;
  readonly imageAlt?: string;
  readonly tier: EvidenceTier;
  readonly evidenceStatus?: ValidationStatus;
  readonly imageLabel?: string;
}

/** 결과 첫 화면에서 제목·핵심 문장·대표 이미지를 한 장면으로 보여준다. */
export async function ResultCover({
  eyebrow,
  title,
  summary,
  imageSrc,
  imageAlt = "",
  tier,
  evidenceStatus,
  imageLabel,
}: Props) {
  return (
    <section className="result-cover reading-panel relative overflow-hidden rounded-[1.75rem] border border-ink-700 p-5 shadow-[0_26px_80px_-42px_rgba(0,0,0,0.95)] sm:p-8">
      <div className="result-cover-glow" aria-hidden />
      <div className="relative z-10 grid items-center gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.52fr)]">
        <div>
          <p className="font-mono text-[12px] tracking-[0.2em] text-ink-700/75">{eyebrow}</p>
          <h1 className="mt-3 max-w-[18ch] text-[clamp(1.8rem,5vw,3.2rem)] leading-[1.06] font-semibold tracking-[-0.045em] text-ink-950">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-800/85">{summary}</p>
          <div className="mt-6">
            {evidenceStatus ? (
              <EvidenceStatusBadge status={evidenceStatus} tone="light" />
            ) : (
              <TierBadge tier={tier} tone="light" />
            )}
          </div>
        </div>

        {imageSrc ? (
          <div className="result-cover-art relative mx-auto aspect-[2/3] w-full max-w-[210px] overflow-hidden rounded-[1.25rem] border border-ink-900/20 bg-ink-900 shadow-[0_22px_50px_-24px_rgba(0,0,0,0.75)]">
            <MotionSafeImage
              src={imageSrc}
              alt={imageAlt}
              sizes="(min-width: 640px) 210px, 46vw"
              priority
              className="object-cover"
              fallbackLabel={imageLabel ?? title}
            />
          </div>
        ) : (
          <div className="result-cover-mark mx-auto flex aspect-square w-full max-w-[190px] items-center justify-center rounded-full border border-ink-900/15 bg-ink-900/5">
            <span className="font-hanja text-7xl text-ink-900/75" aria-hidden>
              ✦
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
