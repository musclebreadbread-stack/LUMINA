import { SIGNS } from "@engine/astro/constants";

/** 오늘의 운세가 다루는 두 체계 — 서양 별자리(태양궁)와 동양 12지신(띠). */
export type HoroscopeSystem = "zodiac" | "chinese";

export interface HoroscopeSign {
  readonly system: HoroscopeSystem;
  /** URL에 쓰는 로마자 키 */
  readonly key: string;
  readonly ko: string;
  readonly en: string;
  readonly symbol: string;
}

/** 서양 별자리 12개 — 점성술 엔진의 SIGNS 를 그대로 가져와 이름이 어긋나지 않게 한다. */
export const ZODIAC_SIGNS: readonly HoroscopeSign[] = Object.freeze(
  SIGNS.map((s) =>
    Object.freeze({
      system: "zodiac" as const,
      key: s.en.toLowerCase(),
      ko: s.ko,
      en: s.en,
      symbol: s.symbol,
    }),
  ),
);

const CHINESE_DATA: readonly (readonly [string, string, string, string])[] = [
  ["rat", "쥐", "Rat", "子"],
  ["ox", "소", "Ox", "丑"],
  ["tiger", "호랑이", "Tiger", "寅"],
  ["rabbit", "토끼", "Rabbit", "卯"],
  ["dragon", "용", "Dragon", "辰"],
  ["snake", "뱀", "Snake", "巳"],
  ["horse", "말", "Horse", "午"],
  ["goat", "양", "Goat", "未"],
  ["monkey", "원숭이", "Monkey", "申"],
  ["rooster", "닭", "Rooster", "酉"],
  ["dog", "개", "Dog", "戌"],
  ["pig", "돼지", "Pig", "亥"],
];

/** 12지신(띠) — 사주 지지와 같은 순서(자·축·인…)로 둔다. */
export const CHINESE_SIGNS: readonly HoroscopeSign[] = Object.freeze(
  CHINESE_DATA.map(([key, ko, en, symbol]) =>
    Object.freeze({ system: "chinese" as const, key, ko, en, symbol }),
  ),
);

export function signsOf(system: HoroscopeSystem): readonly HoroscopeSign[] {
  return system === "zodiac" ? ZODIAC_SIGNS : CHINESE_SIGNS;
}

export function findSign(system: HoroscopeSystem, key: string): HoroscopeSign | null {
  return signsOf(system).find((s) => s.key === key) ?? null;
}
