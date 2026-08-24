import { ECR_ITEMS, scoreItem, getAxisItems, type LikertScale } from "./items";

/** Score the current exploratory two-axis item set; this is not official ECR-R scoring. */
export interface AttachmentScores {
  readonly anxiety: AxisScore;
  readonly avoidance: AxisScore;
}

export interface AxisScore {
  readonly rawSum: number;
  readonly mean: number;
  readonly sampleSize?: number;
}

export interface AttachmentResponse {
  readonly [itemId: number]: LikertScale;
}

/**
 * Exploratory attachment-axis scoring informed by ECR-R dimensions.
 *
 * @param responses - itemId를 키로 하는 응답 객체 (1~5)
 * @returns anxiety와 avoidance 축의 점수
 */
export function scoreECR(responses: AttachmentResponse): AttachmentScores {
  const anxietyItems = getAxisItems("anxiety");
  const avoidanceItems = getAxisItems("avoidance");

  const anxietySum = anxietyItems.reduce((sum, item) => {
    const response = responses[item.id];
    if (response === undefined) return sum;
    return sum + scoreItem(item, response);
  }, 0);

  const avoidanceSum = avoidanceItems.reduce((sum, item) => {
    const response = responses[item.id];
    if (response === undefined) return sum;
    return sum + scoreItem(item, response);
  }, 0);

  const answeredAnxiety = anxietyItems.filter(item => responses[item.id] !== undefined).length;
  const answeredAvoidance = avoidanceItems.filter(item => responses[item.id] !== undefined).length;

  return {
    anxiety: {
      rawSum: anxietySum,
      mean: answeredAnxiety > 0 ? anxietySum / answeredAnxiety : 0,
    },
    avoidance: {
      rawSum: avoidanceSum,
      mean: answeredAvoidance > 0 ? avoidanceSum / answeredAvoidance : 0,
    },
  };
}

/**
 * URL 인코딩용: 36개 응답을 문자열로 변환
 * 형식: "1234512345..." (각 응답 1~5)
 */
export function encodeResponses(responses: AttachmentResponse): string {
  return ECR_ITEMS.map(item => responses[item.id] ?? "").join("");
}

/**
 * URL 디코딩: 문자열을 응답 객체로 변환
 */
export function decodeResponses(encoded: string): AttachmentResponse | null {
  if (encoded.length !== 36) return null;

  const responses: { [itemId: number]: LikertScale } = {};

  for (let i = 0; i < ECR_ITEMS.length; i++) {
    const char = encoded[i]!;
    const value = parseInt(char, 10);

    if (isNaN(value) || value < 1 || value > 5) return null;

    responses[ECR_ITEMS[i]!.id] = value as LikertScale;
  }

  return responses;
}
