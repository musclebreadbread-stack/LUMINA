/**
 * 3계층 신뢰도 프레임워크 (LUMINA의 핵심 철학).
 *
 * 모든 엔진 산출물은 반드시 하나의 계층으로 태깅되며, UI는 이 값을 근거로
 * 신뢰도 뱃지와 고지문을 렌더링한다. 계층을 산술적으로 합성하지 않는다 —
 * 인식론적으로 다른 체계이므로 "다른 렌즈로 본 나"로 병렬 표기한다.
 */
export type EvidenceTier = "scientific" | "cultural" | "entertainment";

export interface TierMeta {
  readonly tier: EvidenceTier;
  /** 뱃지에 노출할 짧은 라벨 키 (i18n 키) */
  readonly labelKey: string;
  /** 결과 하단에 자동 삽입되는 고지문 i18n 키. scientific 계층은 null. */
  readonly disclaimerKey: string | null;
}

export const TIER_META: Readonly<Record<EvidenceTier, TierMeta>> = Object.freeze({
  scientific: Object.freeze({
    tier: "scientific",
    labelKey: "tier.scientific.label",
    disclaimerKey: "tier.scientific.disclaimer",
  }),
  cultural: Object.freeze({
    tier: "cultural",
    labelKey: "tier.cultural.label",
    disclaimerKey: "tier.cultural.disclaimer",
  }),
  entertainment: Object.freeze({
    tier: "entertainment",
    labelKey: "tier.entertainment.label",
    disclaimerKey: "tier.entertainment.disclaimer",
  }),
});

/** 계층 2·3 결과에는 반드시 고지문이 붙어야 한다. */
export function requiresDisclaimer(_tier: EvidenceTier): boolean {
  return _tier === "scientific" || _tier === "cultural" || _tier === "entertainment";
}
