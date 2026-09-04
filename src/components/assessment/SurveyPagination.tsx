interface SurveyPaginationProps {
  readonly currentPage: number;
  readonly pageCount: number;
  readonly label: string;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

export function SurveyPagination({
  currentPage,
  pageCount,
  label,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: SurveyPaginationProps) {
  return (
    <nav className="mt-6 flex items-center justify-between gap-4" aria-label={label}>
      <button
        type="button"
        className="min-h-11 border border-ink-700 px-4 text-sm text-hobun-dim transition-colors hover:border-hobun/60 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={currentPage === 0}
        onClick={onPrevious}
      >
        {previousLabel}
      </button>
      <p className="font-mono text-xs text-hobun-faint">{label}</p>
      <button
        type="button"
        className="min-h-11 border border-hobun/60 px-4 text-sm text-hobun transition-colors hover:bg-hobun/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={currentPage >= pageCount - 1}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
