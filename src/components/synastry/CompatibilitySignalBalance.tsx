interface CompatibilitySignalBalanceProps {
  readonly title: string;
  readonly description: string;
  readonly supportiveLabel: string;
  readonly challengingLabel: string;
  readonly stemLabel: string;
  readonly supportiveCount: number;
  readonly challengingCount: number;
  readonly stemRelationCount: number;
}

function barWidth(value: number, maximum: number): number {
  return maximum <= 0 ? 0 : (value / maximum) * 100;
}

/** A count-based cultural signal graphic; it intentionally is not a compatibility score. */
export function CompatibilitySignalBalance({
  title,
  description,
  supportiveLabel,
  challengingLabel,
  stemLabel,
  supportiveCount,
  challengingCount,
  stemRelationCount,
}: CompatibilitySignalBalanceProps) {
  const maximum = Math.max(1, supportiveCount, challengingCount);

  return (
    <figure
      className="mt-6 border border-ink-700 bg-ink-950/55 p-4 sm:p-5"
      data-testid="compatibility-signal-balance"
      aria-labelledby="compatibility-signal-balance-title"
    >
      <figcaption>
        <h3 id="compatibility-signal-balance-title" className="text-base font-medium text-hobun">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-hobun-faint">{description}</p>
      </figcaption>
      <div className="mt-6 space-y-5">
        <SignalRow label={supportiveLabel} value={supportiveCount} maximum={maximum} />
        <SignalRow label={challengingLabel} value={challengingCount} maximum={maximum} />
      </div>
      <div className="mt-5 border-t border-ink-800 pt-4">
        <p className="text-xs text-hobun-faint">{stemLabel}</p>
        <p className="mt-1 font-mono text-lg tabular text-hobun">{stemRelationCount}</p>
      </div>
    </figure>
  );
}

function SignalRow({ label, value, maximum }: { readonly label: string; readonly value: number; readonly maximum: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-hobun">{label}</span>
        <span className="font-mono tabular text-hobun-dim">{value}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink-800" aria-hidden="true">
        <div className="h-full bg-hobun/65 transition-[width] duration-500" style={{ width: `${barWidth(value, maximum)}%` }} />
      </div>
    </div>
  );
}
