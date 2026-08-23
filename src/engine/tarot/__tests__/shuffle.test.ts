import { describe, expect, it } from "vitest";
import { DECK } from "@engine/tarot/constants";
import {
  TarotSeedError,
  drawCards,
  hashSeed,
  rngFromSeed,
  shuffle,
} from "@engine/tarot/shuffle";

describe("시드 해시", () => {
  it("같은 문자열은 같은 해시를 낸다", () => {
    expect(hashSeed("hello")).toBe(hashSeed("hello"));
  });

  it("한 글자만 달라도 해시가 달라진다", () => {
    expect(hashSeed("seed-a")).not.toBe(hashSeed("seed-b"));
  });

  it("항상 부호 없는 32비트 정수를 낸다", () => {
    for (const s of ["", "a", "긴 한글 시드 테스트", "x".repeat(500)]) {
      const h = hashSeed(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("난수열", () => {
  it("같은 시드는 완전히 같은 수열을 낸다", () => {
    const a = rngFromSeed("fixed-seed");
    const b = rngFromSeed("fixed-seed");
    for (let i = 0; i < 50; i += 1) expect(a()).toBe(b());
  });

  it("모든 값이 [0,1) 구간에 있다", () => {
    const rng = rngFromSeed("range-check");
    for (let i = 0; i < 1000; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("연속한 값이 뻔한 패턴으로 반복되지 않는다", () => {
    const rng = rngFromSeed("pattern-check");
    const values = Array.from({ length: 200 }, () => rng());
    expect(new Set(values).size).toBeGreaterThan(190);
  });
});

describe("Fisher–Yates 셔플", () => {
  it("원소를 잃거나 더하지 않는다 (순열이다)", () => {
    const rng = rngFromSeed("perm-check");
    const shuffled = shuffle(DECK, rng);
    expect(shuffled).toHaveLength(DECK.length);
    expect(new Set(shuffled.map((c) => c.id)).size).toBe(DECK.length);
  });

  it("같은 rng 수열이면 같은 순서를 낸다", () => {
    const a = shuffle(DECK, rngFromSeed("order-check"));
    const b = shuffle(DECK, rngFromSeed("order-check"));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it("원본 배열을 변형하지 않는다", () => {
    const before = DECK.map((c) => c.id);
    shuffle(DECK, rngFromSeed("no-mutate"));
    expect(DECK.map((c) => c.id)).toEqual(before);
  });

  it("충분히 섞인다 (첫 장이 원래 위치에 머무는 비율이 낮다)", () => {
    let stayed = 0;
    const trials = 300;
    for (let i = 0; i < trials; i += 1) {
      const shuffled = shuffle(DECK, rngFromSeed(`trial-${i}`));
      if (shuffled[0]!.id === DECK[0]!.id) stayed += 1;
    }
    // 균등 셔플이면 이론상 1/78 ≈ 1.3%. 결함 있는 셔플과 구분할 수 있게 넉넉히 잡는다.
    expect(stayed / trials).toBeLessThan(0.1);
  });
});

describe("카드 뽑기", () => {
  it("같은 시드 + 매수는 완전히 같은 결과를 낸다", () => {
    const a = drawCards("share-link-token", 10);
    const b = drawCards("share-link-token", 10);
    expect(a.map((d) => `${d.card.id}:${d.orientation}`)).toEqual(
      b.map((d) => `${d.card.id}:${d.orientation}`),
    );
  });

  it("다른 시드는 (거의 항상) 다른 결과를 낸다", () => {
    const a = drawCards("seed-x", 5);
    const b = drawCards("seed-y", 5);
    expect(a.map((d) => d.card.id)).not.toEqual(b.map((d) => d.card.id));
  });

  it("한 판에서 같은 카드가 두 번 나오지 않는다", () => {
    for (const seed of ["s1", "s2", "s3", "s4"]) {
      const drawn = drawCards(seed, 10);
      expect(new Set(drawn.map((d) => d.card.id)).size, seed).toBe(10);
    }
  });

  it("정·역방향이 실제로 양쪽 다 나온다", () => {
    const orientations = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      drawCards(`orient-${i}`, 3).forEach((d) => orientations.add(d.orientation));
    }
    expect(orientations).toEqual(new Set(["upright", "reversed"]));
  });

  it("정역방향 비율이 대략 반반이다", () => {
    let upright = 0;
    const totalDraws = 2000;
    for (let i = 0; i < totalDraws; i += 1) {
      if (drawCards(`ratio-${i}`, 1)[0]!.orientation === "upright") upright += 1;
    }
    const ratio = upright / totalDraws;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });

  it("전체 78장을 뽑을 수 있다", () => {
    expect(drawCards("full-deck", 78)).toHaveLength(78);
  });

  it("빈 시드나 범위 밖 매수는 오류를 던진다", () => {
    expect(() => drawCards("", 3)).toThrow(TarotSeedError);
    expect(() => drawCards("seed", 0)).toThrow(TarotSeedError);
    expect(() => drawCards("seed", 79)).toThrow(TarotSeedError);
    expect(() => drawCards("seed", 1.5)).toThrow(TarotSeedError);
  });
});
