/** 사주 명리 기본 상수 — 천간·지지·오행·지장간·절기. 순수 데이터만 둔다. */

export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
export type Polarity = "yang" | "yin";

export interface HeavenlyStem {
  readonly index: number; // 0..9
  readonly ko: string;
  /** 병음(拼音) 로마자 표기 — 영문 표시용. 예: 갑 → "Jia" */
  readonly en: string;
  readonly hanja: string;
  readonly element: FiveElement;
  readonly polarity: Polarity;
}

export interface EarthlyBranch {
  readonly index: number; // 0..11
  readonly ko: string;
  /** 병음(拼音) 로마자 표기 — 영문 표시용. 예: 자 → "Zi" */
  readonly en: string;
  readonly hanja: string;
  readonly element: FiveElement;
  /**
   * 자리(位) 기준 음양. 짝수 지지가 양이다.
   * 십신 판정에는 이 값이 아니라 지장간 정기(正氣)의 음양을 쓴다 — principalStem 참고.
   */
  readonly polarity: Polarity;
  /** 띠 (12지신) */
  readonly zodiacKo: string;
  readonly zodiacEn: string;
  /** 정기(正氣) 지장간의 천간 index. 십신 판정 기준. */
  readonly principalStem: number;
}

/** 천간 (天干) */
export const STEMS: readonly HeavenlyStem[] = Object.freeze(
  (
    [
      { index: 0, ko: "갑", en: "Jia", hanja: "甲", element: "wood", polarity: "yang" },
      { index: 1, ko: "을", en: "Yi", hanja: "乙", element: "wood", polarity: "yin" },
      { index: 2, ko: "병", en: "Bing", hanja: "丙", element: "fire", polarity: "yang" },
      { index: 3, ko: "정", en: "Ding", hanja: "丁", element: "fire", polarity: "yin" },
      { index: 4, ko: "무", en: "Wu", hanja: "戊", element: "earth", polarity: "yang" },
      { index: 5, ko: "기", en: "Ji", hanja: "己", element: "earth", polarity: "yin" },
      { index: 6, ko: "경", en: "Geng", hanja: "庚", element: "metal", polarity: "yang" },
      { index: 7, ko: "신", en: "Xin", hanja: "辛", element: "metal", polarity: "yin" },
      { index: 8, ko: "임", en: "Ren", hanja: "壬", element: "water", polarity: "yang" },
      { index: 9, ko: "계", en: "Gui", hanja: "癸", element: "water", polarity: "yin" },
    ] as const satisfies readonly HeavenlyStem[]
  ).map((s) => Object.freeze({ ...s })),
);

/** 지지 (地支) */
export const BRANCHES: readonly EarthlyBranch[] = Object.freeze(
  (
    [
      { index: 0, ko: "자", en: "Zi", hanja: "子", element: "water", polarity: "yang", zodiacKo: "쥐", zodiacEn: "Rat", principalStem: 9 },
      { index: 1, ko: "축", en: "Chou", hanja: "丑", element: "earth", polarity: "yin", zodiacKo: "소", zodiacEn: "Ox", principalStem: 5 },
      { index: 2, ko: "인", en: "Yin", hanja: "寅", element: "wood", polarity: "yang", zodiacKo: "호랑이", zodiacEn: "Tiger", principalStem: 0 },
      { index: 3, ko: "묘", en: "Mao", hanja: "卯", element: "wood", polarity: "yin", zodiacKo: "토끼", zodiacEn: "Rabbit", principalStem: 1 },
      { index: 4, ko: "진", en: "Chen", hanja: "辰", element: "earth", polarity: "yang", zodiacKo: "용", zodiacEn: "Dragon", principalStem: 4 },
      { index: 5, ko: "사", en: "Si", hanja: "巳", element: "fire", polarity: "yin", zodiacKo: "뱀", zodiacEn: "Snake", principalStem: 2 },
      { index: 6, ko: "오", en: "Wu", hanja: "午", element: "fire", polarity: "yang", zodiacKo: "말", zodiacEn: "Horse", principalStem: 3 },
      { index: 7, ko: "미", en: "Wei", hanja: "未", element: "earth", polarity: "yin", zodiacKo: "양", zodiacEn: "Goat", principalStem: 5 },
      { index: 8, ko: "신", en: "Shen", hanja: "申", element: "metal", polarity: "yang", zodiacKo: "원숭이", zodiacEn: "Monkey", principalStem: 6 },
      { index: 9, ko: "유", en: "You", hanja: "酉", element: "metal", polarity: "yin", zodiacKo: "닭", zodiacEn: "Rooster", principalStem: 7 },
      { index: 10, ko: "술", en: "Xu", hanja: "戌", element: "earth", polarity: "yang", zodiacKo: "개", zodiacEn: "Dog", principalStem: 4 },
      { index: 11, ko: "해", en: "Hai", hanja: "亥", element: "water", polarity: "yin", zodiacKo: "돼지", zodiacEn: "Pig", principalStem: 8 },
    ] as const satisfies readonly EarthlyBranch[]
  ).map((b) => Object.freeze({ ...b })),
);

