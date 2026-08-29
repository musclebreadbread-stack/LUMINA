/**
 * 공개 경로 호환용 barrel. 실제 콘텐츠는 ./jungian/axisCopy.ts(6축 12극 해설)와
 * ./jungian/types/*(64유형 콘텐츠, 기본 유형별 1파일)에 있다 — 파일당 800행 제한과
 * 리뷰 가능성을 위해 분해했다. 기존 `@engine/psychometrics/jungianExplanations` 경로를
 * import하는 코드는 이 파일을 그대로 계속 쓸 수 있다.
 */
export {
  JUNGIAN_AXIS_EXPLANATIONS,
  JUNGIAN_AXIS_EXPLANATION_BY_KEY,
  axisExplanation,
  type AxisPoleExplanation,
} from "./jungian/axisCopy";

import { typeVariantExplanationBlock, typeVariantProfile, ALL_TYPE_CODES } from "./jungian/types";
import type { ExplanationBlock } from "@engine/shared/explanation";
import type { TypeVariantProfile } from "./jungian/types";

export type { TypeVariantProfile } from "./jungian/types";
export { BASE_TYPE_CODES, MODIFIER_CODES, fullTypeCode, type BaseTypeCode, type ModifierCode } from "./jungian/types";

/** 완성된 6글자 축 조합("INFP-AV")에 대한 유형 콘텐츠. 경계 코드(?)에는 null. */
export function mbtiTypeProfile(code: string): TypeVariantProfile | null {
  return typeVariantProfile(code);
}

/** 64개 전체 코드("BASE-MODIFIER" 형식). */
export const JUNGIAN_TYPE_CODES: readonly string[] = ALL_TYPE_CODES;

/** mbtiTypeProfile이 실제로 콘텐츠를 갖고 있는 코드 목록 — 정의상 JUNGIAN_TYPE_CODES와 같다. */
export const JUNGIAN_TYPE_PROFILE_CODES: readonly string[] = ALL_TYPE_CODES;

export function typeExplanation(code: string): ExplanationBlock | null {
  const variant = typeVariantProfile(code);
  if (!variant) return null;
  return typeVariantExplanationBlock(code, variant);
}
