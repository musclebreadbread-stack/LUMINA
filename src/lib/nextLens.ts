import type { AnalysisDefinition, AnalysisKey } from "@engine/shared/evidence";
import { ANALYSIS_CATALOG } from "./analysisCatalog";
import { groupAnalyses, type AnalysisGroup, type AnalysisGroupKey } from "./analysisGroups";

/**
 * 결과 화면에서 다음으로 권할 분석을 고른다.
 *
 * 목록을 손으로 적지 않는다 — 카탈로그와 홈 허브의 묶음(analysisGroups)에서 그대로
 * 파생하므로, 분석이 하나 늘면 추천도 같이 는다. 링크를 잔뜩 늘어놓는 대신 두 갈래만
 * 남기는 것이 이 모듈의 요지다.
 *
 * 1) sibling — 같은 묶음(같은 계층·목적)의 다른 분석. 같은 종류의 앎을 한 겹 더 쌓는다.
 * 2) crossing — 현재 묶음 다음 순서의 묶음부터 한 바퀴 돌며 만나는 다른 종류의 앎.
 *
 * 묶음 순서를 현재 위치에서 회전시키는 이유: 성격 검사에서 늘 사주로만 건너뛰는 대신
 * 묶음 목록의 바로 다음 칸으로 한 걸음씩 밖으로 나가게 하기 위해서다.
 */

export type LensRelation = "sibling" | "crossing";

export interface LensCandidate {
  readonly key: AnalysisKey;
  readonly href: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly groupKey: AnalysisGroupKey;
  readonly groupTitleKey: string;
  readonly relation: LensRelation;
}

function toCandidate(
  group: AnalysisGroup,
  definition: AnalysisDefinition,
  relation: LensRelation,
): LensCandidate {
  return Object.freeze({
    key: definition.key,
    href: definition.href,
    titleKey: definition.titleKey,
    descKey: definition.descKey,
    groupKey: group.key,
    groupTitleKey: group.titleKey,
    relation,
  });
}

/**
 * 현재 분석에서 이어 볼 수 있는 후보를 우선순위 순서로 돌려준다.
 * 앞쪽이 sibling, 뒤쪽이 crossing 이며 현재 분석 자신은 빠진다.
 */
export function nextLensCandidates(
  current: AnalysisKey,
  catalog: readonly AnalysisDefinition[] = ANALYSIS_CATALOG,
): readonly LensCandidate[] {
  const groups = groupAnalyses(catalog);
  const homeIndex = groups.findIndex((group) =>
    group.analyses.some((analysis) => analysis.key === current),
  );
  const home = homeIndex < 0 ? undefined : groups[homeIndex];
  if (!home) throw new RangeError(`analysis is not in the catalog: ${current}`);

  const siblings = home.analyses
    .filter((analysis) => analysis.key !== current)
    .map((analysis) => toCandidate(home, analysis, "sibling"));

  const crossings = groups
    .map((_, offset) => groups[(homeIndex + offset + 1) % groups.length])
    .filter((group): group is AnalysisGroup => group !== undefined && group.key !== home.key)
    .flatMap((group) => group.analyses.map((analysis) => toCandidate(group, analysis, "crossing")));

  return Object.freeze([...siblings, ...crossings]);
}

/**
 * 후보 목록에서 실제로 보여 줄 한둘을 고른다.
 *
 * 아직 열어 보지 않은 분석을 먼저 집지만, 전부 열어 본 사람에게 빈 자리를 보이는 대신
 * 같은 갈래의 첫 후보로 물러선다 — 탐색 기록이 없는 서버 렌더에서도 같은 이유로
 * 늘 같은 두 장이 나온다.
 *
 * 지역화된 화면용 객체를 그대로 넣을 수 있도록 후보 형태에 대해 제네릭이다.
 */
export function pickNextLenses<
  TCandidate extends { readonly key: AnalysisKey; readonly relation: LensRelation },
>(candidates: readonly TCandidate[], explored: ReadonlySet<AnalysisKey>): readonly TCandidate[] {
  const pick = (relation: LensRelation): TCandidate | undefined =>
    candidates.find((candidate) => candidate.relation === relation && !explored.has(candidate.key)) ??
    candidates.find((candidate) => candidate.relation === relation);

  return Object.freeze(
    [pick("sibling"), pick("crossing")].filter(
      (candidate): candidate is TCandidate => candidate !== undefined,
    ),
  );
}
