import { LIKERT_VALUES, type LikertResponses, type LikertScaleLabels, type LikertValue } from "./likert";

export interface LikertItemView {
  readonly id: number;
  readonly text: string;
}

/**
 * 리커트 문항 목록.
 *
 * DOM 계약이 여기 모여 있다 — 문항마다 <li id="item-{id}">, 그 안에 sr-only 라디오를 감싼
 * <label>이 1~5점 순서로 놓인다. e2e 다섯 편이 이 모양을 그대로 집어 쓰므로 마크업을 바꿀 때는
 * 스펙을 먼저 읽어야 한다.
 */
interface LikertItemListProps {
  readonly items: readonly LikertItemView[];
  /** 페이지가 바뀌어도 원래 설문 문항 번호가 유지되도록 하는 0-based offset. */
  readonly itemNumberOffset?: number;
  readonly responses: LikertResponses;
  readonly scaleLabels: LikertScaleLabels;
  /** 제출을 시도한 뒤에만 미응답 문항에 표시를 남긴다. */
  readonly flagUnanswered: boolean;
  readonly onSelect: (itemId: number, value: LikertValue) => void;
}

export function LikertItemList({
  items,
  itemNumberOffset = 0,
  responses,
  scaleLabels,
  flagUnanswered,
  onSelect,
}: LikertItemListProps) {
  return (
    <ol className="mt-8 space-y-6">
      {items.map((item, index) => {
        const unanswered = flagUnanswered && responses[item.id] === undefined;
        return (
          <li
            key={item.id}
            id={`item-${item.id}`}
            className={`border px-4 py-4 sm:px-5 ${unanswered ? "border-hwa/60" : "border-ink-700"}`}
          >
            <p className="text-sm text-hobun">
              <span className="tabular mr-2 font-mono text-[13px] text-hobun-faint">
                {String(itemNumberOffset + index + 1).padStart(2, "0")}
              </span>
              {item.text}
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {LIKERT_VALUES.map((value) => {
                const checked = responses[item.id] === value;
                return (
                  <label
                    key={value}
                    // 라디오가 sr-only라 포커스 링이 보이지 않는다. 키보드로 문항을 훑는 사람에게
                    // 지금 어느 보기에 서 있는지는 필수 정보이므로 테두리 쪽으로 링을 끌어올린다.
                    className={`flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 border px-1 py-2 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hobun ${
                      checked
                        ? "border-hobun bg-hobun text-ink-900"
                        : "border-ink-700 text-hobun-faint hover:border-ink-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`item-${item.id}`}
                      value={value}
                      checked={checked}
                      onChange={() => onSelect(item.id, value)}
                      className="sr-only"
                    />
                    <span className="tabular font-mono text-xs">{value}</span>
                    <span className="hidden text-[12px] leading-tight sm:block">
                      {scaleLabels[value]}
                    </span>
                  </label>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
