import type { QuadrantClassification } from "@engine/attachment/quadrants";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { attachmentImagePath } from "@/lib/psychometricsAssets";

interface QuadrantCardProps {
  readonly classification: QuadrantClassification;
  readonly locale: "ko" | "en";
}

export function QuadrantCard({ classification, locale }: QuadrantCardProps) {
  const label = locale === "ko" ? classification.labelKo : classification.labelEn;
  const description = locale === "ko" ? classification.descriptionKo : classification.descriptionEn;

  const getQuadrantColor = () => {
    switch (classification.quadrant) {
      case "secure":
        return "border-mok bg-mok/10";
      case "anxious":
        return "border-hwa bg-hwa/10";
      case "avoidant":
        return "border-geum bg-geum/10";
      case "fearful":
        return "border-su bg-su/10";
    }
  };

  const getQuadrantTextColor = () => {
    switch (classification.quadrant) {
      case "secure":
        return "text-mok";
      case "anxious":
        return "text-hwa";
      case "avoidant":
        return "text-geum";
      case "fearful":
        return "text-su";
    }
  };

  return (
    <div className={`border-2 rounded-xl p-8 ${getQuadrantColor()}`}>
      <div className="space-y-4">
        <div className="assessment-result-art reveal relative mx-auto aspect-[16/9] max-w-[520px] overflow-hidden rounded-[1.25rem] border border-ink-700 bg-ink-900/70">
          <MotionSafeImage
            src={attachmentImagePath(classification.quadrant)}
            alt={label}
            sizes="(min-width: 640px) 520px, 100vw"
            className="object-cover"
            fallbackLabel={label}
          />
        </div>
        {/* 유형 라벨 */}
        <div className="text-center">
          <p className="text-sm text-hobun-dim mb-2">
            {locale === "ko" ? "당신의 애착 유형" : "Your Attachment Style"}
          </p>
          <h2 className={`text-4xl font-bold ${getQuadrantTextColor()}`}>
            {label}
          </h2>
        </div>

        {/* 설명 */}
        <p className="text-base leading-relaxed text-hobun text-center max-w-2xl mx-auto">
          {description}
        </p>

        {/* 2x2 그리드 시각화 */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="grid grid-cols-2 gap-2">
            {/* 불안형 (상단 좌) */}
            <div
              className={`
                p-4 rounded-lg border-2 text-center
                ${classification.quadrant === "anxious"
                  ? "border-hwa bg-hwa/20 font-bold"
                  : "border-ink-700 bg-ink-850/50"
                }
              `}
            >
              <p className="text-sm">
                {locale === "ko" ? "불안형" : "Anxious"}
              </p>
              <p className="text-xs text-hobun-dim mt-1">
                {locale === "ko" ? "높은 불안 · 낮은 회피" : "High anxiety · Low avoidance"}
              </p>
            </div>

            {/* 안정형 (상단 우) */}
            <div
              className={`
                p-4 rounded-lg border-2 text-center
                ${classification.quadrant === "secure"
                  ? "border-mok bg-mok/20 font-bold"
                  : "border-ink-700 bg-ink-850/50"
                }
              `}
            >
              <p className="text-sm">
                {locale === "ko" ? "안정형" : "Secure"}
              </p>
              <p className="text-xs text-hobun-dim mt-1">
                {locale === "ko" ? "낮은 불안 · 낮은 회피" : "Low anxiety · Low avoidance"}
              </p>
            </div>

            {/* 두려움형 (하단 좌) */}
            <div
              className={`
                p-4 rounded-lg border-2 text-center
                ${classification.quadrant === "fearful"
                  ? "border-su bg-su/20 font-bold"
                  : "border-ink-700 bg-ink-850/50"
                }
              `}
            >
              <p className="text-sm">
                {locale === "ko" ? "두려움형" : "Fearful"}
              </p>
              <p className="text-xs text-hobun-dim mt-1">
                {locale === "ko" ? "높은 불안 · 높은 회피" : "High anxiety · High avoidance"}
              </p>
            </div>

            {/* 회피형 (하단 우) */}
            <div
              className={`
                p-4 rounded-lg border-2 text-center
                ${classification.quadrant === "avoidant"
                  ? "border-geum bg-geum/20 font-bold"
                  : "border-ink-700 bg-ink-850/50"
                }
              `}
            >
              <p className="text-sm">
                {locale === "ko" ? "회피형" : "Avoidant"}
              </p>
              <p className="text-xs text-hobun-dim mt-1">
                {locale === "ko" ? "낮은 불안 · 높은 회피" : "Low anxiety · High avoidance"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
