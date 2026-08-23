import { findSign, signsOf, type HoroscopeSign, type HoroscopeSystem } from "./constants";
import { referenceInstantAtUtcNoon } from "./sky";

export interface HoroscopeReference {
  readonly system: HoroscopeSystem;
  readonly sign: HoroscopeSign;
  readonly signIndex: number;
  readonly date: string;
  readonly instant: Date;
  readonly basis: "sign" | "natal";
  readonly precision: "whole-sign" | "degree";
}

export interface HoroscopeReferenceOptions {
  readonly personalized?: boolean;
}

export function createHoroscopeReference(
  system: HoroscopeSystem,
  signKey: string,
  date: string,
  options: HoroscopeReferenceOptions = {},
): HoroscopeReference {
  const sign = findSign(system, signKey);
  if (!sign) throw new RangeError(`unknown ${system} sign: ${signKey}`);

  const signIndex = signsOf(system).findIndex((candidate) => candidate.key === sign.key);
  if (signIndex < 0) throw new RangeError(`missing ${system} sign index: ${signKey}`);

  return Object.freeze({
    system,
    sign,
    signIndex,
    date,
    instant: referenceInstantAtUtcNoon(date),
    basis: options.personalized ? ("natal" as const) : ("sign" as const),
    precision: options.personalized ? ("degree" as const) : ("whole-sign" as const),
  });
}
