import {
  FACTORS,
  ITEMS,
  itemsOfFactor,
  type EqFactor,
  type Item,
} from "./items";
import {
  normScoreFor,
  reliabilityFor,
  reliabilityForTotal,
  totalNormScoreFor,
  type NormContext,
  type NormScore,
  type Reliability,
} from "./norms";

/** 5점 리커트. 1=전혀 그렇지 않다, 5=매우 그렇다. */
export type LikertResponse = 1 | 2 | 3 | 4 | 5;

export type ResponseMap = Readonly<Record<number, LikertResponse>>;

export class EqInputError extends Error {
  constructor(
    message: string,
    readonly missingItemIds: readonly number[] = [],
  ) {
    super(message);
    this.name = "EqInputError";
  }
}

/**
 * 문항 채점. plus 문항은 응답 그대로, minus(역채점) 문항은 6 − 응답이다.
 * SSEIT의 역채점은 5·28·33번 세 문항뿐이며, 이 반전이 틀리면 총점이 조용히 어긋난다 —
 * 그래서 역채점 결정은 이 함수 하나만 거치게 한다.
 */
export function scoreItem(item: Item, response: LikertResponse): number {
  return item.key === "plus" ? response : 6 - response;
}

export interface ItemResponse {
  readonly itemId: number;
  readonly response: LikertResponse;
  readonly scoredResponse: number;
  readonly reverseScored: boolean;
  readonly textKo: string;
  readonly textEn: string;
}

/** 요인 점수와 총점이 공유하는 필드. 뷰 컴포넌트가 둘을 같은 방식으로 그릴 수 있게 형태를 맞춘다. */
export interface EqScoreBase {
  /** 채점된 값의 합. 문항 수 × 1 ~ 문항 수 × 5. */
  readonly rawSum: number;
  /** 문항 평균. 1.0~5.0. */
  readonly mean: number;
  readonly itemCount: number;
  /**
   * 이 척도 안에서의 상대적 위치, 0~100.
   * 이론적 최소·최대를 선형으로 늘린 값일 뿐 모집단 규준 백분위가 아니다.
   * 하위요인은 출판 규준이 없어 이 값이 유일한 비교 축이 된다.
   */
  readonly scalePosition0to100: number;
  readonly norm: NormScore | null;
  readonly reliability: Reliability;
  readonly consistency: {
    readonly withinFactorSD: number;
    readonly midpointRate: number;
  };
  readonly itemResponses: readonly ItemResponse[];
}

export interface FactorScore extends EqScoreBase {
  readonly factor: EqFactor;
}

/** 총점. SSEIT의 1차 지표이며, 규준·신뢰구간이 실제로 붙는 유일한 점수다. */
export interface TotalScore extends EqScoreBase {
  readonly factor: "total";
}

function assertComplete(responses: ResponseMap): void {
  const missing = ITEMS.filter((item) => responses[item.id] === undefined).map((i) => i.id);
  if (missing.length > 0) {
    throw new EqInputError(
      `missing responses for ${missing.length} item(s): ${missing.join(", ")}`,
      missing,
    );
  }
  for (const item of ITEMS) {
    const v = responses[item.id];
    if (!Number.isInteger(v) || v! < 1 || v! > 5) {
      throw new EqInputError(
        `response for item ${item.id} must be an integer 1..5, got ${v}`,
        [item.id],
      );
    }
  }
}

interface Aggregate {
  readonly rawSum: number;
  readonly mean: number;
  readonly itemCount: number;
  readonly scalePosition0to100: number;
  readonly consistency: EqScoreBase["consistency"];
  readonly itemResponses: readonly ItemResponse[];
}

/** 문항 묶음 하나를 집계한다. 요인마다 문항 수가 달라 최소·최대를 항상 items.length에서 다시 구한다. */
function aggregate(items: readonly Item[], responses: ResponseMap): Aggregate {
  const scored = items.map((item) => scoreItem(item, responses[item.id]!));
  const rawSum = scored.reduce((sum, value) => sum + value, 0);
  const mean = rawSum / items.length;
  const minimum = items.length;
  const maximum = items.length * 5;

  return {
    rawSum,
    mean,
    itemCount: items.length,
    scalePosition0to100: ((rawSum - minimum) / (maximum - minimum)) * 100,
    consistency: Object.freeze({
      withinFactorSD: Math.sqrt(
        scored.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scored.length,
      ),
      midpointRate: items.filter((item) => responses[item.id] === 3).length / items.length,
    }),
    itemResponses: Object.freeze(
      items.map((item) =>
        Object.freeze({
          itemId: item.id,
          response: responses[item.id]!,
          scoredResponse: scoreItem(item, responses[item.id]!),
          reverseScored: item.key === "minus",
          textKo: item.textKo,
          textEn: item.textEn,
        }),
      ),
    ),
  };
}

/**
 * 33문항 전체 응답에서 4개 하위요인 점수를 낸다. 하나라도 빠지면 어떤 문항인지 알려 준다.
 * 하위요인은 보조 지표다 — 총점 없이 이것만 보여 주면 원척도의 근거를 넘어선 해석이 된다.
 */
export function computeFactorScores(
  responses: ResponseMap,
  normContext?: NormContext,
): readonly FactorScore[] {
  assertComplete(responses);

  return Object.freeze(
    FACTORS.map((factor) => {
      const parts = aggregate(itemsOfFactor(factor), responses);
      const norm = normScoreFor(factor, parts.rawSum, normContext);
      return Object.freeze({
        factor,
        ...parts,
        norm,
        reliability: reliabilityFor(factor, parts.rawSum, norm),
      });
    }),
  );
}

/** 33문항 총점. SSEIT에서 대표로 보고해야 하는 값이다. */
export function computeTotalScore(
  responses: ResponseMap,
  normContext?: NormContext,
): TotalScore {
  assertComplete(responses);

  const parts = aggregate(ITEMS, responses);
  const norm = totalNormScoreFor(parts.rawSum, normContext);
  return Object.freeze({
    factor: "total" as const,
    ...parts,
    norm,
    reliability: reliabilityForTotal(parts.rawSum, norm),
  });
}
