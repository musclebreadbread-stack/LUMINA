import type { ResponseQuality } from "@/lib/responseQuality";

export function ResponseQualityNotice({
  quality,
  title,
  uniformBody,
  narrowRangeBody,
}: {
  readonly quality: ResponseQuality;
  readonly title: string;
  readonly uniformBody: string;
  readonly narrowRangeBody: string;
}) {
  if (quality.flag === null) return null;

  return (
    <aside
      data-testid="response-quality-notice"
      className="mb-6 border-l border-hobun/70 bg-ink-950/60 px-4 py-3 text-sm leading-relaxed text-hobun-dim"
    >
      <p className="font-medium text-hobun">{title}</p>
      <p className="mt-1">{quality.flag === "uniform" ? uniformBody : narrowRangeBody}</p>
    </aside>
  );
}
