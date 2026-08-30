import type { StandardizedScore } from "@engine/cognitive-standardized/types";

interface StandardizedScorePlotProps {
  readonly score: StandardizedScore;
  readonly title: string;
  readonly description: string;
  readonly scoreLabel: string;
  readonly intervalLabel: string;
  readonly referenceLabel: string;
  readonly scaleLabel: string;
}

const SCALE = Object.freeze({ minimum: 40, maximum: 160, left: 32, right: 608, y: 50 });
const TICKS = Object.freeze([40, 70, 85, 100, 115, 130, 160]);

function position(value: number): number {
  const bounded = Math.min(SCALE.maximum, Math.max(SCALE.minimum, value));
  return SCALE.left + ((bounded - SCALE.minimum) / (SCALE.maximum - SCALE.minimum)) * (SCALE.right - SCALE.left);
}

/** A direct, server-rendered view of a standardized score and its 95% interval. */
export function StandardizedScorePlot({
  score,
  title,
  description,
  scoreLabel,
  intervalLabel,
  referenceLabel,
  scaleLabel,
}: StandardizedScorePlotProps) {
  const [lower, upper] = score.confidenceInterval95;
  const scoreX = position(score.fullScaleIq);
  const lowerX = position(lower);
  const upperX = position(upper);
  const meanX = position(100);

  return (
    <figure
      className="border border-ink-700 bg-ink-950/55 p-4 sm:p-5"
      data-testid="standardized-score-plot"
      aria-labelledby="standardized-score-plot-title"
    >
      <figcaption>
        <h2 id="standardized-score-plot-title" className="text-base font-medium text-hobun">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{description}</p>
      </figcaption>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox="0 0 640 132"
          className="mx-auto block min-w-[420px] max-w-[720px] text-hobun"
          role="img"
          aria-labelledby="standardized-score-plot-svg-title standardized-score-plot-svg-description"
        >
          <title id="standardized-score-plot-svg-title">{title}</title>
          <desc id="standardized-score-plot-svg-description">{`${scoreLabel} ${score.fullScaleIq}, ${intervalLabel} ${lower}–${upper}.`}</desc>
          <line x1={SCALE.left} y1={SCALE.y} x2={SCALE.right} y2={SCALE.y} stroke="currentColor" strokeWidth="10" opacity="0.14" />
          <rect x={lowerX} y={SCALE.y - 7} width={Math.max(2, upperX - lowerX)} height="14" fill="currentColor" opacity="0.22" />
          <line x1={meanX} y1={SCALE.y - 19} x2={meanX} y2={SCALE.y + 19} stroke="currentColor" strokeWidth="1.5" opacity="0.68" strokeDasharray="4 4" />
          <line x1={lowerX} y1={SCALE.y} x2={upperX} y2={SCALE.y} stroke="currentColor" strokeWidth="4" opacity="0.7" />
          <circle cx={scoreX} cy={SCALE.y} r="7" fill="currentColor" />
          <text x={scoreX} y={SCALE.y - 25} textAnchor="middle" fontSize="12" fill="currentColor">{score.fullScaleIq}</text>
          {TICKS.map((tick) => {
            const tickX = position(tick);
            return (
              <g key={tick}>
                <line x1={tickX} y1={SCALE.y + 12} x2={tickX} y2={SCALE.y + 20} stroke="currentColor" strokeWidth="1" opacity="0.55" />
                <text x={tickX} y={SCALE.y + 37} textAnchor="middle" fontSize="11" fill="currentColor" opacity={tick === 100 ? "1" : "0.72"}>{tick}</text>
              </g>
            );
          })}
          <text x={meanX} y="113" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.78">{referenceLabel}</text>
        </svg>
      </div>

      <div className="mt-4 grid gap-3 border-t border-ink-800 pt-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-hobun-faint">{scoreLabel}</p>
          <p className="mt-1 font-mono tabular text-hobun">{score.fullScaleIq}</p>
        </div>
        <div>
          <p className="text-xs text-hobun-faint">{intervalLabel}</p>
          <p className="mt-1 font-mono tabular text-hobun">{lower}–{upper}</p>
        </div>
        <p className="border-l border-ink-700 pl-3 text-xs leading-relaxed text-hobun-faint">{scaleLabel}</p>
      </div>
    </figure>
  );
}
