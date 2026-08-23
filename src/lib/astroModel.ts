import { DateTime } from "luxon";
import {
  computeChart,
  norm360,
  astroMethodExplanation,
  placementExplanation,
  ASTRO_ASPECT_EXPLANATIONS,
  ASTRO_BIG_THREE_EXPLANATIONS,
  ASTRO_HOUSE_EXPLANATIONS,
  ASTRO_PLANET_EXPLANATIONS,
  ASTRO_SIGN_EXPLANATIONS,
  type AstroResult,
  type HouseSystem,
  type Modality,
  type ZodiacElement,
} from "@engine/astro";
import type { ExplanationBlock } from "@engine/shared/explanation";
import type { Locale } from "@/i18n/locale";
import { toBirthInput, type StoredProfile } from "./profile";

/**
 * 출생 차트 → 화면 전용 뷰 모델.
 *
 * 사주 쪽과 같은 규율이다. 변환은 서버에서만 일어나고, 컴포넌트에는 직렬화 가능한
 * 값만 넘어간다.
 *
 * 이 파일은 로케일을 모른다. 별자리·천체·각(aspect)처럼 이미 ko/en 짝을 가진 엔진
 * 데이터(SIGNS·PLANETS·ASPECTS)는 그 짝을 그대로 실어 보내고, 문장으로 엮어야 하는
 * 안내문은 조립하지 않은 채 구조화된 값(AstroNote)으로 남겨 둔다 — 실제 문구 선택과
 * 조립은 next-intl 을 쓸 수 있는 서버 컴포넌트가 한다.
 *
 * 색에 대해: 점성술의 4원소는 사주의 오행과 다른 체계다. 오행 색을 빌려 쓰면 두
 * 체계가 대응한다는 잘못된 인상을 준다. 그래서 이 리포트는 무채색으로만 그리고,
 * 원소·성질은 색이 아니라 글자로 적는다.
 */

export interface WheelPlanet {
  readonly key: string;
  readonly ko: string;
  readonly symbol: string;
  readonly longitude: number;
  readonly retrograde: boolean;
  readonly isLuminary: boolean;
}

/** 리포트 하단 안내문. 조립되지 않은 구조화된 값 — 문구 선택은 화면 쪽 책임이다. */
export type AstroNote =
  | { readonly key: "timeUnknown" }
  | { readonly key: "moonSignAmbiguous" }
  | { readonly key: "polarLatitude" }
  | { readonly key: "dst" }
  | { readonly key: "houseSystem" }
  | { readonly key: "houseFallback" };

export interface AstroView {
  /** ISO(오프셋 포함) — 화면에서 로케일에 맞는 형식으로 다시 포맷한다 */
  readonly birthLocalISO: string;
  readonly timeUnknown: boolean;
  readonly placeLabel: string;

  readonly bigThree: {
    readonly sun: { readonly ko: string; readonly en: string; readonly symbol: string; readonly signIndex: number };
    readonly moon: { readonly ko: string; readonly en: string; readonly symbol: string; readonly signIndex: number };
    readonly rising: { readonly ko: string; readonly en: string; readonly symbol: string; readonly signIndex: number } | null;
  };

  readonly planets: readonly {
    readonly key: string;
    readonly ko: string;
    readonly en: string;
    readonly symbol: string;
    readonly signKo: string;
    readonly signEn: string;
    readonly signSymbol: string;
    readonly signIndex: number;
    /** 별자리 안에서의 도수(0~30). 위치 문구는 formatPlanetPosition 이 로케일에 맞춰 조립한다. */
    readonly degreeInSign: number;
    readonly retrograde: boolean;
    readonly house: number | null;
    readonly element: ZodiacElement;
    readonly modality: Modality;
    readonly speedPerDay: number;
  }[];

  readonly aspects: readonly {
    readonly key: string;
    readonly aKo: string;
    readonly aEn: string;
    readonly aSymbol: string;
    readonly bKo: string;
    readonly bEn: string;
    readonly bSymbol: string;
    readonly ko: string;
    readonly en: string;
    readonly angle: number;
    readonly orb: string;
    readonly strength: number;
  }[];

