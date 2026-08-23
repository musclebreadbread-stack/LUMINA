import { norm360, signOfLongitude, type ZodiacSign } from "./constants";

/**
 * 하우스 체계.
 *
 * 지금은 온전히 검증 가능한 두 가지만 낸다.
 *  - whole (홀사인) : 상승궁이 든 별자리의 0도가 1하우스 시작. 전통 서양·헬레니즘 표준.
 *  - equal (이퀄)   : 상승궁 각도에서 정확히 30도씩.
 *
 * 플라시두스는 반호(semi-arc) 반복식으로 계산한다. 극권 안쪽처럼 해당 체계가
 * 정의되지 않는 위도에서는 이퀄 하우스로 안전하게 폴백하고 그 사실을 결과에 남긴다.
 */
export type HouseSystem = "whole" | "equal" | "placidus";

const DEG = Math.PI / 180;

export interface Angles {
  /** 상승궁(Ascendant) 황경 */
  readonly ascendant: number;
  /** 중천(Midheaven, MC) 황경 */
  readonly midheaven: number;
  /** 하강궁 — 상승궁의 반대편 */
  readonly descendant: number;
  /** 천저(IC) */
  readonly imumCoeli: number;
}

/**
 * 상승궁과 중천.
 *
 *   MC  = atan2(sin RAMC, cos RAMC · cos ε)
 *   ASC = atan2(cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε))
 *
 * 위도가 극권을 넘으면 상승궁이 정의되지 않는 시각이 생긴다. 그때는 tan φ 가 발산해
 * 결과가 무의미해지므로 호출부가 극지 여부를 함께 확인해야 한다.
 */
export function computeAngles(
  ramcDeg: number,
  obliquityDeg: number,
  latitudeDeg: number,
): Angles {
  const ramc = ramcDeg * DEG;
  const eps = obliquityDeg * DEG;
  const phi = latitudeDeg * DEG;

  const midheaven = norm360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / DEG);
  const ascendant = norm360(
    Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
    ) / DEG,
  );

  return Object.freeze({
    ascendant,
    midheaven,
    descendant: norm360(ascendant + 180),
    imumCoeli: norm360(midheaven + 180),
  });
}

/** 극권 안쪽에서는 상승궁이 정의되지 않는 시각이 있다. */
export function isPolarLatitude(latitudeDeg: number): boolean {
  return Math.abs(latitudeDeg) > 66.5;
}

export interface HouseCusp {
  /** 1~12 */
  readonly house: number;
  readonly longitude: number;
  readonly sign: ZodiacSign;
}

export interface Houses {
  readonly system: HouseSystem;
  readonly cusps: readonly HouseCusp[];
  readonly fallback: "equal" | null;
}

export interface PlacidusContext {
  readonly ramcDeg: number;
  readonly obliquityDeg: number;
  readonly latitudeDeg: number;
}

function sinDeg(value: number): number {
  return Math.sin(value * DEG);
}

function cosDeg(value: number): number {
  return Math.cos(value * DEG);
}

function tanDeg(value: number): number {
  return Math.tan(value * DEG);
}

function asinDeg(value: number): number {
  return Math.asin(Math.min(1, Math.max(-1, value))) / DEG;
}

function atanDeg(value: number): number {
  return Math.atan(value) / DEG;
}

/** Ecliptic projection helper used by the classic Placidus semi-arc method. */
function ascendantProjection(
  rectAscension: number,
  poleHeight: number,
  sineObliquity: number,
  cosineObliquity: number,
): number {
  const x = norm360(rectAscension);
  const quadrant = Math.floor(x / 90) + 1;
  const project = (angle: number, pole: number): number => {
    const denominator = -tanDeg(pole) * sineObliquity + cosineObliquity * cosDeg(angle);
    const numerator = sinDeg(angle);
    if (Math.abs(numerator) < 1e-12) return denominator < 0 ? -1e-10 : 1e-10;
    if (Math.abs(denominator) < 1e-12) return numerator < 0 ? -90 : 90;
    const value = atanDeg(numerator / denominator);
    return value < 0 ? 180 + value : value;
  };

  const result =
    quadrant === 1
      ? project(x, poleHeight)
      : quadrant === 2
        ? 180 - project(180 - x, -poleHeight)
        : quadrant === 3
          ? 180 + project(x - 180, -poleHeight)
          : 360 - project(360 - x, poleHeight);
  return norm360(result);
}

