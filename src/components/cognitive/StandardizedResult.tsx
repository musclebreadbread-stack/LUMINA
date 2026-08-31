import type { StandardizedScore } from "@engine/cognitive-standardized/types";
import { standardizedIqBand } from "@engine/cognitive-standardized/norming";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { COGNITIVE_OVERVIEW_IMAGE } from "@/lib/psychometricsAssets";
import type { Locale } from "@/i18n/locale";
import { StandardizedScorePlot } from "./StandardizedScorePlot";
import { ResultSceneLayer } from "@/components/scene3d/ResultSceneLayer";

interface StandardizedResultProps {
  readonly score: StandardizedScore;
  readonly locale: Locale;
  readonly imageAlt: string;
}

/**
 * 승인된 규준으로 변환된 결과만 받는 표시 컴포넌트입니다.
 * 정답·원점수·θ·문항 파라미터는 이 DTO에 없으므로 결과 화면으로 전달되지 않습니다.
 */
export function StandardizedResult({ score, locale, imageAlt }: StandardizedResultProps) {
  const korean = locale === "ko";
  const [lower, upper] = score.confidenceInterval95;
  const band = standardizedIqBand(score.fullScaleIq);
  const bandLabel = korean
    ? {
        well_below_average: "평균에서 상당히 낮은 점수 범위",
        below_average: "평균보다 낮은 점수 범위",
        average: "평균에 가까운 점수 범위",
        above_average: "평균보다 높은 점수 범위",
        well_above_average: "평균에서 상당히 높은 점수 범위",
      }[band]
    : {
        well_below_average: "A score range well below the average",
        below_average: "A score range below the average",
        average: "A score range around the average",
        above_average: "A score range above the average",
        well_above_average: "A score range well above the average",
      }[band];
  return (
    <section className="space-y-5 border border-hobun p-6" aria-labelledby="standardized-result-title">
      <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">LUMINA / STANDARDIZED</p>
      <h1 id="standardized-result-title" className="text-3xl font-semibold text-hobun">
        {korean ? "표준화 결과" : "Standardized result"}
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
      <StandardizedScorePlot
        score={score}
        title={korean ? "점수와 95% 신뢰구간" : "Score and 95% confidence interval"}
        description={korean ? "점은 산출된 전체 IQ 추정치이고, 가로선은 측정 오차를 반영한 95% 신뢰구간입니다. 구간 밖의 의미를 추정하지 말고 숫자와 함께 읽어 주세요." : "The dot is the full-scale IQ estimate and the line is its 95% confidence interval. Read the interval with the number; do not infer precision beyond it."}
        scoreLabel={korean ? "전체 IQ 추정치" : "Full-scale IQ estimate"}
        intervalLabel={korean ? "95% 신뢰구간" : "95% confidence interval"}
        referenceLabel={korean ? "설명 기준 100" : "Descriptive reference 100"}
        scaleLabel={korean ? "40–160 표시 범위 · 눈금과 100 기준선은 설명용이며 연령 규준 환산을 대신하지 않습니다." : "Displayed range 40–160 · ticks and the 100 reference line are descriptive and do not replace age-norm conversion."}
      />
      <p className="text-6xl font-semibold tabular text-hobun" aria-label={korean ? "전체 IQ 추정치" : "Full-scale IQ estimate"}>{score.fullScaleIq}</p>
      <p className="text-sm text-hobun-dim">{korean ? `연령 규준 백분위 ${score.percentile}` : `Age-norm percentile ${score.percentile}`}</p>
      <p className="text-sm text-hobun-dim">{korean ? `95% 신뢰구간 ${lower}–${upper}` : `95% confidence interval ${lower}–${upper}`}</p>
      <p className="border-l border-hobun pl-3 text-sm text-hobun">{bandLabel}</p>
      <p className="border-l border-hobun pl-3 text-xs leading-relaxed text-hobun-faint">
        {korean
          ? "LUMINA 연구용 IQ 추정치이며 임상 진단, 채용, 교육·법적 판단에 사용할 수 없습니다."
          : "This is a LUMINA research IQ estimate, not a clinical diagnosis, hiring decision or legal determination."}
      </p>
      <p className="font-mono text-[11px] text-hobun-faint">{korean ? `규준 버전 ${score.normVersion}` : `Norm version ${score.normVersion}`}</p>
    </section>
  );
}
