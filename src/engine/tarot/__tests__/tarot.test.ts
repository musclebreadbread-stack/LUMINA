import { describe, expect, it } from "vitest";
import { computeTarotReading } from "@engine/tarot";
import { SPREADS } from "@engine/tarot/spreads";
import { TarotSeedError } from "@engine/tarot/shuffle";

describe("스프레드 정의", () => {
  it("한 장·세 장·켈틱 크로스가 각각 1·3·10 자리를 갖는다", () => {
    expect(SPREADS.single.positions).toHaveLength(1);
    expect(SPREADS.three.positions).toHaveLength(3);
    expect(SPREADS["celtic-cross"].positions).toHaveLength(10);
  });

  it("모든 자리가 질문 한 줄을 갖는다", () => {
    for (const spread of Object.values(SPREADS)) {
      spread.positions.forEach((p) => {
        expect(p.prompt.length, `${spread.key}/${p.key}`).toBeGreaterThan(4);
        expect(p.prompt.endsWith("?"), `${spread.key}/${p.key}`).toBe(true);
      });
    }
  });

  it("자리 index 가 0부터 순서대로다", () => {
    for (const spread of Object.values(SPREADS)) {
      spread.positions.forEach((p, i) => expect(p.index).toBe(i));
    }
  });
});

describe("타로 리딩 산출", () => {
  it("문화적 해석 계층으로 태깅된다", () => {
    const r = computeTarotReading("three", "seed-1");
    expect(r.tier).toBe("cultural");
    expect(r.engine).toBe("tarot");
    expect(r.version).toBe(1);
  });

  it("자리 수만큼 카드를 낸다", () => {
    expect(computeTarotReading("single", "s").cards).toHaveLength(1);
    expect(computeTarotReading("three", "s").cards).toHaveLength(3);
    expect(computeTarotReading("celtic-cross", "s").cards).toHaveLength(10);
  });

  it("각 카드가 자리·패·방향을 모두 갖는다", () => {
    const r = computeTarotReading("celtic-cross", "seed-full");
    r.cards.forEach((d, i) => {
      expect(d.position.index).toBe(i);
      expect(d.card.name).toBeTruthy();
      expect(["upright", "reversed"]).toContain(d.orientation);
    });
  });

  it("한 리딩 안에서 카드가 겹치지 않는다", () => {
    const r = computeTarotReading("celtic-cross", "no-dup-seed");
    expect(new Set(r.cards.map((d) => d.card.id)).size).toBe(10);
  });

  it("같은 스프레드·시드는 완전히 같은 결과를 낸다", () => {
    const a = computeTarotReading("three", "reproducible");
    const b = computeTarotReading("three", "reproducible");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("결과에 시드를 그대로 담아 공유 링크 재현에 쓸 수 있다", () => {
    const r = computeTarotReading("single", "my-share-token");
    expect(r.seed).toBe("my-share-token");
  });

  it("결과가 동결되어 있다", () => {
    const r = computeTarotReading("three", "frozen-check");
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.cards)).toBe(true);
    expect(Object.isFrozen(r.cards[0])).toBe(true);
  });

  it("빈 시드는 오류를 던진다", () => {
    expect(() => computeTarotReading("single", "")).toThrow(TarotSeedError);
  });

  it("JSON 직렬화가 가능하다 (해석 레이어·공유 링크 입력)", () => {
    const r = computeTarotReading("three", "serialize-check");
    expect(() => JSON.stringify(r)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed.cards).toHaveLength(3);
  });
});
