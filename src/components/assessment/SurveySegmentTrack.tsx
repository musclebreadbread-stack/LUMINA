import type { SurveySegment } from "./segments";

/**
 * 요인·축별 진행과 잠정 평균을 나란히 보여 주는 눈금줄.
 *
 * 칸 수는 척도마다 다르다(3·4·5·2). Tailwind의 grid-cols-* 는 클래스명을 문자열로 조립할 수
 * 없으므로 열 수만 인라인 스타일로 넘긴다 — 척도가 하나 늘어도 이 파일은 그대로 둔다.
 */
interface SurveySegmentTrackProps {
  readonly label: string;
  readonly segments: readonly SurveySegment[];
  /** 잠정 평균을 읽어 줄 현지화 문구. 눈금 위치는 보이지만 값은 화면 낭독기에만 전달된다. */
  readonly formatMean: (mean: number) => string;
}

export function SurveySegmentTrack({ label, segments, formatMean }: SurveySegmentTrackProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="mx-auto mt-3 grid max-w-3xl gap-1"
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      {segments.map((segment) => {
        const counted = `${segment.label} ${segment.answered}/${segment.total}`;
        return (
          <span
            key={segment.key}
            role="img"
            aria-label={
              segment.mean === null ? counted : `${counted} · ${formatMean(segment.mean)}`
            }
            className={`flex min-h-8 flex-col items-center justify-center gap-1.5 border px-1.5 py-1 transition-colors ${
              segment.answered === 0 ? "border-ink-800" : "border-ink-700"
            }`}
          >
            <span aria-hidden className="tabular font-mono text-[12px] text-hobun-faint">
              {segment.answered}/{segment.total}
            </span>
            <span aria-hidden className="relative block h-[0.3rem] w-full rounded-full bg-ink-800">
              {/* 3점(중립)이 어디인지 보이지 않으면 표식의 위치가 아무 뜻도 갖지 못한다. */}
              <span className="absolute inset-y-[-0.15rem] left-1/2 w-px bg-ink-600" />
              {segment.mean !== null && (
                <span
                  className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hobun-dim transition-[left] duration-500 motion-reduce:transition-none"
                  style={{ left: `${((segment.mean - 1) / 4) * 100}%` }}
                />
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}
