import { ITEMS } from "@engine/psychometrics/items";
import type { LikertResponse, ResponseMap } from "@engine/psychometrics/scoring";

/**
 * 50문항 응답 ↔ URL 문자열.
 *
 * 각 응답이 1~5 한 자리 숫자이므로 압축 없이 50자리 숫자 문자열이면 충분하다 —
 * 사주·타로처럼 서버에는 아무것도 저장하지 않고, 이 문자열 자체가 결과다.
 */
export function encodeResponses(responses: ResponseMap): string {
  return ITEMS.map((item) => String(responses[item.id] ?? "0")).join("");
}

export function decodeResponses(code: string): ResponseMap | null {
  if (!/^[1-5]{50}$/.test(code)) return null;
  const map: Record<number, LikertResponse> = {};
  for (let i = 0; i < ITEMS.length; i += 1) {
    map[ITEMS[i]!.id] = Number(code[i]) as LikertResponse;
  }
  return map;
}
