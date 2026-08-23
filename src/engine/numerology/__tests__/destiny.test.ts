import { describe, expect, it } from "vitest";
import { LETTER_VALUES } from "@engine/numerology/constants";
import { NumerologyInputError, computeDestinyNumber } from "@engine/numerology/destiny";

describe("피타고라스 문자표", () => {
  it("A~Z 26개 전부가 1~9 사이 값을 갖는다", () => {
    for (let code = 65; code <= 90; code += 1) {
      const letter = String.fromCharCode(code);
      expect(LETTER_VALUES[letter], letter).toBeGreaterThanOrEqual(1);
      expect(LETTER_VALUES[letter], letter).toBeLessThanOrEqual(9);
    }
  });

  it("각 값마다 3개씩 배정되고 9만 2개다 (26 = 8×3 + 2)", () => {
    const counts: Record<number, number> = {};
    for (const v of Object.values(LETTER_VALUES)) counts[v] = (counts[v] ?? 0) + 1;
    for (let v = 1; v <= 8; v += 1) expect(counts[v], `value ${v}`).toBe(3);
    expect(counts[9]).toBe(2);
  });
});

describe("운명수 계산", () => {
  it("문자값 합을 정확히 낸다", () => {
    // A=1,B=2,C=3 → 합 6, 이미 한 자리
    const r = computeDestinyNumber("ABC");
    expect(r.rawSum).toBe(6);
    expect(r.value).toBe(6);
    expect(r.isMaster).toBe(false);
    expect(r.lettersUsed).toBe(3);
  });

  it("대소문자를 구분하지 않는다", () => {
    expect(computeDestinyNumber("abc")).toEqual(computeDestinyNumber("ABC"));
    expect(computeDestinyNumber("AbC").value).toBe(computeDestinyNumber("ABC").value);
  });

  it("로마자가 아닌 문자는 세지 않고 건너뛴다", () => {
    const plain = computeDestinyNumber("ABC");
    const noisy = computeDestinyNumber("A-B C!123");
    expect(noisy.rawSum).toBe(plain.rawSum);
    expect(noisy.lettersUsed).toBe(3);
    expect(noisy.ignoredCharacters).toBeGreaterThan(0);
  });

  it("공백은 로마자가 아니지만 '무시된 문자'로 세지 않는다 (공백 자체는 계산 대상이 아님을 알리는 잡음이 아니다)", () => {
    const r = computeDestinyNumber("A B C");
    expect(r.lettersUsed).toBe(3);
    expect(r.ignoredCharacters).toBe(0);
  });

  it("한 글자가 마스터 합을 만들면 그대로 멈춘다", () => {
    // G(7)+P(7)+Y(7)+H(8) = 29 → 2+9=11
    const r = computeDestinyNumber("GPYH");
    expect(r.rawSum).toBe(29);
    expect(r.value).toBe(11);
    expect(r.isMaster).toBe(true);
  });

  it("합 자체가 22면 더 줄이지 않는다", () => {
    // H(8)+H(8)+F(6) = 22
    const r = computeDestinyNumber("HHF");
    expect(r.rawSum).toBe(22);
    expect(r.value).toBe(22);
    expect(r.isMaster).toBe(true);
  });

  it("합 자체가 33이면 더 줄이지 않는다", () => {
    // H(8)*4 + A(1) = 33
    const r = computeDestinyNumber("HHHHA");
    expect(r.rawSum).toBe(33);
    expect(r.value).toBe(33);
    expect(r.isMaster).toBe(true);
  });

  it("로마자가 하나도 없으면 오류를 던진다", () => {
    expect(() => computeDestinyNumber("홍길동")).toThrow(NumerologyInputError);
    expect(() => computeDestinyNumber("123!!")).toThrow(NumerologyInputError);
  });

  it("빈 문자열·공백만 있는 문자열은 오류를 던진다", () => {
    expect(() => computeDestinyNumber("")).toThrow(NumerologyInputError);
    expect(() => computeDestinyNumber("   ")).toThrow(NumerologyInputError);
  });

  it("결과가 동결되어 있다", () => {
    expect(Object.isFrozen(computeDestinyNumber("ABC"))).toBe(true);
  });
});