/**
 * 지장간 (支藏干) — 지지 속에 감춰진 천간.
 * days 는 30일 월률분야 기준 배분일수이며 가중 오행 분포에 쓰인다.
 * 배열 마지막 원소가 정기(正氣)다.
 */
export interface HiddenStem {
  readonly stem: number;
  readonly days: number;
  readonly role: "residual" | "middle" | "principal"; // 여기 / 중기 / 정기
}

const HIDDEN_STEM_TABLE: readonly (readonly HiddenStem[])[] = [
  /* 子 */ [{ stem: 8, days: 10, role: "residual" }, { stem: 9, days: 20, role: "principal" }],
  /* 丑 */ [{ stem: 9, days: 9, role: "residual" }, { stem: 7, days: 3, role: "middle" }, { stem: 5, days: 18, role: "principal" }],
  /* 寅 */ [{ stem: 4, days: 7, role: "residual" }, { stem: 2, days: 7, role: "middle" }, { stem: 0, days: 16, role: "principal" }],
  /* 卯 */ [{ stem: 0, days: 10, role: "residual" }, { stem: 1, days: 20, role: "principal" }],
  /* 辰 */ [{ stem: 1, days: 9, role: "residual" }, { stem: 9, days: 3, role: "middle" }, { stem: 4, days: 18, role: "principal" }],
  /* 巳 */ [{ stem: 4, days: 7, role: "residual" }, { stem: 6, days: 7, role: "middle" }, { stem: 2, days: 16, role: "principal" }],
  /* 午 */ [{ stem: 2, days: 10, role: "residual" }, { stem: 5, days: 9, role: "middle" }, { stem: 3, days: 11, role: "principal" }],
  /* 未 */ [{ stem: 3, days: 9, role: "residual" }, { stem: 1, days: 3, role: "middle" }, { stem: 5, days: 18, role: "principal" }],
  /* 申 */ [{ stem: 4, days: 7, role: "residual" }, { stem: 8, days: 7, role: "middle" }, { stem: 6, days: 16, role: "principal" }],
  /* 酉 */ [{ stem: 6, days: 10, role: "residual" }, { stem: 7, days: 20, role: "principal" }],
  /* 戌 */ [{ stem: 7, days: 9, role: "residual" }, { stem: 3, days: 3, role: "middle" }, { stem: 4, days: 18, role: "principal" }],
  /* 亥 */ [{ stem: 4, days: 7, role: "residual" }, { stem: 0, days: 7, role: "middle" }, { stem: 8, days: 16, role: "principal" }],
];

export const HIDDEN_STEMS: readonly (readonly HiddenStem[])[] = Object.freeze(
  HIDDEN_STEM_TABLE.map((row) => Object.freeze(row.map((h) => Object.freeze({ ...h })))),
);

