import { Body, Illumination, MoonPhase } from "astronomy-engine";
import { signOfLongitude, planetPosition, type PlanetKey } from "@engine/astro";
import type { EvidenceTier } from "@engine/shared/tier";
import { assetPath, mandalaTexturePath } from "./assets";

/** 홈 만다라에 올리는 현재 탐구 방법과 실제 천체의 대응표. */
export const MANDALA_FEATURES = Object.freeze([
  {
    key: "saju",
    titleKey: "hubSajuTitle",
    descKey: "hubSajuDesc",
    href: "/saju",
    tier: "cultural" as EvidenceTier,
    imageSrc: assetPath("saju/zodiac", "dragon"),
    textureSrc: mandalaTexturePath("saju"),
    planetKey: "sun" as PlanetKey,
    orbitInset: 18,
  },
  {
    key: "tarot",
    titleKey: "hubTarotTitle",
    descKey: "hubTarotDesc",
    href: "/tarot",
    tier: "cultural" as EvidenceTier,
    imageSrc: assetPath("tarot/cards", "00"),
    textureSrc: mandalaTexturePath("tarot"),
    planetKey: "moon" as PlanetKey,
    orbitInset: 19,
  },
  {
    key: "numerology",
    titleKey: "hubNumerologyTitle",
    descKey: "hubNumerologyDesc",
    href: "/numerology",
    tier: "cultural" as EvidenceTier,
    imageSrc: assetPath("numerology/numbers", "11"),
    textureSrc: mandalaTexturePath("numerology"),
    planetKey: "mercury" as PlanetKey,
    orbitInset: 10,
  },
  {
    key: "psychometrics",
    titleKey: "hubPsychometricsTitle",
    descKey: "hubPsychometricsDesc",
    href: "/psychometrics",
    tier: "scientific" as EvidenceTier,
    imageSrc: assetPath("psychometrics/factors", "intellect"),
    textureSrc: mandalaTexturePath("psychometrics"),
    planetKey: "saturn" as PlanetKey,
    orbitInset: 22,
  },
  {
    key: "jungian",
    titleKey: "hubJungianTitle",
    descKey: "hubJungianDesc",
    href: "/psychometrics/types",
    tier: "scientific" as EvidenceTier,
    imageSrc: assetPath("psychometrics/types", "intj"),
    textureSrc: mandalaTexturePath("psychometrics"),
    planetKey: "venus" as PlanetKey,
    orbitInset: 14,
  },
  {
    key: "darktriad",
    titleKey: "hubDarkTriadTitle",
    descKey: "hubDarkTriadDesc",
    href: "/darktriad",
    tier: "scientific" as EvidenceTier,
    imageSrc: assetPath("psychometrics/factors", "intellect"),
    textureSrc: mandalaTexturePath("psychometrics"),
    planetKey: "mars" as PlanetKey,
    orbitInset: 12,
  },
  {
    key: "attachment",
    titleKey: "hubAttachmentTitle",
    descKey: "hubAttachmentDesc",
    href: "/attachment",
    tier: "scientific" as EvidenceTier,
    imageSrc: assetPath("psychometrics/factors", "agreeableness"),
    textureSrc: mandalaTexturePath("psychometrics"),
    planetKey: "moon" as PlanetKey,
    orbitInset: 20,
  },
  {
    key: "horoscope",
    titleKey: "hubHoroscopeTitle",
    descKey: "hubHoroscopeDesc",
    href: "/horoscope",
    tier: "cultural" as EvidenceTier,
    imageSrc: assetPath("horoscope/zodiac", "leo"),
    textureSrc: mandalaTexturePath("horoscope"),
    planetKey: "jupiter" as PlanetKey,
    orbitInset: 16,
  },
] as const);

export type MandalaFeatureKey = (typeof MANDALA_FEATURES)[number]["key"];

export type MoonPhaseKey =
  | "new"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "full"
  | "waningGibbous"
  | "thirdQuarter"
  | "waningCrescent";

export interface MandalaNodeModel {
  readonly key: MandalaFeatureKey;
  readonly titleKey: string;
  readonly descKey: string;
  readonly href: string;
  readonly tier: EvidenceTier;
  readonly imageSrc: string;
  readonly textureSrc: string;
  readonly planetKey: PlanetKey;
  readonly orbitInset: number;
  /** 진분점 of date 기준 현재 황경. CSS/R3F의 초기 각도로 그대로 사용한다. */
  readonly longitude: number;
  /** The astronomical longitude stays authoritative; this only prevents card collisions. */
  readonly displayLongitude: number;
  readonly latitude: number;
  /** 하루당 이동량. 실제 하늘의 상대 속도를 모션에 반영할 때 사용한다. */
  readonly speedPerDay: number;
  readonly retrograde: boolean;
  readonly orbitalPeriodDays: number;
  /** 실제 속도의 순서를 보존하면서 화면에서 관찰 가능한 속도로 압축한 시간. */
  readonly visualDurationSeconds: number;
  readonly sign: { readonly ko: string; readonly en: string; readonly symbol: string };
  readonly degreeInSign: number;
}

