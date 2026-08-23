import { DateTime } from "luxon";
import {
  DEFAULT_PLACE,
  assertValidBirthInput,
  type BirthInput,
} from "@engine/shared/birth";
import { resolveInstant, resolveTimeZone } from "@engine/shared/time";
import type { EvidenceTier } from "@engine/shared/tier";
import { lunarToSolar } from "@engine/saju/lunar";
import {
  PLANETS,
  norm360,
  planetDef,
  signOfLongitude,
  type PlanetKey,
  type ZodiacSign,
} from "./constants";
import { computeAspects, type Aspect, type AspectOptions } from "./aspects";
import {
  computeAngles,
  computeHouses,
  houseOfLongitude,
  isPolarLatitude,
  type Angles,
  type HouseSystem,
  type Houses,
} from "./houses";
import { planetPosition, rightAscensionOfMidheaven, trueObliquity } from "./positions";

export * from "./aspects";
export * from "./constants";
export * from "./houses";
export * from "./positions";
export * from "./citations";
export * from "./explanations";

/** 시각 미상일 때 쓰는 기준 시각. 달의 위치 오차가 가장 작아지는 정오를 쓴다. */
const UNKNOWN_TIME_FALLBACK = { hour: 12, minute: 0 } as const;

export interface AstroOptions {
  /** 하우스 체계. 기본 "whole"(홀사인). */
  readonly houseSystem?: HouseSystem;
  readonly aspects?: AspectOptions;
}

export interface ChartPlanet {
  readonly key: PlanetKey;
  readonly ko: string;
  readonly en: string;
  readonly symbol: string;
  readonly longitude: number;
  readonly latitude: number;
  readonly distanceAu: number;
  readonly speedPerDay: number;
  readonly retrograde: boolean;
  readonly sign: ZodiacSign;
  /** 별자리 안에서의 도수 (0~30) */
  readonly degreeInSign: number;
  /** 시각 미상이면 하우스를 내지 않는다. */
  readonly house: number | null;
}

export interface AstroResult {
  readonly engine: "astro";
  readonly tier: EvidenceTier;
  readonly version: 1;

  readonly birth: {
    readonly solar: { year: number; month: number; day: number };
    readonly time: { hour: number; minute: number } | null;
    readonly place: { lat: number; lng: number; label?: string };
  };
  readonly time: {
    readonly timeZone: string;
    readonly utcOffsetMinutes: number;
    readonly isDST: boolean;
    readonly localISO: string;
    readonly instantISO: string;
    readonly timeUnknown: boolean;
  };

  readonly planets: readonly ChartPlanet[];
  /** 시각 미상이면 상승궁·중천을 낼 수 없다. */
  readonly angles: Angles | null;
  readonly houses: Houses | null;
  readonly aspects: readonly Aspect[];

  /** 해·달·상승궁 — 리포트의 머리에 오는 세 가지 */
  readonly bigThree: {
    readonly sun: ZodiacSign;
    readonly moon: ZodiacSign;
    readonly rising: ZodiacSign | null;
  };

  readonly obliquity: number;
  readonly boundary: {
    readonly timeUnknown: boolean;
    /** 극권 안쪽 — 상승궁이 정의되지 않을 수 있다. */
    readonly polarLatitude: boolean;
    /** 달은 하루에 약 13도 움직인다. 시각을 모르면 별자리가 갈릴 수 있다. */
    readonly moonSignAmbiguous: boolean;
    /** Placidus가 극권에서 이퀄 하우스로 대체되었는지 */
    readonly houseFallback: boolean;
  };
  readonly options: Required<Omit<AstroOptions, "aspects">>;
}

/**
 * 출생 차트 산출.
 *
 * 사주 엔진과 같은 규율을 따른다 — 계산만 하고 해석은 하지 않으며, 현재 시각을
 * 읽지 않고, 결과는 전부 동결된 순수 데이터다.
 */
