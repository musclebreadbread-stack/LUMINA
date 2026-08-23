export interface Citation {
  readonly authors: readonly string[];
  readonly year: number;
  readonly title: string;
  readonly venue: string;
  readonly url?: string;
}

function formatAuthors(authors: readonly string[]): string {
  if (authors.length === 0) return "Unknown author";
  if (authors.length === 1) return authors[0] ?? "Unknown author";
  if (authors.length === 2) return `${authors[0] ?? ""} & ${authors[1] ?? ""}`;
  const first = authors[0] ?? "Unknown author";
  return `${first}, et al.`;
}

/** Format a compact APA 7-style reference without inventing missing metadata. */
export function formatCitation(citation: Citation): string {
  const title = citation.title.trim().replace(/[.]+$/, "");
  const venue = citation.venue.trim().replace(/[.]+$/, "");
  return `${formatAuthors(citation.authors)} (${citation.year}). ${title}. ${venue}.`;
}

export function citationKey(citation: Citation): string {
  const author = citation.authors[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase() ?? "source";
  return `${author}-${citation.year}-${citation.title
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")}`;
}

export function isValidCitation(citation: Citation): boolean {
  if (citation.authors.length === 0 || !Number.isInteger(citation.year)) return false;
  if (!citation.title.trim() || !citation.venue.trim()) return false;
  if (!citation.url) return true;
  try {
    const url = new URL(citation.url);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
