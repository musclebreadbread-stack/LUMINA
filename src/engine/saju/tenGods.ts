import { CONTROLS, GENERATES, branchAt, hiddenStemsOf, stemAt, type TenGod } from "./constants";
import type { FourPillars, Pillar } from "./pillars";

/**
 * 십신(十神) 판정.
 *
 * 일간(日干)을 "나"로 두고, 대상 천간과의 오행 생극 관계 + 음양의 같고 다름으로
 * 10가지 중 하나를 정한다.
 *
 *   같은 오행  : 음양 같음 → 비견, 다름 → 겁재
 *   내가 생함  : 같음 → 식신, 다름 → 상관
 *   내가 극함  : 같음 → 편재, 다름 → 정재
 *   나를 극함  : 같음 → 편관, 다름 → 정관
 *   나를 생함  : 같음 → 편인, 다름 → 정인
 */
export function tenGodOf(dayStem: number, targetStem: number): TenGod {
  const me = stemAt(dayStem);
  const other = stemAt(targetStem);
  const same = me.polarity === other.polarity;

  if (other.element === me.element) return same ? "비견" : "겁재";
  if (GENERATES[me.element] === other.element) return same ? "식신" : "상관";
  if (CONTROLS[me.element] === other.element) return same ? "편재" : "정재";
  if (CONTROLS[other.element] === me.element) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}

/**
 * 지지의 십신.
 *
 * 지지는 자리(位)의 음양과 본질의 음양이 자오사해(子午巳亥)에서 어긋나므로,
 * 지장간 정기(正氣)의 천간으로 판정한다. 예) 子의 정기는 癸(음수)이므로
 * 갑(甲) 일간 기준 子는 편인이 아니라 정인이다.
 */
export function tenGodOfBranch(dayStem: number, branchIndex: number): TenGod {
  return tenGodOf(dayStem, branchAt(branchIndex).principalStem);
}

export interface PillarTenGods {
  /** 천간의 십신. 일주의 천간은 일간 자신이므로 null. */
  readonly stem: TenGod | null;
  /** 지지의 십신 (지장간 정기 기준) */
  readonly branch: TenGod;
  /** 지장간 전체의 십신 */
  readonly hidden: readonly { readonly stem: number; readonly tenGod: TenGod; readonly role: string }[];
}

export interface TenGodChart {
  readonly year: PillarTenGods;
  readonly month: PillarTenGods;
  readonly day: PillarTenGods;
  readonly hour: PillarTenGods | null;
  /** 원국 전체에서 각 십신이 몇 번 나타나는지 (천간 + 지지 정기 기준) */
  readonly counts: Readonly<Record<TenGod, number>>;
}

function pillarTenGods(dayStem: number, pillar: Pillar, isDayPillar: boolean): PillarTenGods {
  return Object.freeze({
    stem: isDayPillar ? null : tenGodOf(dayStem, pillar.stem),
    branch: tenGodOfBranch(dayStem, pillar.branch),
    hidden: Object.freeze(
      hiddenStemsOf(pillar.branch).map((h) =>
        Object.freeze({ stem: h.stem, tenGod: tenGodOf(dayStem, h.stem), role: h.role }),
      ),
    ),
  });
}

export function computeTenGods(pillars: FourPillars): TenGodChart {
  const dayStem = pillars.day.stem;

  const year = pillarTenGods(dayStem, pillars.year, false);
  const month = pillarTenGods(dayStem, pillars.month, false);
  const day = pillarTenGods(dayStem, pillars.day, true);
  const hour = pillars.hour ? pillarTenGods(dayStem, pillars.hour, false) : null;

  const counts: Record<TenGod, number> = {
    비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
    정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
  };
  for (const p of [year, month, day, hour]) {
    if (!p) continue;
    if (p.stem) counts[p.stem] += 1;
    counts[p.branch] += 1;
  }

  return Object.freeze({ year, month, day, hour, counts: Object.freeze(counts) });
}