  /** 차트 휠이 그릴 최소한의 값 */
  readonly wheel: {
    readonly ascendant: number | null;
    readonly midheaven: number | null;
    readonly houseCusps: readonly number[];
    readonly houseSystem: HouseSystem;
    readonly houseFallback: boolean;
    readonly planets: readonly WheelPlanet[];
    readonly aspectLines: readonly {
      readonly from: number;
      readonly to: number;
      readonly kind: string;
      readonly strength: number;
    }[];
  };

  readonly precision: {
    readonly timeZone: string;
    readonly offsetLabel: string;
    readonly isDST: boolean;
    readonly instantISO: string;
    readonly obliquity: string;
  };

  /** 원소·성질 분포 — 서양 점성술의 기본 요약. 라벨은 화면에서 t() 로 고른다. */
  readonly balance: {
    readonly elements: readonly { readonly key: ZodiacElement; readonly count: number }[];
    readonly modalities: readonly { readonly key: Modality; readonly count: number }[];
  };

  readonly notes: readonly AstroNote[];

  readonly explanations: {
    readonly method: ExplanationBlock;
    readonly placements: readonly ExplanationBlock[];
    readonly bigThree: readonly ExplanationBlock[];
    readonly signs: readonly ExplanationBlock[];
    readonly planets: readonly ExplanationBlock[];
    readonly aspects: readonly ExplanationBlock[];
    readonly houses: readonly ExplanationBlock[];
  };
}

function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * 천체 위치 문구 — "사자자리 12°34′"(역행이면 R 포함). 별자리 이름만 로케일에 따라
 * 갈리고 나머지(도·분 표기, R 표시)는 두 언어에서 같은 천문학 관례라 메시지 카탈로그가
 * 필요 없다. reportModel의 formatBirthLabel과 같은 이유로 로케일을 호출 시점 인자로
 * 받는 순수 함수로 둔다.
 */
export function formatPlanetPosition(
  planet: {
    readonly signKo: string;
    readonly signEn: string;
    readonly degreeInSign: number;
    readonly retrograde: boolean;
  },
  locale: Locale,
): string {
  const deg = Math.floor(planet.degreeInSign);
  const min = Math.floor((planet.degreeInSign - deg) * 60);
  const signName = locale === "en" ? planet.signEn : planet.signKo;
  return `${signName} ${deg}°${String(min).padStart(2, "0")}′${planet.retrograde ? " R" : ""}`;
}

function buildNotes(chart: AstroResult): AstroNote[] {
  const notes: AstroNote[] = [];

  if (chart.boundary.timeUnknown) notes.push({ key: "timeUnknown" });
  if (chart.boundary.moonSignAmbiguous) notes.push({ key: "moonSignAmbiguous" });
  if (chart.boundary.polarLatitude) notes.push({ key: "polarLatitude" });
  if (chart.time.isDST) notes.push({ key: "dst" });

  // 하우스 체계 설명은 언제나 붙는다 — 지금 낼 수 있는 체계가 두 가지뿐이라는 한계를 밝힌다.
  notes.push({ key: "houseSystem" });
  if (chart.boundary.houseFallback) notes.push({ key: "houseFallback" });

  return notes;
}

