export interface StatisticalReadingGuideItem {
  readonly label: string;
  readonly body: string;
}

interface StatisticalReadingGuideProps {
  readonly id?: string;
  readonly title: string;
  readonly intro: string;
  readonly items: readonly StatisticalReadingGuideItem[];
}

/** Short, plain-language bridge from a statistical graphic to its interpretation. */
export function StatisticalReadingGuide({ id, title, intro, items }: StatisticalReadingGuideProps) {
  const headingId = id ?? "statistical-reading-guide-title";

  return (
    <section className="mt-6 border-l-2 border-hobun/40 bg-ink-950/40 p-4 sm:p-5" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-base font-medium text-hobun">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-hobun-dim">{intro}</p>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {items.map((item, index) => (
          <li key={item.label} className="border-t border-ink-700 pt-3">
            <p className="font-mono text-[11px] tracking-[0.16em] text-hobun-faint">{String(index + 1).padStart(2, "0")}</p>
            <h4 className="mt-2 text-sm font-medium text-hobun">{item.label}</h4>
            <p className="mt-2 text-xs leading-relaxed text-hobun-dim">{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
