/** 서양 점성술 기본 상수 — 12궁, 천체, 각(aspect). 순수 데이터만 둔다. */

/** 점성술의 4원소. 사주 오행(FiveElement)과는 다른 체계이므로 이름을 분리한다. */
export type ZodiacElement = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

/*
  기호에 붙은 U+FE0E(변이 선택자)는 장식이 아니다.
  ♈·♀ 같은 문자는 유니코드 기본 표현이 이모지라서, 붙이지 않으면 브라우저가
  컬러 이모지 폰트로 대체해 버린다. 이 화면은 무채색 규율을 지켜야 하므로
  텍스트 글리프 표현을 강제한다.
*/
export interface ZodiacSign {
  /** 0 = 양자리 … 11 = 물고기자리 */
  readonly index: number;
  readonly ko: string;
  readonly en: string;
  readonly symbol: string;
  readonly element: ZodiacElement;
  readonly modality: Modality;
  /** 황경 시작각 (도) */
  readonly startDegree: number;
}

const SIGN_DATA = [
  ["양자리", "Aries", "♈︎", "fire", "cardinal"],
  ["황소자리", "Taurus", "♉︎", "earth", "fixed"],
  ["쌍둥이자리", "Gemini", "♊︎", "air", "mutable"],
  ["게자리", "Cancer", "♋︎", "water", "cardinal"],
  ["사자자리", "Leo", "♌︎", "fire", "fixed"],
  ["처녀자리", "Virgo", "♍︎", "earth", "mutable"],
  ["천칭자리", "Libra", "♎︎", "air", "cardinal"],
  ["전갈자리", "Scorpio", "♏︎", "water", "fixed"],
  ["궁수자리", "Sagittarius", "♐︎", "fire", "mutable"],
  ["염소자리", "Capricorn", "♑︎", "earth", "cardinal"],
  ["물병자리", "Aquarius", "♒︎", "air", "fixed"],
  ["물고기자리", "Pisces", "♓︎", "water", "mutable"],
] as const;

export const SIGNS: readonly ZodiacSign[] = Object.freeze(
  SIGN_DATA.map(([ko, en, symbol, element, modality], i) =>
    Object.freeze({
      index: i,
      ko,
      en,
      symbol,
      element: element as ZodiacElement,
      modality: modality as Modality,
      startDegree: i * 30,
    }),
  ),
);

export function signAt(index: number): ZodiacSign {
  const s = SIGNS[((index % 12) + 12) % 12];
  if (!s) throw new RangeError(`invalid sign index: ${index}`);
  return s;
}

/** 황경(도) → 별자리 */
export function signOfLongitude(longitude: number): ZodiacSign {
  return signAt(Math.floor((((longitude % 360) + 360) % 360) / 30));
}

/**
 * 차트에 올리는 천체.
 * 명왕성은 행성 지위를 잃었지만 점성술 해석 체계에서는 그대로 쓰이므로 포함한다.
 */
export type PlanetKey =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export interface PlanetDef {
  readonly key: PlanetKey;
  readonly ko: string;
  readonly en: string;
  readonly symbol: string;
  /** 해와 달은 해석에서 비중이 커서 각(aspect) 허용 오차를 넓게 쓴다. */
  readonly isLuminary: boolean;
}

export const PLANETS: readonly PlanetDef[] = Object.freeze(
  (
    [
      ["sun", "태양", "Sun", "☉︎", true],
      ["moon", "달", "Moon", "☽︎", true],
      ["mercury", "수성", "Mercury", "☿︎", false],
      ["venus", "금성", "Venus", "♀︎", false],
      ["mars", "화성", "Mars", "♂︎", false],
      ["jupiter", "목성", "Jupiter", "♃︎", false],
      ["saturn", "토성", "Saturn", "♄︎", false],
      ["uranus", "천왕성", "Uranus", "♅︎", false],
      ["neptune", "해왕성", "Neptune", "♆︎", false],
      ["pluto", "명왕성", "Pluto", "♇︎", false],
    ] as const
  ).map(([key, ko, en, symbol, isLuminary]) =>
    Object.freeze({ key: key as PlanetKey, ko, en, symbol, isLuminary }),
  ),
);

export function planetDef(key: PlanetKey): PlanetDef {
  const p = PLANETS.find((x) => x.key === key);
  if (!p) throw new RangeError(`unknown planet: ${key}`);
  return p;
}

/** 메이저 각(major aspect)만 다룬다. 마이너 각은 해석 유파 차이가 커서 뺐다. */
export interface AspectDef {
  readonly key: string;
  readonly ko: string;
  readonly en: string;
  readonly angle: number;
  /** 기본 허용 오차(도). 해·달이 끼면 2도 넓힌다. */
  readonly orb: number;
}

export const ASPECTS: readonly AspectDef[] = Object.freeze([
  Object.freeze({ key: "conjunction", ko: "합", en: "Conjunction", angle: 0, orb: 6 }),
  Object.freeze({ key: "sextile", ko: "육분", en: "Sextile", angle: 60, orb: 4 }),
  Object.freeze({ key: "square", ko: "사분", en: "Square", angle: 90, orb: 6 }),
  Object.freeze({ key: "trine", ko: "삼분", en: "Trine", angle: 120, orb: 6 }),
  Object.freeze({ key: "opposition", ko: "대치", en: "Opposition", angle: 180, orb: 6 }),
]);

/** 각도를 [0, 360) 으로 정규화 */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 각도를 (-180, 180] 으로 정규화 */
export function norm180(deg: number): number {
  const d = norm360(deg);
  return d > 180 ? d - 360 : d;
}
