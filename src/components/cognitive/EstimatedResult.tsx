import type { EstimatedIqBand, EstimatedScore, StandardizedDomain } from "@engine/cognitive-standardized/types";
import { estimatedIqBand } from "@engine/cognitive-standardized/estimate";
import { MotionSafeImage } from "@/components/ui/MotionSafeImage";
import { COGNITIVE_OVERVIEW_IMAGE } from "@/lib/psychometricsAssets";
import type { Locale } from "@/i18n/locale";
import { ResultSceneLayer } from "@/components/scene3d/ResultSceneLayer";

interface EstimatedResultProps {
  readonly score: EstimatedScore;
  readonly locale: Locale;
  readonly imageAlt: string;
}

const BAND_LABELS: Readonly<Record<EstimatedIqBand, Readonly<{ ko: string; en: string }>>> = {
  well_below_average: { ko: "평균보다 상당히 낮은 범위", en: "A range well below average" },
  below_average: { ko: "평균보다 낮은 범위", en: "A range below average" },
  average: { ko: "평균에 가까운 범위", en: "A range around average" },
  above_average: { ko: "평균보다 높은 범위", en: "A range above average" },
  well_above_average: { ko: "평균보다 상당히 높은 범위", en: "A range well above average" },
  exceptionally_high: { ko: "매우 드물게 높은 범위", en: "An exceptionally high range" },
};

const DOMAIN_LABELS: Readonly<Record<StandardizedDomain, Readonly<{ ko: string; en: string }>>> = {
  gf: { ko: "유동추론", en: "Fluid reasoning" },
  gc: { ko: "결정지능", en: "Crystallized knowledge" },
  gv: { ko: "시공간처리", en: "Visual-spatial processing" },
  gwm: { ko: "작업기억", en: "Working memory" },
  gs: { ko: "처리속도", en: "Processing speed" },
};

const DOMAIN_ORDER: readonly StandardizedDomain[] = ["gf", "gc", "gv", "gwm", "gs"];

const BAND_CUT_IQ: readonly number[] = [70, 85, 115, 130, 145];

function zFromIq(iq: number): number {
  return (iq - 100) / 15;
}

function zToX(z: number): number {
  const clamped = Math.max(-4, Math.min(4, z));
  return 10 + ((clamped + 4) / 8) * 300;
}

function densityToY(z: number): number {
  const density = Math.exp(-(z * z) / 2);
  return 100 - density * 88;
}

