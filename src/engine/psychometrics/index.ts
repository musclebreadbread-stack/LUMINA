import type { EvidenceTier } from "@engine/shared/tier";
import { FACTOR_META, type FactorMeta } from "./meta";
import { computeFactorScores, type FactorScore, type ResponseMap } from "./scoring";
import type { NormContext } from "./norms";

export * from "./items";
export * from "./meta";
export * from "./reliability";
export * from "./norms";
export * from "./citations";
export * from "./explanations";
export * from "./scoring";
export * from "./jungian";
export * from "./jungianExplanations";

export interface BigFiveResult {
  readonly engine: "psychometrics";
  readonly tier: EvidenceTier;
  readonly version: 1;
  readonly itemCount: number;
  readonly factors: readonly (FactorScore & { readonly meta: FactorMeta })[];
}

/**
 * Big Five 산출. 이 플랫폼에서 유일하게 "scientific" 계층을 다는 엔진이다 —
 * IPIP-50은 공개 학술 척도이고, 계산과 해석을 분리하는 규율은 다른 엔진과 같다.
 */
export function computeBigFive(responses: ResponseMap, normContext?: NormContext): BigFiveResult {
  const factors = computeFactorScores(responses, normContext);

  return Object.freeze({
    engine: "psychometrics" as const,
    tier: "scientific" as EvidenceTier,
    version: 1 as const,
    itemCount: 50,
    factors: Object.freeze(
      factors.map((f) => Object.freeze({ ...f, meta: FACTOR_META[f.factor] })),
    ),
  });
}