/** 오행 상생: 목→화→토→금→수→목 */
export const GENERATES: Readonly<Record<FiveElement, FiveElement>> = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

/** 오행 상극: 목→토→수→화→금→목 */
export const CONTROLS: Readonly<Record<FiveElement, FiveElement>> = Object.freeze({
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
});

export const ELEMENT_ORDER: readonly FiveElement[] = Object.freeze([
  "wood",
  "fire",
  "earth",
  "metal",
  "water",
]);

export const ELEMENT_KO: Readonly<Record<FiveElement, string>> = Object.freeze({
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
});

/** 오행 영문 표시명. 5원소 자체(FiveElement)는 이미 영문 식별자이므로 대문자 표기만 필요하다. */
export const ELEMENT_EN: Readonly<Record<FiveElement, string>> = Object.freeze({
  wood: "Wood",
  fire: "Fire",
  earth: "Earth",
  metal: "Metal",
  water: "Water",
});

/**
 * 24절기. 태양의 겉보기 황경(度) 기준이며, 입춘(315°)을 0번으로 두고 15°씩 증가한다.
 * kind "major" 가 절(節) — 월주(月柱)가 바뀌는 절입점이다. "minor" 는 중기(中氣).
 */
export interface SolarTermDef {
  readonly index: number; // 0..23, 입춘 기준
  readonly longitude: number; // 태양 황경 (도)
  readonly ko: string;
  readonly en: string;
  readonly hanja: string;
  readonly kind: "major" | "minor";
}

const TERM_NAMES = [
  ["입춘", "立春", "Beginning of Spring"], ["우수", "雨水", "Rain Water"],
  ["경칩", "驚蟄", "Awakening of Insects"], ["춘분", "春分", "Spring Equinox"],
  ["청명", "淸明", "Clear and Bright"], ["곡우", "穀雨", "Grain Rain"],
  ["입하", "立夏", "Beginning of Summer"], ["소만", "小滿", "Grain Full"],
  ["망종", "芒種", "Grain in Ear"], ["하지", "夏至", "Summer Solstice"],
  ["소서", "小暑", "Minor Heat"], ["대서", "大暑", "Major Heat"],
  ["입추", "立秋", "Beginning of Autumn"], ["처서", "處暑", "End of Heat"],
  ["백로", "白露", "White Dew"], ["추분", "秋分", "Autumn Equinox"],
  ["한로", "寒露", "Cold Dew"], ["상강", "霜降", "Descent of Frost"],
  ["입동", "立冬", "Beginning of Winter"], ["소설", "小雪", "Minor Snow"],
  ["대설", "大雪", "Major Snow"], ["동지", "冬至", "Winter Solstice"],
  ["소한", "小寒", "Minor Cold"], ["대한", "大寒", "Major Cold"],
] as const;

export const SOLAR_TERMS: readonly SolarTermDef[] = Object.freeze(
  TERM_NAMES.map(([ko, hanja, en], i) =>
    Object.freeze({
      index: i,
      longitude: (315 + i * 15) % 360,
      ko,
      en,
      hanja,
      kind: i % 2 === 0 ? ("major" as const) : ("minor" as const),
    }),
  ),
);

/** 절(節) 12개만 추린 목록. 배열 순서가 곧 인월(寅月)부터의 월 순서다. */
export const MAJOR_TERMS: readonly SolarTermDef[] = Object.freeze(
  SOLAR_TERMS.filter((t) => t.kind === "major"),
);

/**
 * 절 순번(0 = 입춘/인월) → 월지 index.
 * 인(2)월에서 시작해 축(1)월로 끝난다.
 */
export function monthBranchFromMajorTerm(majorTermOrdinal: number): number {
  return (majorTermOrdinal + 2) % 12;
}

