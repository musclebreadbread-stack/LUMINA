import { FACTORS, itemsOfFactor } from "./items";
import { scoreItem, type LikertResponse, type ResponseMap } from "./scoring";

/**
 * 신뢰도(Cronbach's α) 계산.
 *
 * 개인 응답은 서버에 저장하지 않으므로, 이 함수는 개별 사용자의 결과를 계산하는 데
 * 쓰지 않는다. 공개 원자료를 빌드 타임에 요약할 때 여러 응답자의 문항 행렬로 α를
 * 계산하고, 공식 게시값과 교차검증하는 품질 게이트로 사용한다. 결과 화면에는 그
 * 절차로 확인된 공개 척도의 α만 표시한다.
 */

export class ReliabilityInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReliabilityInputError";
  }
}

function sampleVariance(values: readonly number[]): number {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
}

/**
 * 표준 Cronbach's α.
 *
 *   α = (k / (k−1)) · (1 − Σ(문항 분산) / 총점 분산)
 *
 * itemScores[i] 는 문항 i에 대한 모든 응답자의 점수(이미 역채점 반영됨) 배열이고,
 * 모든 문항은 같은 응답자 집합·순서를 공유해야 한다.
 */
export function cronbachAlpha(itemScores: readonly (readonly number[])[]): number {
  const k = itemScores.length;
  if (k < 2) {
    throw new ReliabilityInputError(`need at least 2 items, got ${k}`);
  }
  const n = itemScores[0]!.length;
  if (n < 2) {
    throw new ReliabilityInputError(`need at least 2 respondents, got ${n}`);
  }
  if (itemScores.some((row) => row.length !== n)) {
    throw new ReliabilityInputError("all items must have the same number of respondents");
  }

  const itemVarianceSum = itemScores.reduce((sum, row) => sum + sampleVariance(row), 0);

  const totals = Array.from({ length: n }, (_, respondent) =>
    itemScores.reduce((sum, row) => sum + row[respondent]!, 0),
  );
  const totalVariance = sampleVariance(totals);

  if (totalVariance === 0) return 0;
  return (k / (k - 1)) * (1 - itemVarianceSum / totalVariance);
}

export interface FactorReliability {
  readonly factor: (typeof FACTORS)[number];
  readonly alpha: number;
  readonly itemCount: number;
  readonly respondentCount: number;
}

/**
 * 여러 응답자의 전체 설문 데이터에서 요인별 α를 낸다.
 * 실제 서비스 데이터가 쌓이면 이 함수에 그대로 넣어 신뢰도를 재계산할 수 있다.
 */
export function computeFactorAlphas(
  dataset: readonly ResponseMap[],
): readonly FactorReliability[] {
  if (dataset.length < 2) {
    throw new ReliabilityInputError(`need at least 2 respondents, got ${dataset.length}`);
  }

  return Object.freeze(
    FACTORS.map((factor) => {
      const items = itemsOfFactor(factor);
      const itemScores = items.map((item) =>
        dataset.map((responses) => {
          const raw = responses[item.id];
          if (raw === undefined) {
            throw new ReliabilityInputError(`respondent is missing item ${item.id}`);
          }
          return scoreItem(item, raw as LikertResponse);
        }),
      );

      return Object.freeze({
        factor,
        alpha: cronbachAlpha(itemScores),
        itemCount: items.length,
        respondentCount: dataset.length,
      });
    }),
  );
}
