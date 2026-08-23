import { describe, expect, it } from "vitest";
import { MASTER_NUMBERS } from "@engine/numerology/constants";
import { reduceToSingleDigitOrMaster, sumDigits } from "@engine/numerology/reduce";

describe("sumDigits", () => {
  it("자릿수를 더한다", () => {
    expect(sumDigits(0)).toBe(0);
    expect(sumDigits(5)).toBe(5);
    expect(sumDigits(19)).toBe(10);
    expect(sumDigits(1990)).toBe(19);
    expect(sumDigits(29)).toBe(11);
  });

  it("부호를 무시한다", () => {
    expect(sumDigits(-19)).toBe(10);
  });
});

describe("reduceToSingleDigitOrMaster", () => {
  it("이미 한 자리면 그대로 돌려준다", () => {
    for (let n = 0; n <= 9; n += 1) expect(reduceToSingleDigitOrMaster(n)).toBe(n);
  });

  it("마스터 넘버는 더 줄이지 않고 즉시 멈춘다", () => {
    expect(reduceToSingleDigitOrMaster(11)).toBe(11);
    expect(reduceToSingleDigitOrMaster(22)).toBe(22);
    expect(reduceToSingleDigitOrMaster(33)).toBe(33);
  });

  it("중간에 마스터가 나오면 거기서 멈춘다", () => {
    expect(reduceToSingleDigitOrMaster(29)).toBe(11); // 2+9=11
    expect(reduceToSingleDigitOrMaster(38)).toBe(11); // 3+8=11
    expect(reduceToSingleDigitOrMaster(49)).toBe(4); // 4+9=13 → 1+3=4 (마스터 아님)
  });

  it("44는 마스터가 아니라서 한 자리까지 계속 줄어든다", () => {
    expect(reduceToSingleDigitOrMaster(44)).toBe(8); // 4+4=8
  });

  it("큰 수도 결국 한 자리나 마스터로 수렴한다", () => {
    expect(reduceToSingleDigitOrMaster(9999)).toBe(9); // 9+9+9+9=36→3+6=9
    expect(reduceToSingleDigitOrMaster(123456789)).toBe(9); // digit sum=45→9
  });

  it("결과는 언제나 1~9 이거나 마스터 넘버다", () => {
    for (let n = 1; n < 2000; n += 7) {
      const v = reduceToSingleDigitOrMaster(n);
      expect(v >= 1 && v <= 9 || MASTER_NUMBERS.includes(v), `n=${n} -> ${v}`).toBe(true);
    }
  });

  it("커스텀 마스터 목록을 줄 수 있다 (엔진 밖 실험용)", () => {
    expect(reduceToSingleDigitOrMaster(44, [44])).toBe(44);
    expect(reduceToSingleDigitOrMaster(29, [])).toBe(2); // 마스터 없이 끝까지 줄인다: 11→1+1=2
  });
});