const TWELVE_STAGE_PAIRS: readonly (readonly [string, string])[] = [
  ["장생", "Growth"], ["목욕", "Bath"], ["관대", "Cap"], ["건록", "Prosperity"],
  ["제왕", "Peak"], ["쇠", "Decline"], ["병", "Illness"], ["사", "Death"],
  ["묘", "Tomb"], ["절", "Extinction"], ["태", "Gestation"], ["양", "Nurture"],
];

/** 십이운성 (十二運星) */
export const TWELVE_STAGES: readonly string[] = Object.freeze(
  TWELVE_STAGE_PAIRS.map(([ko]) => ko),
);

/** 십이운성 영문 표준 표기 — TWELVE_STAGES 와 같은 순서(offset)로 대응한다. */
export const TWELVE_STAGES_EN: readonly string[] = Object.freeze(
  TWELVE_STAGE_PAIRS.map(([, en]) => en),
);

/** 십이운성 한글명 → 영문 표시명 조회. twelveStageOf()가 한글 문자열을 id 로 반환하므로 그 값을 그대로 키로 쓴다. */
export const TWELVE_STAGE_EN: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(TWELVE_STAGE_PAIRS),
);

/** 천간별 장생(長生) 지지 index. 양간은 순행, 음간은 역행한다. */
export const LIFE_STAGE_ORIGIN: readonly number[] = Object.freeze([
  11, // 甲 → 亥
  6, //  乙 → 午
  2, //  丙 → 寅
  9, //  丁 → 酉
  2, //  戊 → 寅
  9, //  己 → 酉
  5, //  庚 → 巳
  0, //  辛 → 子
  8, //  壬 → 申
  3, //  癸 → 卯
]);

/** 십신 (十神) */
export const TEN_GODS = [
  "비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인",
] as const;
export type TenGod = (typeof TEN_GODS)[number];

export interface TenGodLabel {
  readonly ko: string;
  readonly en: string;
  readonly hanja: string;
}

/** 십신 영문 표시명 — 영미권 사주(BaZi) 서적·사이트에서 통용되는 표준 역어를 쓴다. */
export const TEN_GOD_LABEL: Readonly<Record<TenGod, TenGodLabel>> = Object.freeze({
  비견: Object.freeze({ ko: "비견", en: "Friend", hanja: "比肩" }),
  겁재: Object.freeze({ ko: "겁재", en: "Rob Wealth", hanja: "劫財" }),
  식신: Object.freeze({ ko: "식신", en: "Eating God", hanja: "食神" }),
  상관: Object.freeze({ ko: "상관", en: "Hurting Officer", hanja: "傷官" }),
  편재: Object.freeze({ ko: "편재", en: "Indirect Wealth", hanja: "偏財" }),
  정재: Object.freeze({ ko: "정재", en: "Direct Wealth", hanja: "正財" }),
  편관: Object.freeze({ ko: "편관", en: "Seven Killings", hanja: "偏官" }),
  정관: Object.freeze({ ko: "정관", en: "Direct Officer", hanja: "正官" }),
  편인: Object.freeze({ ko: "편인", en: "Indirect Resource", hanja: "偏印" }),
  정인: Object.freeze({ ko: "정인", en: "Direct Resource", hanja: "正印" }),
});

/** 안전한 조회 헬퍼 — noUncheckedIndexedAccess 하에서 non-null 을 보장한다. */
export function stemAt(index: number): HeavenlyStem {
  const s = STEMS[((index % 10) + 10) % 10];
  if (!s) throw new RangeError(`invalid stem index: ${index}`);
  return s;
}

export function branchAt(index: number): EarthlyBranch {
  const b = BRANCHES[((index % 12) + 12) % 12];
  if (!b) throw new RangeError(`invalid branch index: ${index}`);
  return b;
}

export function hiddenStemsOf(branchIndex: number): readonly HiddenStem[] {
  const h = HIDDEN_STEMS[((branchIndex % 12) + 12) % 12];
  if (!h) throw new RangeError(`invalid branch index: ${branchIndex}`);
  return h;
}
