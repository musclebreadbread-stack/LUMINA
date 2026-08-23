import { freezeExplanationBlock, type ExplanationBlock } from "@engine/shared/explanation";
import { SAJU_TRADITION_CITATIONS } from "./citations";
import { ELEMENT_ORDER, branchAt, stemAt, type FiveElement } from "./constants";
import type { FourPillars } from "./pillars";

/**
 * 사주 희소성은 인구 빈도가 아니라, 60갑자 기둥을 동일하게 놓았을 때의
 * '드러난 천간·지지 오행 서명' 빈도다. 실제 출생 분포나 길흉 확률로 읽지 않는다.
 */
export interface SajuRarity {
  readonly pillarCount: 3 | 4;
  readonly signature: Readonly<Record<FiveElement, number>>;
  readonly matchingCombinations: number;
  readonly sampleSpace: number;
  readonly probability: number;
  readonly distinctiveness: "common" | "uncommon" | "distinctive";
}

type Counts = [number, number, number, number, number];

const ELEMENT_INDEX: Readonly<Record<FiveElement, number>> = Object.freeze({
  wood: 0,
  fire: 1,
  earth: 2,
  metal: 3,
  water: 4,
});

const PILLAR_SIGNATURES: readonly Counts[] = Object.freeze(
  Array.from({ length: 60 }, (_, index) => {
    const stem = stemAt(index % 10).element;
    const branch = branchAt(index % 12).element;
    const counts: Counts = [0, 0, 0, 0, 0];
    const stemIndex = ELEMENT_INDEX[stem];
    const branchIndex = ELEMENT_INDEX[branch];
    counts[stemIndex] = (counts[stemIndex] ?? 0) + 1;
    counts[branchIndex] = (counts[branchIndex] ?? 0) + 1;
    return Object.freeze(counts) as Counts;
  }),
);

const DISTRIBUTION_CACHE = new Map<number, ReadonlyMap<string, number>>();

function signatureKey(counts: readonly number[]): string {
  return counts.join(",");
}

function distributionFor(pillarCount: 3 | 4): ReadonlyMap<string, number> {
  const cached = DISTRIBUTION_CACHE.get(pillarCount);
  if (cached) return cached;

  let states = new Map<string, number>([["0,0,0,0,0", 1]]);
  for (let depth = 0; depth < pillarCount; depth += 1) {
    const next = new Map<string, number>();
    for (const [key, count] of states) {
      const base = key.split(",").map(Number);
      for (const addition of PILLAR_SIGNATURES) {
        const merged = base.map((value, index) => value + (addition[index] ?? 0));
        const mergedKey = signatureKey(merged);
        next.set(mergedKey, (next.get(mergedKey) ?? 0) + count);
      }
    }
    states = next;
  }
  const frozen = new Map(states);
  DISTRIBUTION_CACHE.set(pillarCount, frozen);
  return frozen;
}

function visibleSignature(pillars: FourPillars): Counts {
  const counts: Counts = [0, 0, 0, 0, 0];
  const list = pillars.hour ? [pillars.year, pillars.month, pillars.day, pillars.hour] : [pillars.year, pillars.month, pillars.day];
  for (const pillar of list) {
    const stemIndex = ELEMENT_INDEX[stemAt(pillar.stem).element];
    const branchIndex = ELEMENT_INDEX[branchAt(pillar.branch).element];
    counts[stemIndex] = (counts[stemIndex] ?? 0) + 1;
    counts[branchIndex] = (counts[branchIndex] ?? 0) + 1;
  }
  return counts;
}

export function computeSajuRarity(pillars: FourPillars): SajuRarity {
  const pillarCount: 3 | 4 = pillars.hour ? 4 : 3;
  const counts = visibleSignature(pillars);
  const matchingCombinations = distributionFor(pillarCount).get(signatureKey(counts)) ?? 0;
  const sampleSpace = 60 ** pillarCount;
  const probability = matchingCombinations / sampleSpace;
  const distinctiveness =
    probability < 0.01 ? "distinctive" : probability < 0.05 ? "uncommon" : "common";

  return Object.freeze({
    pillarCount,
    signature: Object.freeze(
      Object.fromEntries(ELEMENT_ORDER.map((element, index) => [element, counts[index] ?? 0])) as Record<FiveElement, number>,
    ),
    matchingCombinations,
    sampleSpace,
    probability,
    distinctiveness,
  });
}

export function rarityExplanation(rarity: SajuRarity): ExplanationBlock {
  return freezeExplanationBlock({
    id: "saju-rarity",
    summary: Object.freeze({
      ko: "드러난 오행 서명의 이론적 희소성",
      en: "Theoretical distinctiveness of the visible element signature",
    }),
    detail: Object.freeze({
      ko: `이 값은 ${rarity.pillarCount}개 기둥을 60갑자의 가능한 기호 공간으로 놓고, 천간·지지에 드러난 오행 개수가 같은 조합이 ${rarity.sampleSpace.toLocaleString("ko-KR")}개 중 ${rarity.matchingCombinations.toLocaleString("ko-KR")}개인지 센 결과입니다. 인구 조사나 실제 출생 확률이 아니며, 희소하다고 더 좋거나 특별한 운명을 뜻하지 않습니다. 오행 서명을 다른 사람과 비교하는 대신 어떤 환경에서 특정 기운을 자주 사용한다고 느끼는지 적어 보는 자기성찰용 참고값입니다.`,
      en: `This value counts how often the same visible stem-and-branch element signature appears when ${rarity.pillarCount} pillars are placed in a symbolic space of 60 sexagenary pillars: ${rarity.matchingCombinations.toLocaleString("en-US")} of ${rarity.sampleSpace.toLocaleString("en-US")} combinations. It is not a population survey or a real birth probability, and rarity does not mean a better or more destined life. Use it as a reflection prompt about the environments in which you tend to use certain energies, not as a label for specialness.`,
    }),
    method: Object.freeze({
      ko: "각 기둥의 유효한 60갑자 조합을 동일 가중치로 두고 동적 계획법으로 오행 개수 서명의 조합 수를 셉니다. 시각 미상은 세 기둥만 사용합니다.",
      en: "Each valid sexagenary pillar receives equal symbolic weight, and dynamic programming counts the combinations for each visible element signature. An unknown birth time uses three pillars.",
    }),
    evidenceRefs: Object.freeze(["saju-rarity"]),
    citations: Object.freeze([...SAJU_TRADITION_CITATIONS]),
    tier: "cultural",
  });
}
