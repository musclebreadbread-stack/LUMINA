import { ITEMS } from "@engine/cognitive/items";
import type { ResponseMap } from "@engine/cognitive/scoring";

/**
 * 16문항 응답 ↔ URL 문자열.
 *
 * 기존 코덱(eqCode 등)은 문항마다 1~5 한 자리 리커트 숫자라는 전제 위에 서 있었다.
 * 여기는 정답이 있는 객관식이라 저장할 값이 "고른 보기의 색인"(0부터, 문항에 따라 0~3 또는 0~4)이다.
 * 그래서 자릿수는 그대로 하나로 두되, 허용 문자를 실제 보기 수에서 계산하고
 * 자릿수마다 그 문항의 보기 수를 다시 검사한다 — 5지선다의 "4"가 4지선다 문항에 오면 거절한다.
 *
 * ── 시간은 왜 코드에 싣지 않는가 ───────────────────────────────────────────────
 * 경과 시간은 (1) 채점에 쓰이지 않고, (2) 클라이언트가 잰 서술적 값이며, (3) 같은 답을 낸 두 사람이
 * 서로 다른 링크를 갖게 만든다. 무엇보다 링크에 실리면 "시간도 성적의 일부"라는 오해를 부르는데,
 * 이 검사는 제한도 감점도 없다고 약속했다. 그래서 링크에는 응답만 담고, 시간은 응답자 본인의
 * 브라우저(cognitiveDraft.ts)에만 남긴다. 몇 달 뒤 같은 링크를 열어도 같은 결과가 나오는 성질은
 * 응답만으로 이미 완전히 성립한다.
 */

/** 응답이 빠진 자리에 쓰는 문자. 허용 문자 집합 밖이므로 decode가 반드시 거절한다. */
const MISSING_CHAR = "-";

const MAX_OPTION_COUNT = ITEMS.reduce((max, item) => Math.max(max, item.options.length), 0);

// 한 문항에 한 글자라는 전제는 보기가 10개 미만일 때만 성립한다. 문항이 늘어나면 배포 전에 여기서 터진다.
if (MAX_OPTION_COUNT > 10) {
  throw new Error(
    `cognitiveCode: an item has ${MAX_OPTION_COUNT} options, but one character per item holds at most 10`,
  );
}

/** 코드 길이 = 문항 수. 결과 페이지·e2e가 이 값으로 URL 모양을 검사할 수 있게 내보낸다. */
export const RESPONSE_CODE_LENGTH = ITEMS.length;

const CODE_PATTERN = new RegExp(`^[0-${MAX_OPTION_COUNT - 1}]{${RESPONSE_CODE_LENGTH}}$`);

/**
 * 문항 순서대로 고른 보기 색인을 한 자리씩 잇는다.
 * 빠진 응답은 MISSING_CHAR가 되므로, 미완성 코드는 만들어지더라도 decode를 통과하지 못한다.
 */
export function encodeCognitiveResponses(responses: ResponseMap): string {
  return ITEMS.map((item) => {
    const chosen = responses[item.id];
    if (chosen === undefined) return MISSING_CHAR;
    if (!Number.isInteger(chosen) || chosen < 0 || chosen >= item.options.length) return MISSING_CHAR;
    return String(chosen);
  }).join("");
}

/** 어떤 입력에도 절대 던지지 않는다. 조금이라도 어긋나면 null이다. */
export function decodeCognitiveResponses(code: string): ResponseMap | null {
  if (typeof code !== "string") return null;
  if (!CODE_PATTERN.test(code)) return null;

  const responses: Record<number, number> = {};
  for (let index = 0; index < ITEMS.length; index += 1) {
    const item = ITEMS[index]!;
    const chosen = Number(code[index]);
    // 패턴은 전체 문항 중 가장 보기가 많은 문항 기준이므로, 문항별 상한은 여기서 다시 본다.
    if (chosen >= item.options.length) return null;
    responses[item.id] = chosen;
  }
  return Object.freeze(responses);
}
