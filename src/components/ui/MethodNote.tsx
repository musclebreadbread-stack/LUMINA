import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { localizeText } from "@engine/shared/explanation";
import type { Locale } from "@/i18n/locale";
import { CitationList } from "./CitationList";

interface MethodNoteProps {
  readonly locale: Locale;
  readonly title: string;
  readonly block?: Pick<ExplanationBlock, "method" | "citations">;
  readonly method?: LocalizedText;
  readonly citations?: ExplanationBlock["citations"];
  readonly children?: React.ReactNode;
}

/** Always-visible calculation method note; it is intentionally not a details block. */
export function MethodNote({ locale, title, block, method, citations, children }: MethodNoteProps) {
  const resolvedMethod = method ?? block?.method;
  const resolvedCitations = citations ?? block?.citations ?? [];
  return (
    <aside className="method-note border border-ink-700 bg-ink-850/45 p-4 sm:p-5" aria-label={title}>
      <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-hobun-faint">{title}</p>
      {resolvedMethod ? (
        <p className="mt-3 text-sm leading-relaxed text-hobun-dim">{localizeText(resolvedMethod, locale)}</p>
      ) : null}
      {children}
      <CitationList citations={resolvedCitations} />
    </aside>
  );
}
