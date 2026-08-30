import type { LikertResponses, LikertValue } from "./likert";

/**
 * 설문 진행 표시의 한 칸 — 요인·축·측면 등 "문항 묶음" 하나의 현재 상태.
 *
 * 응답 수만 세던 기존 표시에 잠정 평균을 하나 더 얹는다. 계측기 화면에서 눈금이 살아 움직이는
 * 것과 같은 종류의 피드백이고, 장식이 아니라 지금까지의 응답이 실제로 어디에 놓였는지를 읽어 준다.
 */
export interface SurveySegment {
  readonly key: string;
  readonly label: string;
  readonly answered: number;
  readonly total: number;
  /** 답한 문항들의 채점 후 평균(1~5). 아직 하나도 답하지 않았으면 null. */
  readonly mean: number | null;
}

export interface SegmentSource<TItem> {
  readonly key: string;
  readonly label: string;
  readonly items: readonly TItem[];
}

/**
 * 문항 묶음마다 응답 수와 잠정 평균을 계산한다.
 *
 * 역채점 규칙은 엔진의 몫이므로 채점 함수를 그대로 받아 쓴다 — 화면이 (6 − 응답) 같은 규칙을
 * 다시 적어 두면 엔진과 화면이 언젠가 어긋난다. psychometrics의 previewJungianAxes가
 * 축 단위로 하던 계산을 요인 단위로 일반화한 것이다.
 */
export function buildSegments<TItem extends { readonly id: number }>(
  sources: readonly SegmentSource<TItem>[],
  responses: LikertResponses,
  scoreItem: (item: TItem, value: LikertValue) => number,
): readonly SurveySegment[] {
  return sources.map((source) => {
    const answered = source.items.filter((item) => responses[item.id] !== undefined);
    const sum = source.items.reduce((total, item) => {
      const value = responses[item.id];
      return value === undefined ? total : total + scoreItem(item, value);
    }, 0);
    return {
      key: source.key,
      label: source.label,
      answered: answered.length,
      total: source.items.length,
      mean: answered.length === 0 ? null : sum / answered.length,
    };
  });
}