export function computeChart(input: BirthInput, options: AstroOptions = {}): AstroResult {
  assertValidBirthInput(input);

  const houseSystem = options.houseSystem ?? "whole";

  const solar =
    (input.calendar ?? "solar") === "lunar"
      ? lunarToSolar(input.date.year, input.date.month, input.date.day, input.isLeapMonth ?? false)
      : { year: input.date.year, month: input.date.month, day: input.date.day };

  const place = input.place ?? DEFAULT_PLACE;
  const timeZone = resolveTimeZone(place);
  const timeUnknown = !input.time;
  const resolved = resolveInstant(solar, input.time ?? UNKNOWN_TIME_FALLBACK, timeZone);
  const instant = resolved.instant;

  const obliquity = trueObliquity(instant);

  // 시각을 모르면 상승궁·중천·하우스는 낼 수 없다. 지구 자전이 4분에 1도씩 돌리기 때문이다.
  const ramcDeg = rightAscensionOfMidheaven(instant, place.lng);
  const angles = timeUnknown ? null : computeAngles(ramcDeg, obliquity, place.lat);
  const houses = angles
    ? computeHouses(angles, houseSystem, {
        ramcDeg,
        obliquityDeg: obliquity,
        latitudeDeg: place.lat,
      })
    : null;

  const planets: ChartPlanet[] = PLANETS.map((def) => {
    const pos = planetPosition(def.key, instant);
    const sign = signOfLongitude(pos.longitude);
    return Object.freeze({
      key: def.key,
      ko: def.ko,
      en: def.en,
      symbol: def.symbol,
      longitude: pos.longitude,
      latitude: pos.latitude,
      distanceAu: pos.distanceAu,
      speedPerDay: pos.speedPerDay,
      retrograde: pos.retrograde,
      sign,
      degreeInSign: norm360(pos.longitude) - sign.startDegree,
      house: houses ? houseOfLongitude(houses, pos.longitude) : null,
    });
  });

  const byKey = new Map(planets.map((p) => [p.key, p]));
  const sun = byKey.get("sun")!;
  const moon = byKey.get("moon")!;

  // 시각을 모르면 정오 기준이라 달이 최대 ±6.5도 어긋난다. 경계 근처면 별자리가 갈린다.
  const moonSignAmbiguous =
    timeUnknown && (moon.degreeInSign < 7 || moon.degreeInSign > 23);

  return Object.freeze({
    engine: "astro" as const,
    tier: "cultural" as EvidenceTier,
    version: 1 as const,

    birth: Object.freeze({
      solar: Object.freeze(solar),
      time: input.time ? Object.freeze({ ...input.time }) : null,
      place: Object.freeze({ lat: place.lat, lng: place.lng, label: place.label }),
    }),
    time: Object.freeze({
      timeZone,
      utcOffsetMinutes: resolved.utcOffsetMinutes,
      isDST: resolved.isDST,
      localISO: DateTime.fromJSDate(instant, { zone: timeZone }).toISO() ?? "",
      instantISO: instant.toISOString(),
      timeUnknown,
    }),

    planets: Object.freeze(planets),
    angles,
    houses,
    aspects: computeAspects(planets, options.aspects),

    bigThree: Object.freeze({
      sun: sun.sign,
      moon: moon.sign,
      rising: angles ? signOfLongitude(angles.ascendant) : null,
    }),

    obliquity,
    boundary: Object.freeze({
      timeUnknown,
      polarLatitude: isPolarLatitude(place.lat),
      moonSignAmbiguous,
      houseFallback: houses?.fallback === "equal",
    }),
    options: Object.freeze({ houseSystem }),
  });
}

/** 표시용 — "사자자리 12°34′" */
export function formatPosition(planet: ChartPlanet): string {
  const deg = Math.floor(planet.degreeInSign);
  const min = Math.floor((planet.degreeInSign - deg) * 60);
  return `${planet.sign.ko} ${deg}°${String(min).padStart(2, "0")}′${planet.retrograde ? " R" : ""}`;
}

export { planetDef };
