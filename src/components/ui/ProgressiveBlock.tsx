import type { ExplanationBlock } from "@engine/shared/explanation";
import { localizeText } from "@engine/shared/explanation";
import type { Locale } from "@/i18n/locale";
import { CitationList } from "./CitationList";
import { EvidenceChip } from "./EvidenceChip";

interface ProgressiveBlockProps {
  readonly block: ExplanationBlock;
  readonly locale: Locale;
  readonly detailLabel: string;
  readonly methodLabel: string;
  readonly evidenceLabel: string;
  readonly citationLabel: string;
}

/** Three disclosure layers: summary, user-opened detail, and optional method/citations. */
export function ProgressiveBlock({
  block,
  locale,
  detailLabel,
  methodLabel,
  evidenceLabel,
  citationLabel,
}: ProgressiveBlockProps) {
  return (
    <article id={`explanation-${block.id}`} className="progressive-block border-b border-ink-800 py-5 last:border-b-0" data-tier={block.tier}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-base leading-relaxed text-hobun">{localizeText(block.summary, locale)}</p>
        <div className="flex flex-wrap gap-2">
          {block.evidenceRefs.map((ref) => (
            <EvidenceChip key={ref} evidenceRef={ref} label={evidenceLabel} />
          ))}
        </div>
      </div>
      <details className="progressive-details mt-4">
        <summary className="cursor-pointer text-sm text-hobun-dim underline decoration-ink-600 underline-offset-4 hover:text-hobun">
          {detailLabel}
        </summary>
        <div className="mt-4 max-w-2xl text-sm leading-relaxed text-hobun-dim">
          <p>{localizeText(block.detail, locale)}</p>
          {block.method || block.citations.length > 0 ? (
            <details className="progressive-method mt-5 border-l border-ink-600 pl-4">
              <summary className="cursor-pointer font-mono text-[12px] text-hobun-faint">{methodLabel}</summary>
              <div className="mt-3">
                {block.method ? <p>{localizeText(block.method, locale)}</p> : null}
                {block.citations.length > 0 ? (
                  <div>
                    <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-hobun-faint">{citationLabel}</p>
                    <CitationList citations={block.citations} />
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      </details>
    </article>
  );
}
