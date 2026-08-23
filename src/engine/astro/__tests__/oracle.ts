import { Planet } from "astronomia/planetposition";
import * as elliptic from "astronomia/elliptic";
import * as solar from "astronomia/solar";
import * as moonposition from "astronomia/moonposition";
import * as pluto from "astronomia/pluto";
import * as julian from "astronomia/julian";
import * as nutation from "astronomia/nutation";
import * as coord from "astronomia/coord";
import earthData from "astronomia/data/vsop87Bearth";
import mercuryData from "astronomia/data/vsop87Bmercury";
import venusData from "astronomia/data/vsop87Bvenus";
import marsData from "astronomia/data/vsop87Bmars";
import jupiterData from "astronomia/data/vsop87Bjupiter";
import saturnData from "astronomia/data/vsop87Bsaturn";
import uranusData from "astronomia/data/vsop87Buranus";
import neptuneData from "astronomia/data/vsop87Bneptune";
import type { PlanetKey } from "@engine/astro/constants";

/**
 * 교차검증 오라클 — astronomia (Meeus "Astronomical Algorithms" / VSOP87 포트).
 *
 * 우리 엔진은 astronomy-engine(자체 수치적분·해석 모델)을 쓴다. 두 라이브러리는
 * 알고리즘 계보가 완전히 달라서, 둘의 일치는 자기참조가 아니라 실질적인 검증이다.
 *
 * 여기서 내는 값은 모두 "지심 겉보기 황경, 진분점 of date" — 트로피컬 황도대의 기준이다.
 */

const DEG = 180 / Math.PI;
const earth = new Planet(earthData);

const VSOP: Partial<Record<PlanetKey, Planet>> = {
  mercury: new Planet(mercuryData),
  venus: new Planet(venusData),
  mars: new Planet(marsData),
  jupiter: new Planet(jupiterData),
  saturn: new Planet(saturnData),
  uranus: new Planet(uranusData),
  neptune: new Planet(neptuneData),
};

function toEclipticLongitude(ra: number, dec: number, trueObliquity: number): number {
  return new coord.Equatorial(ra, dec).toEcliptic(trueObliquity).lon;
}

const J2000_JDE = 2451545.0;

/**
 * J2000 이후의 황경 일반세차량 (도).
 *
 *   p_A = 5029.0966″·T + 1.11113″·T² − 0.000006″·T³   (T = J2000 이후 율리우스 세기)
 *
 * astronomia 의 pluto.astrometric 은 J2000 분점 기준값을 낸다. 트로피컬 황도대는
 * 그 시점의 춘분점을 0도로 삼으므로, 비교하려면 이만큼을 더해 of-date 로 옮겨야 한다.
 * 이 관계가 실제로 성립한다는 것은 crossValidation 테스트가 따로 확인한다.
 */
function generalPrecessionInLongitude(jde: number): number {
  const T = (jde - J2000_JDE) / 36525;
  return (5029.0966 * T + 1.11113 * T * T - 0.000006 * T * T * T) / 3600;
}

/** 지심 겉보기 황경 (도, 0~360). */
export function oracleLongitude(key: PlanetKey, instant: Date): number {
  const jde = julian.DateToJDE(instant);
  const [deltaPsi, deltaEps] = nutation.nutation(jde);
  const trueObliquity = nutation.meanObliquity(jde) + deltaEps;

  let radians: number;
  if (key === "sun") {
    radians = solar.apparentVSOP87(earth, jde).lon;
  } else if (key === "moon") {
    // Meeus 47장은 평균분점 기준이라 장동(章動)을 더해야 겉보기 값이 된다.
    radians = moonposition.position(jde).lon + deltaPsi;
  } else if (key === "pluto") {
    // J2000 기준값이므로 세차량을 더해 of-date 로 옮긴다.
    const p = pluto.astrometric(jde, earth);
    const j2000Longitude = toEclipticLongitude(p.ra, p.dec, trueObliquity) * DEG;
    return ((j2000Longitude + generalPrecessionInLongitude(jde)) % 360 + 360) % 360;
  } else {
    const planet = VSOP[key];
    if (!planet) throw new Error(`oracle has no model for ${key}`);
    const p = elliptic.position(planet, earth, jde);
    radians = toEclipticLongitude(p.ra, p.dec, trueObliquity);
  }

  return ((radians * DEG) % 360 + 360) % 360;
}

/** 두 각도의 차이를 (-180, 180] 로 정규화한 절댓값 (도). */
export function angularDelta(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}
