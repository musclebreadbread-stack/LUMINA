import type { FiveElement } from "@engine/saju";

/**
 * 오행 표시 규약.
 *
 * 색은 오직 여기서만 나온다. Tailwind 스캐너가 문자열을 찾을 수 있도록
 * 클래스 이름을 조립하지 않고 통째로 적어 둔다.
 */
export interface ElementStyle {
  readonly ko: string;
  readonly en: string;
  readonly hanja: string;
  /** 이 오행이 상징하는 것 — 한 단어 */
  readonly gloss: string;
  readonly glossEn: string;
  readonly text: string;
  readonly bg: string;
  readonly border: string;
  readonly fill: string;
  /** SVG 등에서 직접 쓰는 CSS 변수 */
  readonly cssVar: string;
}

export const ELEMENT_STYLE: Readonly<Record<FiveElement, ElementStyle>> = Object.freeze({
  wood: {
    ko: "목",
    en: "Wood",
    hanja: "木",
    gloss: "뻗음",
    glossEn: "Reaching",
    text: "text-mok",
    bg: "bg-mok",
    border: "border-mok",
    fill: "fill-mok",
    cssVar: "var(--color-mok)",
  },
  fire: {
    ko: "화",
    en: "Fire",
    hanja: "火",
    gloss: "번짐",
    glossEn: "Spreading",
    text: "text-hwa",
    bg: "bg-hwa",
    border: "border-hwa",
    fill: "fill-hwa",
    cssVar: "var(--color-hwa)",
  },
  earth: {
    ko: "토",
    en: "Earth",
    hanja: "土",
    gloss: "머금음",
    glossEn: "Holding",
    text: "text-to",
    bg: "bg-to",
    border: "border-to",
    fill: "fill-to",
    cssVar: "var(--color-to)",
  },
  metal: {
    ko: "금",
    en: "Metal",
    hanja: "金",
    gloss: "벼림",
    glossEn: "Tempering",
    text: "text-geum",
    bg: "bg-geum",
    border: "border-geum",
    fill: "fill-geum",
    cssVar: "var(--color-geum)",
  },
  water: {
    ko: "수",
    en: "Water",
    hanja: "水",
    gloss: "스밈",
    glossEn: "Seeping",
    text: "text-su",
    bg: "bg-su",
    border: "border-su",
    fill: "fill-su",
    cssVar: "var(--color-su)",
  },
});

export const ELEMENT_SEQUENCE: readonly FiveElement[] = Object.freeze([
  "wood",
  "fire",
  "earth",
  "metal",
  "water",
]);

export function elementStyle(el: FiveElement): ElementStyle {
  return ELEMENT_STYLE[el];
}
