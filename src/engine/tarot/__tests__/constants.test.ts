import { describe, expect, it } from "vitest";
import {
  DECK,
  MAJOR_ARCANA_COUNT,
  MINOR_ARCANA_COUNT,
  RANKS,
  SUITS,
  cardAt,
  rankOf,
  suitOf,
} from "@engine/tarot/constants";

describe("덱 구성", () => {
  it("메이저 22 + 마이너 56 = 78장이다", () => {
    expect(DECK).toHaveLength(78);
    expect(MAJOR_ARCANA_COUNT + MINOR_ARCANA_COUNT).toBe(78);
    expect(DECK.filter((c) => c.suit === "major")).toHaveLength(22);
    expect(DECK.filter((c) => c.suit !== "major")).toHaveLength(56);
  });

  it("id 는 0부터 77까지 빈틈없이 이어진다", () => {
    DECK.forEach((c, i) => expect(c.id).toBe(i));
  });

  it("모든 카드 이름이 서로 다르다", () => {
    expect(new Set(DECK.map((c) => c.name)).size).toBe(78);
  });

  it("메이저 아르카나 번호는 0~21 이며 중복이 없다", () => {
    const majors = DECK.filter((c) => c.suit === "major");
    expect(new Set(majors.map((c) => c.number)).size).toBe(22);
    majors.forEach((c) => {
      expect(c.number).toBeGreaterThanOrEqual(0);
      expect(c.number).toBeLessThanOrEqual(21);
    });
  });

  it("네 수트 모두 14장(에이스~왕)씩 갖는다", () => {
    for (const suit of SUITS) {
      const cards = DECK.filter((c) => c.suit === suit.key);
      expect(cards, suit.key).toHaveLength(14);
      expect(new Set(cards.map((c) => c.number)).size).toBe(14);
      cards.forEach((c) => {
        expect(c.number).toBeGreaterThanOrEqual(1);
        expect(c.number).toBeLessThanOrEqual(14);
      });
    }
  });

  it("모든 카드가 upright·reversed 키워드를 최소 1개씩 갖는다", () => {
    DECK.forEach((c) => {
      expect(c.keywordsUpright.length, c.name).toBeGreaterThan(0);
      expect(c.keywordsReversed.length, c.name).toBeGreaterThan(0);
    });
  });

  it("cardAt 은 id 로 정확한 카드를 돌려주고 범위를 벗어나면 오류를 던진다", () => {
    expect(cardAt(0).name).toBe("바보");
    expect(cardAt(77).suit).toBe("pentacles");
    expect(() => cardAt(78)).toThrow(RangeError);
    expect(() => cardAt(-1)).toThrow(RangeError);
  });
});

describe("수트 · 위계 테이블", () => {
  it("수트는 4개이며 각기 다른 고전 원소를 가진다", () => {
    expect(SUITS).toHaveLength(4);
    expect(new Set(SUITS.map((s) => s.element)).size).toBe(4);
  });

  it("위계는 1~14 이고 시종·기사·여왕·왕이 11~14에 온다", () => {
    expect(RANKS).toHaveLength(14);
    expect(rankOf(11).ko).toBe("시종");
    expect(rankOf(12).ko).toBe("기사");
    expect(rankOf(13).ko).toBe("여왕");
    expect(rankOf(14).ko).toBe("왕");
  });

  it("존재하지 않는 수트·위계는 오류를 던진다", () => {
    // @ts-expect-error — 런타임 방어를 확인한다
    expect(() => suitOf("fire")).toThrow(RangeError);
    expect(() => rankOf(0)).toThrow(RangeError);
    expect(() => rankOf(15)).toThrow(RangeError);
  });

  it("78장 모두 카드별 도상 설명을 갖고 서로 다른 장면을 제공한다", () => {
    expect(new Set(DECK.map((card) => card.iconography.en)).size).toBe(78);
    DECK.forEach((card) => {
      expect(card.iconography.ko.length, card.name).toBeGreaterThan(20);
      expect(card.iconography.en.length, card.nameEn).toBeGreaterThan(20);
    });
  });

  it("마이너 카드 이름은 '수트 위계' 형식이다", () => {
    expect(cardAt(22).name).toBe("완드 에이스"); // 메이저 22장 다음 첫 마이너
    expect(DECK.find((c) => c.suit === "cups" && c.number === 14)!.name).toBe("컵 왕");
  });
});
