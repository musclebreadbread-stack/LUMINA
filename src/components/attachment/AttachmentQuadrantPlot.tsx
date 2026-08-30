interface AttachmentQuadrantPlotProps {
  readonly anxiety: number;
  readonly avoidance: number;
  readonly title: string;
  readonly description: string;
  readonly scaleLabel: string;
  readonly boundaryLabel: string;
  readonly selectedLabel: string;
  readonly noNormLabel: string;
  readonly anxietyLabel: string;
  readonly avoidanceLabel: string;
  readonly lowLabel: string;
  readonly highLabel: string;
  readonly quadrantLabels: {
    readonly secure: string;
    readonly anxious: string;
    readonly avoidant: string;
    readonly fearful: string;
  };
  readonly classificationLabel: string;
}

const PLOT = Object.freeze({
  left: 58,
  top: 22,
  width: 338,
  height: 226,
  minimum: 1,
  maximum: 5,
  boundary: 3.5,
});

function clamp(value: number): number {
  return Math.min(PLOT.maximum, Math.max(PLOT.minimum, value));
}

function xPosition(value: number): number {
  return PLOT.left + ((clamp(value) - PLOT.minimum) / (PLOT.maximum - PLOT.minimum)) * PLOT.width;
}

function yPosition(value: number): number {
  return PLOT.top + PLOT.height - ((clamp(value) - PLOT.minimum) / (PLOT.maximum - PLOT.minimum)) * PLOT.height;
}

/**
 * Exploratory attachment position plot.
 *
 * The component deliberately renders a scale position rather than a normed
 * percentile. The 3.5 boundary is the existing exploratory classification
 * rule, not a validated population cut-off.
 */
export function AttachmentQuadrantPlot({
  anxiety,
  avoidance,
  title,
  description,
  scaleLabel,
  boundaryLabel,
  selectedLabel,
  noNormLabel,
  anxietyLabel,
  avoidanceLabel,
  lowLabel,
  highLabel,
  quadrantLabels,
  classificationLabel,
}: AttachmentQuadrantPlotProps) {
  const boundaryX = xPosition(PLOT.boundary);
  const boundaryY = yPosition(PLOT.boundary);
  const pointX = xPosition(avoidance);
  const pointY = yPosition(anxiety);

  return (
    <figure
      className="border border-ink-700 bg-ink-950/55 p-4 sm:p-5"
      data-testid="attachment-quadrant-plot"
      aria-labelledby="attachment-quadrant-plot-title"
    >
      <figcaption>
        <h3 id="attachment-quadrant-plot-title" className="text-base font-medium text-hobun">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{description}</p>
      </figcaption>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox="0 0 470 300"
          className="mx-auto block min-w-[360px] max-w-[620px] text-hobun"
          role="img"
          aria-labelledby="attachment-quadrant-plot-svg-title attachment-quadrant-plot-svg-description"
        >
          <title id="attachment-quadrant-plot-svg-title">{title}</title>
          <desc id="attachment-quadrant-plot-svg-description">{`${selectedLabel}: ${classificationLabel}. ${anxietyLabel} ${anxiety.toFixed(2)}, ${avoidanceLabel} ${avoidance.toFixed(2)}.`}</desc>
          <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill="currentColor" opacity="0.035" />
          <rect x={PLOT.left} y={PLOT.top} width={boundaryX - PLOT.left} height={boundaryY - PLOT.top} fill="currentColor" opacity="0.055" />
          <rect x={boundaryX} y={PLOT.top} width={PLOT.left + PLOT.width - boundaryX} height={boundaryY - PLOT.top} fill="currentColor" opacity="0.025" />
          <rect x={PLOT.left} y={boundaryY} width={boundaryX - PLOT.left} height={PLOT.top + PLOT.height - boundaryY} fill="currentColor" opacity="0.025" />
          <rect x={boundaryX} y={boundaryY} width={PLOT.left + PLOT.width - boundaryX} height={PLOT.top + PLOT.height - boundaryY} fill="currentColor" opacity="0.055" />
          <line x1={PLOT.left} y1={boundaryY} x2={PLOT.left + PLOT.width} y2={boundaryY} stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeDasharray="5 5" />
          <line x1={boundaryX} y1={PLOT.top} x2={boundaryX} y2={PLOT.top + PLOT.height} stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeDasharray="5 5" />
          <rect x={PLOT.left} y={PLOT.top} width={PLOT.width} height={PLOT.height} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" />

          <text x={(PLOT.left + boundaryX) / 2} y={PLOT.top + 26} textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.78">{quadrantLabels.anxious}</text>
          <text x={(boundaryX + PLOT.left + PLOT.width) / 2} y={PLOT.top + 26} textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.78">{quadrantLabels.fearful}</text>
          <text x={(PLOT.left + boundaryX) / 2} y={PLOT.top + PLOT.height - 16} textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.78">{quadrantLabels.secure}</text>
          <text x={(boundaryX + PLOT.left + PLOT.width) / 2} y={PLOT.top + PLOT.height - 16} textAnchor="middle" fontSize="13" fill="currentColor" opacity="0.78">{quadrantLabels.avoidant}</text>

          <line x1={PLOT.left} y1={PLOT.top + PLOT.height + 18} x2={PLOT.left + PLOT.width} y2={PLOT.top + PLOT.height + 18} stroke="currentColor" strokeWidth="1" opacity="0.45" />
          <text x={PLOT.left} y={PLOT.top + PLOT.height + 38} textAnchor="start" fontSize="11" fill="currentColor" opacity="0.7">{lowLabel}</text>
          <text x={PLOT.left + PLOT.width} y={PLOT.top + PLOT.height + 38} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.7">{highLabel}</text>
          <text x={PLOT.left + PLOT.width / 2} y={PLOT.top + PLOT.height + 38} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.85">{avoidanceLabel}</text>

          <line x1={PLOT.left - 18} y1={PLOT.top} x2={PLOT.left - 18} y2={PLOT.top + PLOT.height} stroke="currentColor" strokeWidth="1" opacity="0.45" />
          <text x={PLOT.left - 28} y={PLOT.top + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.7">{highLabel}</text>
          <text x={PLOT.left - 28} y={PLOT.top + PLOT.height} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.7">{lowLabel}</text>
          <text x={18} y={PLOT.top + PLOT.height / 2} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.85" transform={`rotate(-90 18 ${PLOT.top + PLOT.height / 2})`}>{anxietyLabel}</text>

          <circle cx={pointX} cy={pointY} r="10" fill="currentColor" opacity="0.16" />
          <circle cx={pointX} cy={pointY} r="5.5" fill="currentColor" />
          <line x1={pointX} y1={pointY - 16} x2={pointX} y2={pointY - 10} stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <text x={pointX} y={pointY - 20} textAnchor="middle" fontSize="11" fill="currentColor">{selectedLabel}</text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-hobun-faint">
        <span>{scaleLabel}</span>
        <span>{boundaryLabel}</span>
      </div>
      <div className="mt-4 grid gap-3 border-t border-ink-800 pt-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-hobun-faint">{anxietyLabel}</p>
          <p className="mt-1 font-mono tabular text-hobun">{anxiety.toFixed(2)} / 5.00</p>
        </div>
        <div>
          <p className="text-xs text-hobun-faint">{avoidanceLabel}</p>
          <p className="mt-1 font-mono tabular text-hobun">{avoidance.toFixed(2)} / 5.00</p>
        </div>
        <p className="border-l border-ink-700 pl-3 text-xs leading-relaxed text-hobun-faint">{noNormLabel}</p>
      </div>
    </figure>
  );
}
