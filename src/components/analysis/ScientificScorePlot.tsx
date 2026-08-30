export interface ScientificScorePoint {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly interval?: readonly [number, number];
  readonly reference?: {
    readonly mean: number;
    readonly standardDeviation: number;
    readonly percentile?: number;
    readonly tScore?: number;
    readonly sampleSize?: number;
  };
}

export interface ScientificScorePlotLabels {
  readonly observed: string;
  readonly interval: string;
  readonly reference: string;
  readonly noReference: string;
  readonly range: string;
  readonly low: string;
  readonly high: string;
  readonly table: string;
  readonly value: string;
  readonly percentile: string;
  readonly tScore: string;
  readonly sample: string;
}

interface ScientificScorePlotProps {
  readonly title: string;
  readonly description: string;
  readonly points: readonly ScientificScorePoint[];
  readonly labels: ScientificScorePlotLabels;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toPosition(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum <= minimum) {
    return 0;
  }
  return clamp(((value - minimum) / (maximum - minimum)) * 100, 0, 100);
}

function rangeLabel(point: ScientificScorePoint, labels: ScientificScorePlotLabels): string {
  return `${labels.range} ${point.minimum}–${point.maximum}`;
}

/**
 * Server-rendered interval plot for score comparison.
 *
 * The plot deliberately keeps each row on its own theoretical scale. It is a
 * comparison of positions within instruments, not a claim that raw scores
 * from different instruments are directly comparable.
 */
export function ScientificScorePlot({ title, description, points, labels }: ScientificScorePlotProps) {
  const hasReference = points.some((point) => point.reference !== undefined);

  return (
    <figure className="scientific-score-plot border border-ink-700 bg-ink-950/55 p-4 sm:p-5" data-testid="scientific-score-plot">
      <figcaption>
        <h3 className="text-base font-medium text-hobun">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{description}</p>
      </figcaption>

      <div className="mt-6 space-y-5" aria-hidden="true">
        {points.map((point) => {
          const observedPosition = toPosition(point.value, point.minimum, point.maximum);
          const intervalStart = point.interval === undefined
            ? observedPosition
            : toPosition(point.interval[0], point.minimum, point.maximum);
          const intervalEnd = point.interval === undefined
            ? observedPosition
            : toPosition(point.interval[1], point.minimum, point.maximum);
          const intervalWidth = Math.max(1, intervalEnd - intervalStart);
          const referenceStart = point.reference
            ? toPosition(
                point.reference.mean - point.reference.standardDeviation,
                point.minimum,
                point.maximum,
              )
            : 0;
          const referenceEnd = point.reference
            ? toPosition(
                point.reference.mean + point.reference.standardDeviation,
                point.minimum,
                point.maximum,
              )
            : 0;
          const referenceWidth = Math.max(1, referenceEnd - referenceStart);
          const referenceMean = point.reference
            ? toPosition(point.reference.mean, point.minimum, point.maximum)
            : 0;

          return (
            <div key={point.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-hobun">{point.label}</span>
                <span className="tabular font-mono text-[13px] text-hobun-dim">
                  {labels.observed} {point.value.toFixed(1)}
                </span>
              </div>
              <svg viewBox="0 0 600 40" className="mt-2 h-8 w-full text-hobun" focusable="false">
                <line x1="0" y1="20" x2="600" y2="20" stroke="currentColor" strokeWidth="8" opacity="0.12" />
                <line x1="300" y1="11" x2="300" y2="29" stroke="currentColor" strokeWidth="1" opacity="0.35" />
                {point.reference ? (
                  <>
                    <rect
                      x={`${referenceStart * 6}`}
                      y="14"
                      width={`${referenceWidth * 6}`}
                      height="12"
                      fill="currentColor"
                      opacity="0.12"
                    />
                    <line
                      x1={`${referenceMean * 6}`}
                      y1="9"
                      x2={`${referenceMean * 6}`}
                      y2="31"
                      stroke="currentColor"
                      strokeWidth="1"
                      opacity="0.65"
                    />
                  </>
                ) : null}
                {point.interval ? (
                  <line
                    x1={`${intervalStart * 6}`}
                    y1="20"
                    x2={`${(intervalStart + intervalWidth) * 6}`}
                    y2="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    opacity="0.6"
                  />
                ) : null}
                <circle cx={`${observedPosition * 6}`} cy="20" r="5" fill="currentColor" />
              </svg>
              <div className="flex justify-between gap-3 text-[11px] text-hobun-faint">
                <span>{labels.low} {point.minimum}</span>
                <span>{rangeLabel(point, labels)}</span>
                <span>{labels.high} {point.maximum}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-hobun-faint">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-hobun align-middle" aria-hidden="true" />
          {labels.observed}
        </span>
        {hasReference || points.some((point) => point.interval !== undefined) ? (
          <span>
            <span className="mr-1 inline-block h-1 w-5 bg-hobun/60 align-middle" aria-hidden="true" />
            {labels.interval}
          </span>
        ) : null}
        {hasReference ? (
          <span>
            <span className="mr-1 inline-block h-2 w-5 border-y border-hobun/50 bg-hobun/10 align-middle" aria-hidden="true" />
            {labels.reference}
          </span>
        ) : null}
      </div>

      <details className="mt-5 border-t border-ink-800 pt-4">
        <summary className="cursor-pointer text-sm text-hobun-dim underline decoration-ink-600 underline-offset-4">
          {labels.table}
        </summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs">
            <caption className="sr-only">{title}</caption>
            <thead className="border-b border-ink-700 text-hobun-faint">
              <tr>
                <th className="py-2 pr-4 font-normal">{labels.value}</th>
                <th className="py-2 pr-4 font-normal">{labels.interval}</th>
                <th className="py-2 pr-4 font-normal">{labels.percentile}</th>
                <th className="py-2 pr-4 font-normal">{labels.tScore}</th>
                <th className="py-2 font-normal">{labels.sample}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.key} className="border-b border-ink-800 text-hobun-dim">
                  <th scope="row" className="py-2 pr-4 font-medium text-hobun">{point.label} · {point.value.toFixed(1)}</th>
                  <td className="py-2 pr-4 tabular">{point.interval === undefined ? labels.noReference : `${point.interval[0].toFixed(1)}–${point.interval[1].toFixed(1)}`}</td>
                  <td className="py-2 pr-4 tabular">{point.reference?.percentile === undefined ? labels.noReference : point.reference.percentile}</td>
                  <td className="py-2 pr-4 tabular">{point.reference?.tScore === undefined ? labels.noReference : point.reference.tScore.toFixed(1)}</td>
                  <td className="py-2 tabular">{point.reference?.sampleSize === undefined ? labels.noReference : point.reference.sampleSize.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
