import type { AxisView } from "@/lib/attachmentModel";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { attachmentImagePath } from "@/lib/psychometricsAssets";

interface AxisBarProps {
  readonly axis: AxisView;
  readonly locale: "ko" | "en";
  readonly axisKey: "anxiety" | "avoidance";
}

export function AxisBar({ axis, locale, axisKey }: AxisBarProps) {
  const label = locale === "ko" ? axis.labelKo : axis.labelEn;
  const position = ((axis.mean - 1) / 4) * 100; // 1-5 스케일을 0-100%로 변환

  return (
    <div className="reveal grid items-center gap-4 sm:grid-cols-[minmax(120px,0.28fr)_minmax(0,1fr)]">
      <div className="assessment-result-art relative aspect-[4/3] overflow-hidden rounded-[1rem] border border-ink-700 bg-ink-900/70">
        <MotionSafeImage
          src={attachmentImagePath(axisKey)}
          alt={label}
          sizes="(min-width: 640px) 180px, 42vw"
          className="object-cover"
          fallbackLabel={label}
        />
      </div>
      <div className="space-y-2">
      {/* 라벨과 점수 */}
      <div className="flex justify-between items-baseline">
        <h3 className="text-base font-medium">{label}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular">{axis.mean.toFixed(2)}</span>
          <span className="text-sm text-hobun-dim">/ 5.00</span>
        </div>
      </div>

      {/* 막대 그래프 */}
      <div className="relative h-8 bg-ink-800 rounded-lg overflow-hidden">
        {/* 중간선 (3.0) */}
        <div
          className="absolute top-0 bottom-0 w-px bg-ink-600"
          style={{ left: "50%" }}
        />

        {/* 점수 막대 */}
        <div
          className="absolute top-0 bottom-0 bg-hobun/60 transition-all duration-500"
          style={{ width: `${position}%` }}
        />

        {/* 점수 마커 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-hobun rounded-full shadow-lg"
          style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>

      {/* 탐색 점수와 원점수 */}
      <div className="flex justify-between text-sm text-hobun-dim">
        <span>{locale === "ko" ? "탐색 점수" : "Exploratory score"}</span>
        <span>{locale === "ko" ? "원점수" : "Raw"}: {axis.rawSum} / 90</span>
      </div>

      {/* 해석 */}
      <p className="text-sm text-hobun-dim mt-2">
        {axis.mean < 2.5 && (locale === "ko" ? "낮은 수준" : "Low")}
        {axis.mean >= 2.5 && axis.mean < 3.5 && (locale === "ko" ? "평균 수준" : "Average")}
        {axis.mean >= 3.5 && (locale === "ko" ? "높은 수준" : "High")}
      </p>
      </div>
    </div>
  );
}
