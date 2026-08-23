export function calculationAnchorId(evidenceRef: string): string {
  return `calculation-${evidenceRef.replace(/[^a-z0-9:_-]/gi, "-")}`;
}

export function EvidenceChip({ evidenceRef, label }: { readonly evidenceRef: string; readonly label: string }) {
  return (
    <a
      href={`#${calculationAnchorId(evidenceRef)}`}
      className="relative inline-flex items-center border border-ink-600 px-2 py-1 font-mono text-[11px] text-hobun-faint transition-colors after:absolute after:inset-x-[-0.25rem] after:inset-y-[-0.625rem] after:content-[''] hover:border-hobun hover:text-hobun"
    >
      {label}
    </a>
  );
}
