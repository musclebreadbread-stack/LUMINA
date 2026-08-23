import { describe, expect, it } from "vitest";
import { MASTER_NUMBERS, NUMBER_MEANINGS, meaningOf } from "@engine/numerology/constants";
import { computeNumerology } from "@engine/numerology";

describe("숫자별 경향 표", () => {
  it("1~9 와 마스터 11·22·33, 총 12개가 정의되어 있다", () => {
    expect(NUMBER_MEANINGS).toHaveLength(12);
    for (let v = 1; v <= 9; v += 1) expect(meaningOf(v).value).toBe(v);
    for (const m of MASTER_NUMBERS) expect(meaningOf(m).isMaster).toBe(true);
  });

  it("정의되지 않은 값은 오류를 던진다", () => {
    expect(() => meaningOf(10)).toThrow(RangeError);
    expect(() => meaningOf(44)).toThrow(RangeError);
  });

  it("모든 항목이 경향 문구와 키워드를 갖는다", () => {
    NUMBER_MEANINGS.forEach((m) => {
      expect(m.gloss.length, `${m.value}`).toBeGreaterThan(4);
      expect(m.gloss.endsWith("경향"), `${m.value}`).toBe(true);
      expect(m.keywords.length, `${m.value}`).toBeGreaterThan(0);
    });
  });

  it("단정적·공포 유발 표현을 쓰지 않는다", () => {
    const banned = ["할 것이다", "반드시", "불행", "위험", "나쁜"];
    NUMBER_MEANINGS.forEach((m) => {
      banned.forEach((word) => expect(m.gloss.includes(word), `${m.value}: "${word}"`).toBe(false));
    });
  });
});

describe("수비학 통합 산출", () => {
  it("이름 없이도 생애수는 낸다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 } });
    expect(r.lifePath.value).toBe(3);
    expect(r.destiny).toBeNull();
    expect(r.name).toBeNull();
  });

  it("이름을 주면 운명수도 함께 낸다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 }, name: "ABC" });
    expect(r.destiny).not.toBeNull();
    expect(r.destiny!.value).toBe(6);
    expect(r.name).toBe("ABC");
  });

  it("문화적 해석 계층으로 태깅된다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 } });
    expect(r.tier).toBe("cultural");
    expect(r.engine).toBe("numerology");
    expect(r.version).toBe(1);
  });

  it("각 숫자에 경향 설명이 함께 붙는다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 }, name: "GPYH" });
    expect(r.lifePath.meaning.value).toBe(r.lifePath.value);
    expect(r.destiny!.meaning.value).toBe(r.destiny!.value);
  });

  it("이름의 앞뒤 공백은 정리되어 저장된다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 }, name: "  ABC  " });
    expect(r.name).toBe("ABC");
  });

  it("같은 입력은 같은 결과를 낸다", () => {
    const input = { date: { year: 1990, month: 5, day: 15 }, name: "ABC" } as const;
    expect(JSON.stringify(computeNumerology(input))).toBe(
      JSON.stringify(computeNumerology(input)),
    );
  });

  it("결과가 동결되어 있다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 }, name: "ABC" });
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.lifePath)).toBe(true);
    expect(Object.isFrozen(r.destiny)).toBe(true);
  });

  it("JSON 직렬화가 가능하다", () => {
    const r = computeNumerology({ date: { year: 1990, month: 5, day: 15 }, name: "ABC" });
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});
