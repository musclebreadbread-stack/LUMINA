import type { AnalysisDefinition } from "@engine/shared/evidence";
import type { EvidenceTier } from "@engine/shared/tier";
import { ANALYSIS_CATALOG } from "./analysisCatalog";

/**
 * 홈 허브의 묶음 정의.
 *
 * 키를 손으로 나열하지 않고 카탈로그의 (tier, purpose) 조합으로만 가른다 —
 * 분석이 하나 늘 때 이 파일을 고치지 않아도 제자리를 찾아야 하고, 반대로
 * 제자리가 없는 분석은 조용히 사라지는 대신 groupAnalyses 가 즉시 실패해야 한다.
 *
 * 과학 계층 묶음을 앞에 두는 순서 자체가 "이 플랫폼이 무엇 위에 서 있는가"에 대한
 * 정직한 신호다. 카드 위의 계층·검증 상태 뱃지와 같은 목적으로 존재한다.
 */

export type AnalysisGroupKey = "assessment" | "ability" | "tradition" | "today";

type AnalysisPurpose = AnalysisDefinition["purpose"];

export interface AnalysisGroupDefinition {
  readonly key: AnalysisGroupKey;
  readonly tier: EvidenceTier;
  readonly purpose: AnalysisPurpose;
  readonly titleKey: string;
  readonly descKey: string;
}

export interface AnalysisGroup extends AnalysisGroupDefinition {
  readonly analyses: readonly AnalysisDefinition[];
}

export const ANALYSIS_GROUPS: readonly AnalysisGroupDefinition[] = Object.freeze([
  Object.freeze({
    key: "assessment" as const,
    tier: "scientific" as const,
    purpose: "personality" as const,
    titleKey: "groupAssessmentTitle",
    descKey: "groupAssessmentDesc",
  }),
  Object.freeze({
    key: "ability" as const,
    tier: "scientific" as const,
    purpose: "ability" as const,
    titleKey: "groupAbilityTitle",
    descKey: "groupAbilityDesc",
  }),
  Object.freeze({
    key: "tradition" as const,
    tier: "cultural" as const,
    purpose: "traditional" as const,
    titleKey: "groupTraditionTitle",
    descKey: "groupTraditionDesc",
  }),
  Object.freeze({
    key: "today" as const,
    tier: "cultural" as const,
    purpose: "daily" as const,
    titleKey: "groupTodayTitle",
    descKey: "groupTodayDesc",
  }),
]);

function groupDefinitionFor(definition: AnalysisDefinition): AnalysisGroupDefinition | undefined {
  return ANALYSIS_GROUPS.find(
    (group) => group.tier === definition.tier && group.purpose === definition.purpose,
  );
}

/**
 * 카탈로그를 묶음 순서대로 분할한다. 반환 순서는 ANALYSIS_GROUPS 순서로 고정이고,
 * 각 분석은 정확히 한 묶음에만 들어간다. 비어 있는 묶음도 그대로 돌려주므로
 * 화면에서 제목만 남는 일이 없도록 호출부가 걸러 낸다.
 */
export function groupAnalyses(
  catalog: readonly AnalysisDefinition[] = ANALYSIS_CATALOG,
): readonly AnalysisGroup[] {
  const buckets = new Map<AnalysisGroupKey, AnalysisDefinition[]>(
    ANALYSIS_GROUPS.map((group) => [group.key, []]),
  );
  const homeless: string[] = [];

  for (const definition of catalog) {
    const group = groupDefinitionFor(definition);
    const bucket = group ? buckets.get(group.key) : undefined;
    if (!bucket) {
      homeless.push(definition.key);
      continue;
    }
    bucket.push(definition);
  }

  if (homeless.length > 0) {
    throw new RangeError(`analysis without a home group: ${homeless.join(", ")}`);
  }

  return Object.freeze(
    ANALYSIS_GROUPS.map((group) =>
      Object.freeze({ ...group, analyses: Object.freeze([...(buckets.get(group.key) ?? [])]) }),
    ),
  );
}