function normalCurvePath(): string {
  const points: string[] = [];
  for (let i = 0; i <= 32; i += 1) {
    const z = -4 + (8 * i) / 32;
    points.push(`${zToX(z).toFixed(1)},${densityToY(z).toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
}

/**
 * θ~N(0,1) 이론 분포 가정으로 계산한 연구용 IQ 추정치를 보여준다. `EstimatedScore`는
 * 승인된 규준이 아니므로, 화면 어디에도 IQ 숫자만 단독으로 노출하지 않고
 * "이론 분포 기반 추정치" 라벨과 항상 같은 시야에 둔다.
 */
export function EstimatedResult({ score, locale, imageAlt }: EstimatedResultProps) {
  const korean = locale === "ko";
  const [lower, upper] = score.confidenceInterval95;
  const band = estimatedIqBand(score.fullScaleIq);
  const bandLabel = korean ? BAND_LABELS[band].ko : BAND_LABELS[band].en;
  const userZ = zFromIq(score.fullScaleIq);
  const lowerZ = zFromIq(lower);
  const upperZ = zFromIq(upper);
  const curveAlt = korean
    ? `θ 이론 분포 곡선. 추정 IQ ${score.fullScaleIq}, 백분위 ${score.percentile}, 95% 신뢰구간 ${lower}–${upper}.`
    : `Theoretical distribution curve. Estimated IQ ${score.fullScaleIq}, percentile ${score.percentile}, 95% CI ${lower}–${upper}.`;

  return (
    <section className="space-y-5 border border-hobun p-6" aria-labelledby="estimated-result-title">
      <p className="font-mono text-xs tracking-[0.18em] text-hobun-faint">LUMINA / ESTIMATE</p>
      <h1 id="estimated-result-title" className="text-3xl font-semibold text-hobun">
        {korean ? "추정 결과" : "Estimated result"}
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

      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-6xl font-semibold tabular text-hobun" aria-label={korean ? "추정 IQ" : "Estimated IQ"}>
          {score.fullScaleIq}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-hobun-faint">
          {korean ? "이론 분포 기반 추정치" : "theoretical-distribution estimate"}
        </p>
      </div>
      <p className="text-sm text-hobun-dim">{korean ? `백분위 ${score.percentile}` : `Percentile ${score.percentile}`}</p>
      <p className="text-sm text-hobun-dim">{korean ? `95% 신뢰구간 ${lower}–${upper}` : `95% confidence interval ${lower}–${upper}`}</p>
      <p className="text-xs text-hobun-faint">
        {korean
          ? `표준오차(θ 척도) ${score.sem.toFixed(2)} — 문항 20개짜리 짧은 검사라 신뢰구간이 넓습니다.`
          : `Standard error (θ scale) ${score.sem.toFixed(2)} — a short 20-item test yields a wide interval.`}
      </p>
      <p className="border-l border-hobun pl-3 text-sm text-hobun">{bandLabel}</p>

      <svg viewBox="0 0 320 112" role="img" aria-label={curveAlt} className="w-full max-w-md">
        <path d={normalCurvePath()} className="fill-none stroke-hobun-dim" strokeWidth={1.5} />
        <rect
          x={zToX(lowerZ)}
          y={10}
          width={Math.max(0, zToX(upperZ) - zToX(lowerZ))}
          height={92}
          className="fill-hobun"
          style={{ opacity: 0.15 }}
        />
        {BAND_CUT_IQ.map((iq) => (
          <line
            key={iq}
            x1={zToX(zFromIq(iq))}
            x2={zToX(zFromIq(iq))}
            y1={100}
            y2={106}
            className="stroke-hobun-faint"
            strokeWidth={1}
          />
        ))}
        <line x1={zToX(userZ)} x2={zToX(userZ)} y1={10} y2={102} className="stroke-hobun" strokeWidth={2} />
        <circle cx={zToX(userZ)} cy={densityToY(userZ)} r={3} className="fill-hobun" />
      </svg>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-hobun">{korean ? "영역별 정답률" : "Accuracy by domain"}</h2>
        <div className="space-y-1.5">
          {DOMAIN_ORDER.map((domain) => {
            const entry = score.domains.find((row) => row.domain === domain);
            if (entry === undefined) return null;
            const label = korean ? DOMAIN_LABELS[domain].ko : DOMAIN_LABELS[domain].en;
            return (
              <div key={domain} className="flex items-center justify-between gap-3 text-sm text-hobun-dim">
                <span>{label}</span>
                <span className="font-mono tabular">
                  {entry.correctCount} / {entry.itemCount}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-hobun-faint">
          {korean
            ? "영역당 문항이 4개뿐이라 25%p 단위로만 구분되며, 우연으로도 크게 뒤집힐 수 있는 해상도입니다."
            : "Each domain has only 4 items, so accuracy moves in 25-point steps and can flip widely by chance."}
        </p>
      </div>

      <div className="space-y-2 border-l border-hobun pl-3">
        <p className="text-xs leading-relaxed text-hobun-dim">
          {korean
            ? "이 점수는 능력 추정치(θ)가 표준정규분포 N(0,1)을 따른다고 가정하고 IQ = 100 + 15θ 공식으로 환산한 값입니다. 실제 한국 성인 표본으로 만든 규준이 아닙니다."
            : "This score assumes the ability estimate (θ) follows the standard normal distribution N(0,1) and converts it with IQ = 100 + 15θ. It is not derived from an actual Korean adult norm sample."}
        </p>
        <p className="text-xs leading-relaxed text-hobun-dim">
          {korean
            ? "승인된 규준이 확보되면 같은 결과 화면이 자동으로 표준화 점수로 대체됩니다."
            : "Once an approved norm is available, this same result page switches to a standardized score automatically."}
        </p>
      </div>

      <p className="border-l border-hobun pl-3 text-xs leading-relaxed text-hobun-faint">
        {korean
          ? "LUMINA 연구용 IQ 추정치이며 임상 진단, 채용, 교육·법적 판단에 사용할 수 없습니다."
          : "This is a LUMINA research IQ estimate, not a clinical diagnosis, hiring decision or legal determination."}
      </p>
      <p className="font-mono text-[11px] text-hobun-faint">
        {korean ? `응답 문항 수 ${score.answeredCount}개` : `${score.answeredCount} items answered`}
      </p>
    </section>
  );
}
