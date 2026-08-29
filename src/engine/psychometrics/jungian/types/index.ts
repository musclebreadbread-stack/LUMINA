import { ISTJ_VARIANTS } from "./istj";
import { ISFJ_VARIANTS } from "./isfj";
import { INFJ_VARIANTS } from "./infj";
import { INTJ_VARIANTS } from "./intj";
import { ISTP_VARIANTS } from "./istp";
import { ISFP_VARIANTS } from "./isfp";
import { INFP_VARIANTS } from "./infp";
import { INTP_VARIANTS } from "./intp";
import { ESTP_VARIANTS } from "./estp";
import { ESFP_VARIANTS } from "./esfp";
import { ENFP_VARIANTS } from "./enfp";
import { ENTP_VARIANTS } from "./entp";
import { ESTJ_VARIANTS } from "./estj";
import { ESFJ_VARIANTS } from "./esfj";
import { ENFJ_VARIANTS } from "./enfj";
import { ENTJ_VARIANTS } from "./entj";
import {
  BASE_TYPE_CODES,
  MODIFIER_CODES,
  fullTypeCode,
  type BaseTypeCode,
  type BaseTypeVariants,
  type TypeVariantProfile,
} from "./shared";

export {
  BASE_TYPE_CODES,
  MODIFIER_CODES,
  fullTypeCode,
  typeVariantExplanationBlock,
  type BaseTypeCode,
  type BaseTypeVariants,
  type ModifierCode,
  type TypeVariantProfile,
} from "./shared";

const BASE_TYPE_VARIANTS: Readonly<Record<BaseTypeCode, BaseTypeVariants>> = Object.freeze({
  ISTJ: ISTJ_VARIANTS,
  ISFJ: ISFJ_VARIANTS,
  INFJ: INFJ_VARIANTS,
  INTJ: INTJ_VARIANTS,
  ISTP: ISTP_VARIANTS,
  ISFP: ISFP_VARIANTS,
  INFP: INFP_VARIANTS,
  INTP: INTP_VARIANTS,
  ESTP: ESTP_VARIANTS,
  ESFP: ESFP_VARIANTS,
  ENFP: ENFP_VARIANTS,
  ENTP: ENTP_VARIANTS,
  ESTJ: ESTJ_VARIANTS,
  ESFJ: ESFJ_VARIANTS,
  ENFJ: ENFJ_VARIANTS,
  ENTJ: ENTJ_VARIANTS,
});

/** All 64 "BASE-MODIFIER" codes, e.g. "INFP-AV". Order matches BASE_TYPE_CODES x MODIFIER_CODES. */
export const ALL_TYPE_CODES: readonly string[] = Object.freeze(
  BASE_TYPE_CODES.flatMap((base) => MODIFIER_CODES.map((modifier) => fullTypeCode(base, modifier))),
);

export const ALL_TYPE_VARIANTS: Readonly<Record<string, TypeVariantProfile>> = Object.freeze(
  Object.fromEntries(
    BASE_TYPE_CODES.flatMap((base) =>
      MODIFIER_CODES.map((modifier) => [fullTypeCode(base, modifier), BASE_TYPE_VARIANTS[base][modifier]] as const),
    ),
  ),
);

/** 64-code lookup ("INFP-AV"). Returns null for an incomplete code (containing "?") or an unknown code. */
export function typeVariantProfile(code: string): TypeVariantProfile | null {
  return ALL_TYPE_VARIANTS[code] ?? null;
}
