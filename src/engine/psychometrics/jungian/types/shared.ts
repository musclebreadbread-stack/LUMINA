import type { ExplanationBlock, LocalizedText } from "@engine/shared/explanation";
import { freezeExplanationBlock } from "@engine/shared/explanation";
import { MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019 } from "../../citations";

export const BASE_TYPE_CODES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ",
] as const;

export type BaseTypeCode = (typeof BASE_TYPE_CODES)[number];

/** AT axis pole first (A/T), then VW axis pole (V/W) — matches jungian.ts's "XXXX-YZ" code order. */
export const MODIFIER_CODES = ["AV", "AW", "TV", "TW"] as const;

export type ModifierCode = (typeof MODIFIER_CODES)[number];

const MINIMUM_FIELD_LENGTH = 100;
const KEYWORD_COUNT = 3;
const GROWTH_PROMPT_COUNT = 3;

/**
 * 64유형 결과의 유형별 콘텐츠. summary는 기존 16유형 서술을 대체하고,
 * strengths/relationships/work/growth는 이번 64유형 전환에서 새로 추가한 섹션이다.
 * 진단·직업 추천이 아니라 관찰형 서술과 자기실험 질문으로 채운다.
 */
export interface TypeVariantProfile {
  readonly nickname: LocalizedText;
  /** 정확히 3개. */
  readonly keywords: readonly LocalizedText[];
  readonly summary: LocalizedText;
  readonly strengths: LocalizedText;
  readonly relationships: LocalizedText;
  readonly work: LocalizedText;
  /** 자기실험 질문 정확히 3개. 직업·행동을 단정하지 않는다. */
  readonly growth: readonly LocalizedText[];
}

export type BaseTypeVariants = Readonly<Record<ModifierCode, TypeVariantProfile>>;

export function fullTypeCode(base: BaseTypeCode, modifier: ModifierCode): string {
  return `${base}-${modifier}`;
}

function assertLocalizedField(code: string, field: string, text: LocalizedText, minimumLength: number): void {
  if (text.ko.trim().length < minimumLength || text.en.trim().length < minimumLength) {
    throw new Error(`type variant ${code} field "${field}" must be at least ${minimumLength} characters in both languages`);
  }
}

function assertVariant(code: string, variant: TypeVariantProfile): void {
  assertLocalizedField(code, "nickname", variant.nickname, 1);
  if (variant.keywords.length !== KEYWORD_COUNT) {
    throw new Error(`type variant ${code} must have exactly ${KEYWORD_COUNT} keywords, got ${variant.keywords.length}`);
  }
  variant.keywords.forEach((keyword, index) => assertLocalizedField(code, `keywords[${index}]`, keyword, 1));
  assertLocalizedField(code, "summary", variant.summary, MINIMUM_FIELD_LENGTH);
  assertLocalizedField(code, "strengths", variant.strengths, MINIMUM_FIELD_LENGTH);
  assertLocalizedField(code, "relationships", variant.relationships, MINIMUM_FIELD_LENGTH);
  assertLocalizedField(code, "work", variant.work, MINIMUM_FIELD_LENGTH);
  if (variant.growth.length !== GROWTH_PROMPT_COUNT) {
    throw new Error(`type variant ${code} must have exactly ${GROWTH_PROMPT_COUNT} growth prompts, got ${variant.growth.length}`);
  }
  variant.growth.forEach((prompt, index) => assertLocalizedField(code, `growth[${index}]`, prompt, 1));
}

function freezeVariant(code: string, variant: TypeVariantProfile): TypeVariantProfile {
  assertVariant(code, variant);
  return Object.freeze({
    nickname: Object.freeze({ ...variant.nickname }),
    keywords: Object.freeze(variant.keywords.map((keyword) => Object.freeze({ ...keyword }))),
    summary: Object.freeze({ ...variant.summary }),
    strengths: Object.freeze({ ...variant.strengths }),
    relationships: Object.freeze({ ...variant.relationships }),
    work: Object.freeze({ ...variant.work }),
    growth: Object.freeze(variant.growth.map((prompt) => Object.freeze({ ...prompt }))),
  });
}

/** 기본 유형 1개(16개 중 하나)의 4가지 변형을 검증하고 동결한다. */
export function freezeBaseTypeVariants(
  base: BaseTypeCode,
  variants: Record<ModifierCode, TypeVariantProfile>,
): BaseTypeVariants {
  return Object.freeze(
    Object.fromEntries(
      MODIFIER_CODES.map((modifier) => [modifier, freezeVariant(fullTypeCode(base, modifier), variants[modifier])]),
    ),
  ) as BaseTypeVariants;
}

/**
 * 결과 페이지의 "유형 요약" 섹션이 쓰는 ExplanationBlock — 다른 모든 LUMINA 분석과 같은
 * 근거·인용 계약을 유지한다. strengths/relationships/work/growth는 인용이 딸린 개별 근거를
 * 갖지 않으므로 이 블록을 통해서만 출처를 표시한다.
 */
export function typeVariantExplanationBlock(code: string, variant: TypeVariantProfile): ExplanationBlock {
  return freezeExplanationBlock({
    id: `jungian-type-${code.toLowerCase()}`,
    summary: Object.freeze({
      ko: `${code} — ${variant.nickname.ko}`,
      en: `${code} — ${variant.nickname.en}`,
    }),
    detail: Object.freeze({
      ko: `${variant.summary.ko} 이 문장은 판정이 아니라 현재 응답을 관찰하기 위한 출발점입니다.`,
      en: `${variant.summary.en} Read this as a prompt for observing the current response pattern, not as a verdict.`,
    }),
    method: Object.freeze({
      ko: "이 MBTI 참고 코드는 여섯 개의 연속 점수를 읽기 쉽게 압축한 요약입니다. 경계값에 가까운 축은 ?로 표시되며, 글자 조합이 서로 다른 사람을 질적으로 나누거나 행동·진로를 예언한다는 뜻은 아닙니다.",
      en: "This MBTI-style code compresses six continuous scores for readability. Axes near their midpoint appear as ?, and the combination does not divide people into qualitatively distinct groups or predict behavior or careers.",
    }),
    evidenceRefs: Object.freeze([`jungian-type:${code}`, "jungian-six-axis-continuous"]),
    citations: Object.freeze([MCCRAE_COSTA_1989, PITTENGER_1993, STEIN_SWAN_2019]),
    tier: "scientific",
  });
}
