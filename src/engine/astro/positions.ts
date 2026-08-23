import {
  Body,
  GeoVector,
  MakeTime,
  RotateVector,
  Rotation_EQJ_ECT,
  SiderealTime,
  e_tilt,
  type AstroTime,
} from "astronomy-engine";
import { norm180, norm360, type PlanetKey } from "./constants";

/**
 * 천체 위치 — 지심 겉보기 황경(黃經), 진분점 of date 기준.
 *
 * 점성술이 쓰는 트로피컬 황도대는 "그 시점의 춘분점"을 0°로 삼는다. 그래서 J2000
 * 황도가 아니라 ECT(true ecliptic of date)로 변환해야 한다. 이 구분을 놓치면
 * 세차운동만큼(현재 약 24도) 통째로 어긋난다.
 *
 * 광행차(aberration)와 광행시간은 astronomy-engine 이 처리한다.
 */

const BODY_OF: Readonly<Record<PlanetKey, Body>> = Object.freeze({
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
});

const DEG = 180 / Math.PI;

export interface EclipticPoint {
  /** 황경 (도, 0~360) */
  readonly longitude: number;
  /** 황위 (도) */
  readonly latitude: number;
  /** 지구로부터의 거리 (AU) */
  readonly distanceAu: number;
}

/** 지심 겉보기 황도좌표 (진분점 of date). */
export function eclipticOfDate(key: PlanetKey, time: AstroTime): EclipticPoint {
  const eqj = GeoVector(BODY_OF[key], time, true);
  const ect = RotateVector(Rotation_EQJ_ECT(time), eqj);
  const xy = Math.hypot(ect.x, ect.y);
  return {
    longitude: norm360(Math.atan2(ect.y, ect.x) * DEG),
    latitude: Math.atan2(ect.z, xy) * DEG,
    distanceAu: Math.hypot(xy, ect.z),
  };
}

export interface PlanetPosition extends EclipticPoint {
  readonly key: PlanetKey;
  /** 하루당 황경 변화량 (도). 음수면 역행이다. */
  readonly speedPerDay: number;
  readonly retrograde: boolean;
}

const HALF_DAY_MS = 43_200_000;

/**
 * 황경과 함께 하루당 이동량을 낸다.
 *
 * 역행 여부는 전후 반나절의 중심차분으로 판정한다. 순간 속도를 직접 구하는 것보다
 * 수치적으로 안정적이고, 유(留, stationary) 근처에서도 부호가 튀지 않는다.
 */
export function planetPosition(key: PlanetKey, instant: Date): PlanetPosition {
  const time = MakeTime(instant);
  const here = eclipticOfDate(key, time);

  const before = eclipticOfDate(key, MakeTime(new Date(instant.getTime() - HALF_DAY_MS)));
  const after = eclipticOfDate(key, MakeTime(new Date(instant.getTime() + HALF_DAY_MS)));
  const speedPerDay = norm180(after.longitude - before.longitude);

  return Object.freeze({
    key,
    ...here,
    speedPerDay,
    retrograde: speedPerDay < 0,
  });
}

/** 그 시점의 진황도경사각 (도). 상승궁·중천 계산에 쓴다. */
export function trueObliquity(instant: Date): number {
  return e_tilt(MakeTime(instant)).tobl;
}

/**
 * 지방 항성시로부터 얻는 RAMC — 중천의 적경(도).
 * 그리니치 겉보기 항성시에 출생지 경도를 더한다.
 */
export function rightAscensionOfMidheaven(instant: Date, longitudeEast: number): number {
  const gastHours = SiderealTime(MakeTime(instant));
  return norm360(gastHours * 15 + longitudeEast);
}
