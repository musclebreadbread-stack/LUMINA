import type { ReactNode } from "react";

/**
 * 설문 상단에 고정되는 진행 표시.
 *
 * 네 개의 리커트 설문(빅파이브·다크 트라이어드·EQ·애착)이 각자 같은 마크업을 따로 들고 있었다.
 * 하나로 모으면서 완료 상태만 하나 더한다 — 마지막 문항을 채운 순간이 화면에서 드러나야
 * "다 됐나?" 하고 제출 버튼을 눌러 보는 일이 사라진다.
 */
interface SurveyProgressHeaderProps {
  readonly answered: number;
  readonly total: number;
  /** 모든 문항에 답했을 때만 나타나는 완료 문구. */
  readonly completeLabel: string;
  /** 요인·축별 진행 표시처럼 진행률 아래에 붙는 계측 정보. */
  readonly children?: ReactNode;
}

export function SurveyProgressHeader({
  answered,
  total,
  completeLabel,
  children,
}: SurveyProgressHeaderProps) {
  const complete = total > 0 && answered >= total;
  const ratio = total === 0 ? 0 : Math.min(answered / total, 1);

  return (
    <div className="sticky top-0 z-10 -mx-5 border-b border-ink-700 bg-ink-900/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <p className="tabular font-mono text-[13px] text-hobun-faint">
          {answered} / {total}
        </p>
        {complete && (
          <p className="font-mono text-[11px] tracking-[0.12em] text-hobun">{completeLabel}</p>
        )}
        <div className={`h-1 w-32 sm:w-48 ${complete ? "bg-hobun/25" : "bg-ink-800"}`}>
          <div
            className={`h-1 transition-[width] duration-300 motion-reduce:transition-none ${
              complete ? "bg-hobun" : "bg-hobun-dim"
            }`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
