import type { AttachmentResponse } from "@engine/attachment/scoring";
import { ECR_ITEMS } from "@engine/attachment/items";

/**
 * URL 공유용 인코딩/디코딩
 * 36개 응답을 36자리 숫자 문자열로 변환 (각 응답 1~5)
 */

export function encodeAttachmentResponses(responses: AttachmentResponse): string {
  return ECR_ITEMS.map(item => responses[item.id] ?? "").join("");
}

export function decodeAttachmentResponses(encoded: string): AttachmentResponse | null {
  if (encoded.length !== 36) return null;

  const responses: { [itemId: number]: 1 | 2 | 3 | 4 | 5 } = {};

  for (let i = 0; i < ECR_ITEMS.length; i++) {
    const char = encoded[i]!;
    const value = parseInt(char, 10);

    if (isNaN(value) || value < 1 || value > 5) return null;

    responses[ECR_ITEMS[i]!.id] = value as 1 | 2 | 3 | 4 | 5;
  }

  return responses;
}
