import { describe, expect, it } from "vitest";
import { ITEMS } from "@engine/cognitive/items";
import {
  RESPONSE_CODE_LENGTH,
  decodeCognitiveResponses,
  encodeCognitiveResponses,
} from "../cognitiveCode";

/**
 * 정답 키를 그대로 고른 응답의 코드. 문항 데이터가 흔들리면 이 리터럴이 먼저 깨진다 —
 * 배포된 링크가 다른 답을 가리키게 되는 사고를 테스트가 먼저 잡으라고 박아 둔 값이다.
 */
const GOLDEN_ALL_CORRECT = "1122021122101234";

describe("cognitive response code", () => {
  it("round-trips every item in item order", () => {
    const responses: Record<number, number> = {};
    for (const item of ITEMS) {
      // 문항마다 보기 수가 달라(4개 또는 5개) 마지막 보기를 고르면 상한을 함께 밟는다.
      responses[item.id] = item.options.length - 1;
    }

    const code = encodeCognitiveResponses(responses);

    expect(code).toHaveLength(RESPONSE_CODE_LENGTH);
    expect(decodeCognitiveResponses(code)).toEqual(responses);
  });

  it("keeps the frozen golden code for the all-correct response set", () => {
    const responses: Record<number, number> = {};
    for (const item of ITEMS) responses[item.id] = item.correctOptionIndex;

    expect(encodeCognitiveResponses(responses)).toBe(GOLDEN_ALL_CORRECT);

    const decoded = decodeCognitiveResponses(GOLDEN_ALL_CORRECT);
    expect(decoded).not.toBeNull();
    for (const item of ITEMS) {
      expect(decoded![item.id]).toBe(item.correctOptionIndex);
    }
  });

  it("encodes a chosen index of zero as a real answer, not as a gap", () => {
    const responses: Record<number, number> = {};
    for (const item of ITEMS) responses[item.id] = 0;

    const code = encodeCognitiveResponses(responses);

    expect(code).toBe("0".repeat(RESPONSE_CODE_LENGTH));
    expect(decodeCognitiveResponses(code)).toEqual(responses);
  });

  it("marks missing answers with a character the decoder rejects", () => {
    const responses: Record<number, number> = {};
    for (const item of ITEMS) responses[item.id] = 0;
    delete responses[ITEMS[4]!.id];

    const code = encodeCognitiveResponses(responses);

    expect(code[4]).toBe("-");
    expect(decodeCognitiveResponses(code)).toBeNull();
  });

  it("ignores responses for item ids that do not exist", () => {
    const responses: Record<number, number> = { 999: 3 };
    for (const item of ITEMS) responses[item.id] = 0;

    expect(encodeCognitiveResponses(responses)).toBe("0".repeat(RESPONSE_CODE_LENGTH));
  });

  it.each([
    ["out-of-range index", 7],
    ["negative index", -1],
    ["non-integer index", 1.5],
    ["not a number at all", Number.NaN],
  ])("treats an %s as a gap rather than writing it out", (_label, value) => {
    const responses: Record<number, number> = {};
    for (const item of ITEMS) responses[item.id] = 0;
    responses[ITEMS[0]!.id] = value;

    const code = encodeCognitiveResponses(responses);

    expect(code[0]).toBe("-");
    expect(decodeCognitiveResponses(code)).toBeNull();
  });

  it.each([
    ["empty string", ""],
    ["one character short", "1".repeat(RESPONSE_CODE_LENGTH - 1)],
    ["one character long", "1".repeat(RESPONSE_CODE_LENGTH + 1)],
    ["a letter in the payload", `x${"1".repeat(RESPONSE_CODE_LENGTH - 1)}`],
    ["a gap marker", `-${"1".repeat(RESPONSE_CODE_LENGTH - 1)}`],
    ["a digit outside the option alphabet", `5${"1".repeat(RESPONSE_CODE_LENGTH - 1)}`],
    ["surrounding whitespace", ` ${"1".repeat(RESPONSE_CODE_LENGTH)} `],
    ["a trailing newline", `${"1".repeat(RESPONSE_CODE_LENGTH)}\n`],
  ])("rejects %s", (_label, code) => {
    expect(decodeCognitiveResponses(code)).toBeNull();
  });

  it("rejects an index that is valid for some item but not for this one", () => {
    // 1번 문항은 보기가 4개뿐이라 색인 3이 최대다. 5지선다 문항에서는 유효한 4가 여기서는 무효다.
    expect(ITEMS[0]!.options).toHaveLength(4);
    expect(decodeCognitiveResponses(`4${"0".repeat(RESPONSE_CODE_LENGTH - 1)}`)).toBeNull();
    expect(decodeCognitiveResponses(`3${"0".repeat(RESPONSE_CODE_LENGTH - 1)}`)).not.toBeNull();
  });

  it("never throws on a value that is not a string", () => {
    const notAString = 12345 as unknown as string;
    expect(() => decodeCognitiveResponses(notAString)).not.toThrow();
    expect(decodeCognitiveResponses(notAString)).toBeNull();
  });

  it("returns a frozen map so a caller cannot edit a decoded result in place", () => {
    const decoded = decodeCognitiveResponses(GOLDEN_ALL_CORRECT);
    expect(decoded).not.toBeNull();
    expect(Object.isFrozen(decoded)).toBe(true);
  });
});