export interface MandalaModel {
  readonly instantISO: string;
  readonly nodes: readonly MandalaNodeModel[];
  readonly sky: {
    readonly moonPhaseAngle: number;
    readonly moonIlluminationPercent: number;
    readonly moonPhaseKey: MoonPhaseKey;
  };
}

function moonPhaseKey(angle: number): MoonPhaseKey {
  const index = Math.round((((angle % 360) + 360) % 360) / 45) % 8;
  const phases: readonly MoonPhaseKey[] = [
    "new",
    "waxingCrescent",
    "firstQuarter",
    "waxingGibbous",
    "full",
    "waningGibbous",
    "thirdQuarter",
    "waningCrescent",
  ];
  return phases[index] ?? "new";
}

function visualDurationSeconds(speedPerDay: number): number {
  const magnitude = Math.max(Math.abs(speedPerDay), 0.025);
  const normalized = Math.log1p(magnitude) / Math.log1p(14);
  return Math.round(124 - normalized * 96);
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Keep real longitudes as data while separating crowded interactive cards. */
function displayLongitudes(longitudes: readonly number[]): readonly number[] {
  const normalized = longitudes.map(normalizeDegrees);
  const sorted = normalized
    .map((longitude, index) => ({ longitude, index }))
    .sort((a, b) => a.longitude - b.longitude);
  const circularGaps = sorted.map((item, index) => {
    const next = sorted[(index + 1) % sorted.length];
    return next ? normalizeDegrees(next.longitude - item.longitude) : 360;
  });

  if (Math.min(...circularGaps) >= 48) return normalized;

  const anchor = (sorted[0]?.longitude ?? 0) + 36;
  const packed = new Map<number, number>();
  sorted.forEach((item, index) => {
    packed.set(item.index, normalizeDegrees(anchor + (360 / sorted.length) * index));
  });
  return normalized.map((_, index) => packed.get(index) ?? 0);
}

/**
 * 오늘의 실제 천체 위치에서 홈 만다라의 서버 렌더 모델을 만든다.
 * 계산은 이 함수에서 한 번만 하고, CSS와 R3F는 이 구조를 표현만 한다.
 */
export function buildMandalaModel(instant: Date): MandalaModel {
  const positions = MANDALA_FEATURES.map((feature) => planetPosition(feature.planetKey, instant));
  const presentationLongitudes = displayLongitudes(positions.map((position) => position.longitude));
  const nodes = MANDALA_FEATURES.map((feature, index) => {
    const position = positions[index];
    if (!position) throw new Error(`missing position for ${feature.planetKey}`);
    const sign = signOfLongitude(position.longitude);
    const orbitalPeriodDays = 360 / Math.max(Math.abs(position.speedPerDay), 0.025);

    return Object.freeze({
      ...feature,
      longitude: position.longitude,
      displayLongitude: presentationLongitudes[index] ?? position.longitude,
      latitude: position.latitude,
      speedPerDay: position.speedPerDay,
      retrograde: position.retrograde,
      orbitalPeriodDays,
      visualDurationSeconds: visualDurationSeconds(position.speedPerDay),
      sign: Object.freeze({ ko: sign.ko, en: sign.en, symbol: sign.symbol }),
      degreeInSign: position.longitude - sign.startDegree,
    });
  });

  const moonPhaseAngle = MoonPhase(instant);
  const moonIlluminationPercent = Math.round(Illumination(Body.Moon, instant).phase_fraction * 100);

  return Object.freeze({
    instantISO: instant.toISOString(),
    nodes: Object.freeze(nodes),
    sky: Object.freeze({
      moonPhaseAngle,
      moonIlluminationPercent,
      moonPhaseKey: moonPhaseKey(moonPhaseAngle),
    }),
  });
}

export function mandalaFeature(key: MandalaFeatureKey) {
  const feature = MANDALA_FEATURES.find((item) => item.key === key);
  if (!feature) throw new RangeError(`unknown mandala feature: ${key}`);
  return feature;
}
