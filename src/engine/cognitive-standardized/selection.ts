import { itemInformation } from "./irt";
import type {
  Blueprint,
  DomainCounts,
  InternalItem,
  SelectionState,
  StandardizedDomain,
} from "./types";

const INFORMATION_TIE_EPSILON = 1e-10;
const RANDOMESQUE_POOL_SIZE = 5;

const DOMAINS: readonly StandardizedDomain[] = Object.freeze(["gf", "gc", "gv", "gwm", "gs"]);

function countForDomain(counts: DomainCounts | undefined, domain: StandardizedDomain): number {
  const count = counts?.[domain];
  return count === undefined || !Number.isFinite(count) || count < 0 ? 0 : count;
}

function hasMinimumDeficit(
  counts: DomainCounts | undefined,
  blueprint: Blueprint,
): boolean {
  return DOMAINS.some((domain) => countForDomain(counts, domain) < blueprint.minimumByDomain[domain]);
}

function domainIsEligible(
  domain: StandardizedDomain,
  counts: DomainCounts | undefined,
  blueprint: Blueprint,
  minimumDeficit: boolean,
): boolean {
  const count = countForDomain(counts, domain);
  if (count >= blueprint.maximumByDomain[domain]) return false;
  if (minimumDeficit && count >= blueprint.minimumByDomain[domain]) return false;
  return true;
}

function candidateItems(state: SelectionState): readonly InternalItem[] {
  const answered = new Set(state.answeredItemIds);
  const recent = new Set(state.recentItemIds);
  const minimumDeficit = hasMinimumDeficit(state.answeredDomainCounts, state.blueprint);

  return state.items.filter((item) => {
    if (answered.has(item.versionId) || recent.has(item.versionId)) return false;
    if (!domainIsEligible(item.domain, state.answeredDomainCounts, state.blueprint, minimumDeficit)) return false;
    if (!Number.isFinite(item.exposureRate) || item.exposureRate > state.blueprint.maxExposureRate) return false;
    return true;
  });
}

/**
 * 현재 theta에서 정보량이 높은 randomesque 후보 중 하나를 고른다.
 *
 * 영역 쿼터·최근 문항·노출률을 먼저 적용하고, 정보량 상위 randomesque 후보
 * 집합에서 서버 시드 기반 난수를 사용한다. 제약을 위반하는 임의 폴백은 하지 않는다.
 */
export function selectNextItem(state: SelectionState): InternalItem | null {
  if (!Number.isFinite(state.theta)) return null;

  const candidates = candidateItems(state);
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((candidate) => ({ candidate, information: itemInformation(state.theta, candidate.parameters) }))
    .sort((left, right) => {
      const informationDifference = right.information - left.information;
      return Math.abs(informationDifference) <= INFORMATION_TIE_EPSILON
        ? left.candidate.versionId.localeCompare(right.candidate.versionId)
        : informationDifference;
    });
  const randomesque = ranked
    .slice(0, RANDOMESQUE_POOL_SIZE)
    .map(({ candidate }) => candidate);
  const randomValue = Math.min(1 - Number.EPSILON, Math.max(0, state.random()));
  const selected = randomesque[Math.floor(randomValue * randomesque.length)];
  return selected ?? null;
}
