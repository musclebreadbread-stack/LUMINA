import {
  DOMAINS,
  ITEMS,
  itemsOfDomain,
  type CognitiveDomain,
  type Item,
} from "./items";

/**
 * 인지능력 탐색 채점기.
 *
 * 기존 네 검사(빅파이브·다크 트라이어드·애착·EQ)는 모두 자기보고 리커트라 "정답"이라는 개념이 없었다.
 * 여기서는 처음으로 정답이 있는 능력 문항을 다루므로 채점 규칙이 완전히 다르다 —
 * 역채점도, 요인 평균도 없고 맞았는지 틀렸는지만 있다.
 *
 * 내는 값은 정답 수와 정답률뿐이다. 백분위·z점수·T점수·IQ 환산치는 계산하지 않는다.
 * 이 문항들에 답한 규준 표본이 존재하지 않기 때문이다(provenance.ts 참조).
 *
 * 시간은 채점에 쓰이지 않는다. 엔진은 시간을 **읽지 않고**, 클라이언트가 잰 경과 시간을
 * 선택적으로 주입받아 그대로 되돌려 줄 뿐이다. 공유 링크가 몇 달 뒤에도 같은 결과를 내야 하므로
 * 엔진 안에서 현재 시각을 보는 일은 없다.
 */

/** 문항 id → 선택한 보기의 색인(0부터). */
export type ResponseMap = Readonly<Record<number, number>>;

/** 문항 id → 그 문항에 머문 시간(밀리초). 클라이언트가 재서 넣어 준다. */
export type ElapsedMsMap = Readonly<Record<number, number>>;

export class CognitiveInputError extends Error {
  constructor(
    message: string,
    readonly missingItemIds: readonly number[] = [],
    readonly invalidItemIds: readonly number[] = [],
  ) {
    super(message);
    this.name = "CognitiveInputError";
  }
}

export interface ItemResult {
  readonly itemId: number;
  readonly domain: CognitiveDomain;
  readonly chosenOptionIndex: number;
  readonly correctOptionIndex: number;
  readonly isCorrect: boolean;
  /** 주입되지 않았으면 null. 0은 "매우 빨랐다"이지 "모른다"가 아니므로 구분한다. */
  readonly elapsedMs: number | null;
  readonly recommendedSeconds: number;
}

/** 영역 점수. 기존 FactorScore와 같은 자리에 놓고 그릴 수 있도록 필드 이름을 맞춰 둔다. */
export interface DomainScore {
  readonly domain: CognitiveDomain;
  readonly correctCount: number;
  readonly itemCount: number;
  /** 정답률 0~100. 규준 백분위가 아니라 이 4문항 안에서의 정답 비율이다. */
  readonly accuracy0to100: number;
  /** 이 영역 문항의 경과 시간 합. 하나도 주입되지 않았으면 null. */
  readonly elapsedMs: number | null;
  readonly itemResults: readonly ItemResult[];
}

export interface CognitiveResult {
  readonly domains: readonly DomainScore[];
  readonly correctCount: number;
  readonly itemCount: number;
  /** 전체 정답률 0~100. 이 검사가 내는 가장 요약된 값이며, 여기서 더 나아가지 않는다. */
  readonly accuracy0to100: number;
  readonly totalElapsedMs: number | null;
  /** 문항 순서 그대로. 오답 복기 화면이 이 배열만 보면 되도록 평평하게도 담아 둔다. */
  readonly itemResults: readonly ItemResult[];
}

export interface ScoreCognitiveInput {
  readonly responses: ResponseMap;
  /** 선택 사항. 시간 제한이 없는 검사이므로 없어도 채점은 완전히 성립한다. */
  readonly elapsedMsByItem?: ElapsedMsMap;
}

