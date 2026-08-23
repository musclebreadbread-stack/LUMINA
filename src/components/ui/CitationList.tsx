import type { Citation } from "@engine/shared/citation";
import { formatCitation } from "@engine/shared/citation";

export function CitationList({ citations }: { readonly citations: readonly Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <ol className="mt-4 space-y-2 border-t border-ink-800 pt-4 text-xs leading-relaxed text-hobun-faint">
      {citations.map((citation) => (
        <li key={`${citation.year}-${citation.title}`}>
          {formatCitation(citation)}
          {citation.url ? (
            <a
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              className="ml-1 underline underline-offset-2 hover:text-hobun"
            >
              ↗
            </a>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