export function buildAstroView(
  profile: StoredProfile,
  referenceDate: Date,
  houseSystem: HouseSystem = "whole",
): AstroView {
  void referenceDate; // 차트 자체는 시간에 의존하지 않는다. 서명을 사주 쪽과 맞춰 둔다.

  const chart = computeChart(toBirthInput(profile), { houseSystem });
  const local = DateTime.fromISO(chart.time.localISO, { setZone: true });

  const elementCount = { fire: 0, earth: 0, air: 0, water: 0 } as Record<ZodiacElement, number>;
  const modalityCount = { cardinal: 0, fixed: 0, mutable: 0 } as Record<Modality, number>;
  for (const p of chart.planets) {
    elementCount[p.sign.element] += 1;
    modalityCount[p.sign.modality] += 1;
  }

  const byKey = new Map(chart.planets.map((p) => [p.key, p]));

  return {
    birthLocalISO: local.toISO() ?? "",
    timeUnknown: chart.time.timeUnknown,
    placeLabel: profile.placeLabel,

    bigThree: {
      sun: { ko: chart.bigThree.sun.ko, en: chart.bigThree.sun.en, symbol: chart.bigThree.sun.symbol, signIndex: chart.bigThree.sun.index },
      moon: { ko: chart.bigThree.moon.ko, en: chart.bigThree.moon.en, symbol: chart.bigThree.moon.symbol, signIndex: chart.bigThree.moon.index },
      rising: chart.bigThree.rising
        ? {
            ko: chart.bigThree.rising.ko,
            en: chart.bigThree.rising.en,
            symbol: chart.bigThree.rising.symbol,
            signIndex: chart.bigThree.rising.index,
          }
        : null,
    },

    planets: chart.planets.map((p) => ({
      key: p.key,
      ko: p.ko,
      en: p.en,
      symbol: p.symbol,
      signKo: p.sign.ko,
      signEn: p.sign.en,
      signSymbol: p.sign.symbol,
      signIndex: p.sign.index,
      degreeInSign: p.degreeInSign,
      retrograde: p.retrograde,
      house: p.house,
      element: p.sign.element,
      modality: p.sign.modality,
      speedPerDay: p.speedPerDay,
    })),

    aspects: chart.aspects.map((a) => ({
      key: a.def.key,
      aKo: byKey.get(a.a)!.ko,
      aEn: byKey.get(a.a)!.en,
      aSymbol: byKey.get(a.a)!.symbol,
      bKo: byKey.get(a.b)!.ko,
      bEn: byKey.get(a.b)!.en,
      bSymbol: byKey.get(a.b)!.symbol,
      ko: a.def.ko,
      en: a.def.en,
      angle: a.def.angle,
      orb: `${a.orb.toFixed(1)}°`,
      strength: a.strength,
    })),

    wheel: {
      ascendant: chart.angles?.ascendant ?? null,
      midheaven: chart.angles?.midheaven ?? null,
      houseCusps: chart.houses?.cusps.map((c) => c.longitude) ?? [],
      houseSystem: chart.options.houseSystem,
      houseFallback: chart.boundary.houseFallback,
      planets: chart.planets.map((p) => ({
        key: p.key,
        ko: p.ko,
        symbol: p.symbol,
        longitude: norm360(p.longitude),
        retrograde: p.retrograde,
        isLuminary: p.key === "sun" || p.key === "moon",
      })),
      aspectLines: chart.aspects.map((a) => ({
        from: norm360(byKey.get(a.a)!.longitude),
        to: norm360(byKey.get(a.b)!.longitude),
        kind: a.def.key,
        strength: a.strength,
      })),
    },

    precision: {
      timeZone: chart.time.timeZone,
      offsetLabel: offsetLabel(chart.time.utcOffsetMinutes),
      isDST: chart.time.isDST,
      instantISO: chart.time.instantISO,
      obliquity: `${chart.obliquity.toFixed(4)}°`,
    },

    balance: {
      elements: (["fire", "earth", "air", "water"] as const).map((key) => ({
        key,
        count: elementCount[key],
      })),
      modalities: (["cardinal", "fixed", "mutable"] as const).map((key) => ({
        key,
        count: modalityCount[key],
      })),
    },

    notes: buildNotes(chart),
    explanations: {
      method: astroMethodExplanation(chart.options.houseSystem),
      placements: Object.freeze(
        chart.planets.map((planet) => placementExplanation(planet.key, planet.sign.index)),
      ),
      bigThree: ASTRO_BIG_THREE_EXPLANATIONS,
      signs: ASTRO_SIGN_EXPLANATIONS,
      planets: ASTRO_PLANET_EXPLANATIONS,
      aspects: ASTRO_ASPECT_EXPLANATIONS,
      houses: ASTRO_HOUSE_EXPLANATIONS,
    },
  };
}
