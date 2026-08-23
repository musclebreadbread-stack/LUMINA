import type { EvidenceTier } from "@engine/shared/tier";
import { meaningOf, type NumberMeaning } from "./constants";
import { computeDestinyNumber, type DestinyResult } from "./destiny";
import { computeLifePathNumber, type LifePathDate, type LifePathResult } from "./lifePath";

export * from "./constants";
export * from "./destiny";
export * from "./lifePath";
export * from "./reduce";
export * from "./citations";
export * from "./explanations";

export interface NumerologyInput {
  readonly date: LifePathDate;
  /** 로마자 이름. 생략하면 운명수를 내지 않는다. */
  readonly name?: string;
}

export interface NumerologyResult {
  readonly engine: "numerology";
  readonly tier: EvidenceTier;
  readonly version: 1;

  readonly date: LifePathDate;
  readonly name: string | null;

  readonly lifePath: LifePathResult & { readonly meaning: NumberMeaning };
  readonly destiny: (DestinyResult & { readonly meaning: NumberMeaning }) | null;
}

/**
 * 수비학 산출. 사주·점성술과 같은 규율 — 계산과 해석을 분리하고, 결과는
 * 결정론적이며 동결된 순수 데이터다. 외부 오라클로 대조할 물리량이 아니므로
 * (천문 계산이 아니라 산술 규칙 자체가 정의다) 품질 게이트는 규칙의 정확성과
 * 경계값 테스트로 대신한다.
 */
export function computeNumerology(input: NumerologyInput): NumerologyResult {
  const lifePath = computeLifePathNumber(input.date);
  const destiny = input.name ? computeDestinyNumber(input.name) : null;

  return Object.freeze({
    engine: "numerology" as const,
    tier: "cultural" as EvidenceTier,
    version: 1 as const,

    date: Object.freeze({ ...input.date }),
    name: input.name?.trim() || null,

    lifePath: Object.freeze({ ...lifePath, meaning: meaningOf(lifePath.value) }),
    destiny: destiny ? Object.freeze({ ...destiny, meaning: meaningOf(destiny.value) }) : null,
  });
}
