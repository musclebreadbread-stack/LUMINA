import Link from "next/link";
import type { ReactNode } from "react";
import type { ValidationStatus } from "@engine/shared/evidence";
import type { EvidenceTier } from "@engine/shared/tier";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { EvidenceStatusBadge } from "@/components/ui/EvidenceStatusBadge";
import { TierBadge } from "@/components/ui/Chrome";
import { PortalMotion } from "./PortalMotion";

interface Props {
  readonly href: string;
  readonly title: string;
  readonly desc: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly tier: EvidenceTier;
  readonly evidenceStatus?: ValidationStatus;
  readonly label: string;
  readonly cta: string;
  /** 브라우저에만 있는 "이미 열어 봄" 표시. 서버 HTML 에서는 비어 있는 것이 정상이다. */
  readonly mark?: ReactNode;
  readonly featured?: boolean;
}

export async function FeaturePortal({
  href,
  title,
  desc,
  imageSrc,
  imageAlt,
  tier,
  evidenceStatus,
  label,
  cta,
  mark,
  featured = false,
}: Props) {
  return (
    <PortalMotion className={featured ? "sm:col-span-2 lg:col-span-2" : ""}>
      <Link
        href={href}
        className="portal-card group block h-full overflow-hidden rounded-[1.5rem] border border-ink-700 bg-surface-light text-ink-900 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.95)] transition-[border-color,box-shadow] duration-300 hover:border-hobun/80 hover:shadow-[0_30px_90px_-34px_rgba(0,0,0,0.9)] focus-visible:border-hobun focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hobun"
      >
        <div className={`portal-image relative overflow-hidden ${featured ? "aspect-[16/8]" : "aspect-[4/3]"}`}>
          <MotionSafeImage
            src={imageSrc}
            alt={imageAlt}
            sizes={featured ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 640px) 38vw, 100vw"}
            priority={featured}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            fallbackLabel={title}
          />
          <span className="portal-image-wash" />
          <span className="absolute left-5 top-5 rounded-full border border-white/45 bg-ink-950/45 px-3 py-1 font-mono text-[11px] tracking-[0.16em] text-white backdrop-blur-sm">
            {label}
          </span>
          <span aria-hidden className="portal-arrow absolute right-5 top-5 text-xl text-white">
            ↗
          </span>
          {mark}
        </div>

        <div className="flex min-h-[178px] flex-col justify-between gap-6 p-6 sm:p-7">
          <div>
            <h3 className="text-[clamp(1.25rem,3vw,1.65rem)] font-semibold tracking-[-0.03em]">{title}</h3>
            <p className="mt-2 max-w-[34rem] text-[15px] leading-relaxed text-ink-700/80">{desc}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <TierBadge tier={tier} tone="light" />
              {evidenceStatus ? <EvidenceStatusBadge status={evidenceStatus} tone="light" /> : null}
            </div>
            <span className="font-mono text-xs tracking-[0.16em] text-ink-700/75 transition-transform duration-300 group-hover:translate-x-1">
              {cta}
            </span>
          </div>
        </div>
      </Link>
    </PortalMotion>
  );
}
