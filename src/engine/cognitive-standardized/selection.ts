import { itemInformation } from "./irt";
import type {
  Blueprint,
  DomainCounts,
  InternalItem,
  SelectionState,
  StandardizedDomain,
} from "./types";

const INFORMATION_TIE_EPSILON = 1e-10;

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
 * 현재 theta에서 정보량이 가장 큰 문항을 고른다.
 *
 * 영역 쿼터·최근 문항·노출률을 먼저 적용하고, 최고 정보량 동률 집합에서만
 * 서버 시드 기반 난수를 사용한다. 제약을 위반하는 임의 폴백은 하지 않는다.
 */
export function selectNextItem(state: SelectionState): InternalItem | null {
  if (!Number.isFinite(state.theta)) return null;

  const candidates = candidateItems(state);
  if (candidates.length === 0) return null;

  let maximumInformation = -Infinity;
  const best: InternalItem[] = [];

  for (const candidate of candidates) {
    const information = itemInformation(state.theta, candidate.parameters);
    if (information > maximumInformation + INFORMATION_TIE_EPSILON) {
      maximumInformation = information;
      best.length = 0;
      best.push(candidate);
    } else if (Math.abs(information - maximumInformation) <= INFORMATION_TIE_EPSILON) {
      best.push(candidate);
    }
  }

  best.sort((left, right) => left.versionId.localeCompare(right.versionId));
  const randomValue = Math.min(1 - Number.EPSILON, Math.max(0, state.random()));
  const selected = best[Math.floor(randomValue * best.length)];
  return selected ?? null;
}