function assertComplete(responses: ResponseMap): void {
  const missing = ITEMS.filter((item) => responses[item.id] === undefined).map((item) => item.id);
  if (missing.length > 0) {
    throw new CognitiveInputError(
      `missing responses for ${missing.length} item(s): ${missing.join(", ")}`,
      missing,
    );
  }

  for (const item of ITEMS) {
    const chosen = responses[item.id];
    if (!Number.isInteger(chosen) || chosen! < 0 || chosen! >= item.options.length) {
      throw new CognitiveInputError(
        `response for item ${item.id} must be an option index 0..${item.options.length - 1}, got ${chosen}`,
        [],
        [item.id],
      );
    }
  }
}

/** 시간은 채점에 영향을 주지 않지만, 음수나 NaN이 그대로 화면까지 흘러가게 두지는 않는다. */
function assertElapsedMs(elapsedMsByItem: ElapsedMsMap): void {
  const invalid = ITEMS.filter((item) => {
    const elapsed = elapsedMsByItem[item.id];
    return elapsed !== undefined && (!Number.isFinite(elapsed) || elapsed < 0);
  }).map((item) => item.id);

  if (invalid.length > 0) {
    throw new CognitiveInputError(
      `elapsed time for item(s) ${invalid.join(", ")} must be a finite, non-negative number of milliseconds`,
      [],
      invalid,
    );
  }
}

/** 하나도 주입되지 않았으면 0이 아니라 null이다 — "0초 걸렸다"와 "재지 않았다"는 다르다. */
function sumElapsed(results: readonly ItemResult[]): number | null {
  let total = 0;
  let measuredCount = 0;
  for (const result of results) {
    if (result.elapsedMs === null) continue;
    total += result.elapsedMs;
    measuredCount += 1;
  }
  return measuredCount === 0 ? null : total;
}

function toItemResult(
  item: Item,
  responses: ResponseMap,
  elapsedMsByItem: ElapsedMsMap | undefined,
): ItemResult {
  const chosenOptionIndex = responses[item.id]!;
  const elapsed = elapsedMsByItem?.[item.id];

  return Object.freeze({
    itemId: item.id,
    domain: item.domain,
    chosenOptionIndex,
    correctOptionIndex: item.correctOptionIndex,
    isCorrect: chosenOptionIndex === item.correctOptionIndex,
    elapsedMs: elapsed === undefined ? null : elapsed,
    recommendedSeconds: item.recommendedSeconds,
  });
}

function accuracy(correctCount: number, itemCount: number): number {
  return (correctCount / itemCount) * 100;
}

/**
 * 16문항 응답을 영역별·전체 정답률로 집계한다. 하나라도 빠지면 어떤 문항인지 알려 준다.
 * 같은 입력은 언제 호출해도 같은 결과를 낸다 — 현재 시각도, 난수도 쓰지 않는다.
 */
export function scoreCognitive(input: ScoreCognitiveInput): CognitiveResult {
  assertComplete(input.responses);
  if (input.elapsedMsByItem) assertElapsedMs(input.elapsedMsByItem);

  const itemResults: readonly ItemResult[] = Object.freeze(
    ITEMS.map((item) => toItemResult(item, input.responses, input.elapsedMsByItem)),
  );

  const domains: readonly DomainScore[] = Object.freeze(
    DOMAINS.map((domain) => {
      const items = itemsOfDomain(domain);
      const results = itemResults.filter((result) => result.domain === domain);
      const correctCount = results.filter((result) => result.isCorrect).length;

      return Object.freeze({
        domain,
        correctCount,
        itemCount: items.length,
        accuracy0to100: accuracy(correctCount, items.length),
        elapsedMs: sumElapsed(results),
        itemResults: Object.freeze(results),
      });
    }),
  );

  const correctCount = itemResults.filter((result) => result.isCorrect).length;

  return Object.freeze({
    domains,
    correctCount,
    itemCount: itemResults.length,
    accuracy0to100: accuracy(correctCount, itemResults.length),
    totalElapsedMs: sumElapsed(itemResults),
    itemResults,
  });
}