function placidusCusp(
  rectAscension: number,
  initialPoleHeight: number,
  divisor: number,
  tangentLatitude: number,
  sineObliquity: number,
  cosineObliquity: number,
): number {
  let cusp = ascendantProjection(rectAscension, initialPoleHeight, sineObliquity, cosineObliquity);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const tangent = tanDeg(asinDeg(sineObliquity * sinDeg(cusp)));
    if (Math.abs(tangent) < 1e-9) return norm360(rectAscension);
    const poleHeight = atanDeg(sinDeg(asinDeg(tangentLatitude * tangent) / divisor) / tangent);
    cusp = ascendantProjection(rectAscension, poleHeight, sineObliquity, cosineObliquity);
  }
  return cusp;
}

function computePlacidusCusps(angles: Angles, context: PlacidusContext): readonly number[] {
  const latitude = context.latitudeDeg;
  const obliquity = context.obliquityDeg;
  const sineObliquity = sinDeg(obliquity);
  const cosineObliquity = cosDeg(obliquity);
  const tangentLatitude = tanDeg(latitude);
  const tangentObliquity = tanDeg(obliquity);
  const semiArcAngle = asinDeg(tangentLatitude * tangentObliquity);
  const firstFractionPole = atanDeg(sinDeg(semiArcAngle / 3) / tangentObliquity);
  const secondFractionPole = atanDeg(sinDeg((semiArcAngle * 2) / 3) / tangentObliquity);

  const cusp11 = placidusCusp(
    context.ramcDeg + 30,
    firstFractionPole,
    3,
    tangentLatitude,
    sineObliquity,
    cosineObliquity,
  );
  const cusp12 = placidusCusp(
    context.ramcDeg + 60,
    secondFractionPole,
    1.5,
    tangentLatitude,
    sineObliquity,
    cosineObliquity,
  );
  const cusp2 = placidusCusp(
    context.ramcDeg + 120,
    secondFractionPole,
    1.5,
    tangentLatitude,
    sineObliquity,
    cosineObliquity,
  );
  const cusp3 = placidusCusp(
    context.ramcDeg + 150,
    firstFractionPole,
    3,
    tangentLatitude,
    sineObliquity,
    cosineObliquity,
  );

  return Object.freeze([
    angles.ascendant,
    cusp2,
    cusp3,
    norm360(angles.imumCoeli),
    norm360(cusp11 + 180),
    norm360(cusp12 + 180),
    norm360(angles.descendant),
    norm360(cusp2 + 180),
    norm360(cusp3 + 180),
    angles.midheaven,
    cusp11,
    cusp12,
  ]);
}

export function computeHouses(
  angles: Angles,
  system: HouseSystem,
  context?: PlacidusContext,
): Houses {
  if (system === "placidus" && context && Math.abs(context.latitudeDeg) < 90 - context.obliquityDeg) {
    const cusps = computePlacidusCusps(angles, context).map((longitude, index) =>
      Object.freeze({ house: index + 1, longitude: norm360(longitude), sign: signOfLongitude(longitude) }),
    );
    return Object.freeze({ system, cusps: Object.freeze(cusps), fallback: null });
  }

  const start =
    system === "whole"
      ? signOfLongitude(angles.ascendant).startDegree
      : angles.ascendant;

  const cusps = Array.from({ length: 12 }, (_, i) => {
    const longitude = norm360(start + i * 30);
    return Object.freeze({
      house: i + 1,
      longitude,
      sign: signOfLongitude(longitude),
    });
  });

  return Object.freeze({
    system,
    cusps: Object.freeze(cusps),
    fallback: system === "placidus" ? ("equal" as const) : null,
  });
}

/** 어떤 황경이 몇 번째 하우스에 드는지. */
export function houseOfLongitude(houses: Houses, longitude: number): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i += 1) {
    const from = houses.cusps[i]!.longitude;
    const to = houses.cusps[(i + 1) % 12]!.longitude;
    const span = norm360(to - from);
    const offset = norm360(lon - from);
    if (offset < span) return i + 1;
  }
  // 12개 구간이 원을 빈틈없이 덮으므로 도달할 수 없다.
  return 1;
}
