interface EvidenceCompositionProps {
  readonly title: string;
  readonly description: string;
  readonly analysesLabel: string;
  readonly provenanceLabel: string;
  readonly scientificLabel: string;
  readonly culturalLabel: string;
  readonly analyses: number;
  readonly provenanceGroups: number;
  readonly scientificSignals: number;
  readonly culturalSignals: number;
}

interface CompositionRowProps {
  readonly label: string;
  readonly value: number;
  readonly maximum: number;
}

function width(value: number, maximum: number): number {
  return maximum <= 0 ? 0 : (value / maximum) * 100;
}

/** Counts the evidence composition without turning separate lanes into one score. */
export function EvidenceComposition({
  title,
  description,
  analysesLabel,
  provenanceLabel,
  scientificLabel,
  culturalLabel,
  analyses,
  provenanceGroups,
  scientificSignals,
  culturalSignals,
}: EvidenceCompositionProps) {
  const maximum = Math.max(1, analyses, provenanceGroups, scientificSignals, culturalSignals);

  return (
    <figure className="mt-8 border border-ink-700 bg-ink-950/50 p-5 sm:p-6" data-testid="integrated-evidence-composition">
      <figcaption>
        <h2 className="text-lg font-medium text-hobun">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hobun-dim">{description}</p>
      </figcaption>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <CompositionRow label={analysesLabel} value={analyses} maximum={maximum} />
        <CompositionRow label={provenanceLabel} value={provenanceGroups} maximum={maximum} />
        <CompositionRow label={scientificLabel} value={scientificSignals} maximum={maximum} />
        <CompositionRow label={culturalLabel} value={culturalSignals} maximum={maximum} />
      </div>
    </figure>
  );
}

function CompositionRow({ label, value, maximum }: CompositionRowProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-hobun">{label}</span>
        <span className="font-mono text-lg tabular text-hobun">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800" aria-hidden="true">
        <div className="h-full bg-hobun/55" style={{ width: `${width(value, maximum)}%` }} />
      </div>
    </div>
  );
}
