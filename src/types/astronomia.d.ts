/**
 * astronomia 는 타입 선언을 제공하지 않는다.
 * 교차검증 테스트에서 실제로 쓰는 표면만 최소한으로 선언한다.
 */
declare module "astronomia/planetposition" {
  export class Planet {
    constructor(data: unknown);
  }
}

declare module "astronomia/elliptic" {
  import type { Planet } from "astronomia/planetposition";
  export function position(
    planet: Planet,
    earth: Planet,
    jde: number,
  ): { ra: number; dec: number; range: number };
}

declare module "astronomia/solar" {
  import type { Planet } from "astronomia/planetposition";
  export function apparentVSOP87(earth: Planet, jde: number): { lon: number; lat: number };
}

declare module "astronomia/moonposition" {
  export function position(jde: number): { lon: number; lat: number; range: number };
}

declare module "astronomia/pluto" {
  import type { Planet } from "astronomia/planetposition";
  export function astrometric(jde: number, earth: Planet): { ra: number; dec: number };
}

declare module "astronomia/julian" {
  export function DateToJDE(date: Date): number;
}

declare module "astronomia/nutation" {
  /** [Δψ, Δε] — 라디안 */
  export function nutation(jde: number): [number, number];
  export function meanObliquity(jde: number): number;
}

declare module "astronomia/coord" {
  export class Equatorial {
    constructor(ra: number, dec: number);
    toEcliptic(obliquity: number): { lon: number; lat: number };
  }
}

declare module "astronomia/data/vsop87Bearth" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Bmercury" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Bvenus" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Bmars" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Bjupiter" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Bsaturn" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Buranus" {
  const data: unknown;
  export default data;
}
declare module "astronomia/data/vsop87Bneptune" {
  const data: unknown;
  export default data;
}
