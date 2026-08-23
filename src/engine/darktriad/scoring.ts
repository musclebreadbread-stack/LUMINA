import {
  FACTORS,
  ITEMS,
  ITEMS_PER_FACTOR,
  itemsOfFactor,
  type DarkTriadFactor,
  type Item,
} from "./items";
import { normScoreFor, reliabilityFor, type NormContext, type NormScore } from "./norms";

/** 5점 리커트. 1=전혀 동의하지 않는다, 5=매우 동의한다. */
export type LikertResponse = 1 | 2 | 3 | 4 | 5;

export type ResponseMap = Readonly<Record<number, LikertResponse>>;

export class DarkTriadInputError extends Error {
  constructor(
    message: string,
    readonly missingItemIds: readonly number[] = [],
  ) {
    super(message);
    this.name = "DarkTriadInputError";
  }
}

/**
 * 문항 채점. plus 문항은 응답 그대로, minus(역채점) 문항은 6 − 응답이다.
 * "전혀 동의하지 않는다"라고 답해도 그 문항이 minus 키라면 그 요인 점수는 오히려 올라간다 —
 * 이 반전이 틀리면 척도 전체가 조용히 망가지므로 반드시 이 함수 하나만 거치게 한다.
 */
export function scoreItem(item: Item, response: LikertResponse): number {
  return item.key === "plus" ? response : 6 - response;
}

export interface FactorScore {
  readonly factor: DarkTriadFactor;
  /** 채점된 값의 합. 9문항 × 1~5점 → 9~45. */
  readonly rawSum: number;
  /** 문항 평균. 1.0~5.0. */
  readonly mean: number;
  readonly itemCount: number;
  /**
   * 이 척도 안에서의 상대적 위치, 0~100.
   * 이론적 최소·최대(9~45)를 선형으로 늘린 값일 뿐, 모집단 규준 백분위가 아니다.
   * 실제 규준은 충분한 응답이 모여야 낼 수 있다 — 지금은 없는 값을 지어내지 않는다.
   */
  readonly scalePosition0to100: number;
  readonly norm: NormScore | null;
  readonly reliability: {
    readonly alpha: number;
    readonly sem: number;
    readonly ci95: readonly [number, number];
  };
  readonly consistency: {
    readonly withinFactorSD: number;
    readonly midpointRate: number;
  };
  readonly itemResponses: readonly ItemResponse[];
}

export interface ItemResponse {
  readonly itemId: number;
  readonly response: LikertResponse;
  readonly scoredResponse: number;
  readonly reverseScored: boolean;
  readonly textKo: string;
  readonly textEn: string;
}

function assertComplete(responses: ResponseMap): void {
  const missing = ITEMS.filter((item) => responses[item.id] === undefined).map((i) => i.id);
  if (missing.length > 0) {
    throw new DarkTriadInputError(
      `missing responses for ${missing.length} item(s): ${missing.join(", ")}`,
      missing,
    );
  }
  for (const item of ITEMS) {
    const v = responses[item.id];
    if (!Number.isInteger(v) || v! < 1 || v! > 5) {
      throw new DarkTriadInputError(
        `response for item ${item.id} must be an integer 1..5, got ${v}`,
        [item.id],
      );
    }
  }
}

/** 27문항 전체 응답에서 요인별 점수를 낸다. 하나라도 빠지면 어떤 문항인지 알려 준다. */
export function computeFactorScores(
  responses: ResponseMap,
  normContext?: NormContext,
): readonly FactorScore[] {
  assertComplete(responses);

  return Object.freeze(
    FACTORS.map((factor) => {
      const items = itemsOfFactor(factor);
      const rawSum = items.reduce((sum, item) => sum + scoreItem(item, responses[item.id]!), 0);
      const min = ITEMS_PER_FACTOR * 1;
      const max = ITEMS_PER_FACTOR * 5;
      const scoredResponses = items.map((item) => scoreItem(item, responses[item.id]!));
      const mean = rawSum / items.length;
      const withinFactorSD = Math.sqrt(
        scoredResponses.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scoredResponses.length,
      );
      const norm = normScoreFor(factor, rawSum, normContext);

      return Object.freeze({
        factor,
        rawSum,
        mean,
        itemCount: items.length,
        scalePosition0to100: ((rawSum - min) / (max - min)) * 100,
        norm,
        reliability: reliabilityFor(factor, rawSum, norm),
        consistency: Object.freeze({
          withinFactorSD,
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
      });
    }),
  );
}
