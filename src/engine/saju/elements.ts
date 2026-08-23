import {
  CONTROLS,
  ELEMENT_ORDER,
  GENERATES,
  branchAt,
  hiddenStemsOf,
  stemAt,
  type FiveElement,
} from "./constants";
import type { FourPillars } from "./pillars";

export type ElementCounts = Readonly<Record<FiveElement, number>>;

export interface ElementDistribution {
  /** 여덟 글자를 1점씩 센 단순 분포 (시각 미상이면 여섯 글자) */
  readonly simple: ElementCounts;
  /** 지장간을 월률분야 일수로 배분한 가중 분포. 합계는 simple 과 같다. */
  readonly weighted: ElementCounts;
  /** weighted 를 백분율로 환산한 값 (합계 100) */
  readonly percentage: ElementCounts;
  /** 한 글자도 없는 오행 */
  readonly missing: readonly FiveElement[];
  /** 가중 분포에서 가장 강한 오행 */
  readonly dominant: FiveElement;
  /** 채점에 포함된 글자 수 (6 또는 8) */
  readonly characterCount: number;
}

function emptyCounts(): Record<FiveElement, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

function pillarList(p: FourPillars) {
  return p.hour ? [p.year, p.month, p.day, p.hour] : [p.year, p.month, p.day];
}

export function computeElementDistribution(pillars: FourPillars): ElementDistribution {
  const simple = emptyCounts();
  const weighted = emptyCounts();
  const list = pillarList(pillars);

  for (const pillar of list) {
    const stemElement = stemAt(pillar.stem).element;
    simple[stemElement] += 1;
    weighted[stemElement] += 1;

    simple[branchAt(pillar.branch).element] += 1;

    // 지지 1점을 지장간 배분일수 비율로 나눈다. 지장간 일수 합은 30이다.
    const hidden = hiddenStemsOf(pillar.branch);
    const totalDays = hidden.reduce((sum, h) => sum + h.days, 0);
    for (const h of hidden) {
      weighted[stemAt(h.stem).element] += h.days / totalDays;
    }
  }

  const characterCount = list.length * 2;
  const percentage = emptyCounts();
  for (const el of ELEMENT_ORDER) {
    percentage[el] = (weighted[el] / characterCount) * 100;
  }

  const missing = ELEMENT_ORDER.filter((el) => simple[el] === 0);
  const dominant = ELEMENT_ORDER.reduce((best, el) =>
    weighted[el] > weighted[best] ? el : best,
  );

  return Object.freeze({
    simple: Object.freeze(simple),
    weighted: Object.freeze(weighted),
    percentage: Object.freeze(percentage),
    missing: Object.freeze(missing),
    dominant,
    characterCount,
  });
}

/** 오행 관계 — 일간(日干) 기준으로 다른 오행이 어떤 역할인지. */
export type ElementRole =
  | "self" //     비겁 — 나와 같은 오행
  | "output" //   식상 — 내가 생하는 오행
  | "wealth" //   재성 — 내가 극하는 오행
  | "officer" //  관성 — 나를 극하는 오행
  | "resource"; // 인성 — 나를 생하는 오행

export function elementRole(dayElement: FiveElement, other: FiveElement): ElementRole {
  if (other === dayElement) return "self";
  if (GENERATES[dayElement] === other) return "output";
  if (CONTROLS[dayElement] === other) return "wealth";
  if (CONTROLS[other] === dayElement) return "officer";
  return "resource";
}

export interface DayMasterStrength {
  /** 일간을 돕는 힘 (비겁 + 인성) */
  readonly supporting: number;
  /** 일간을 소모시키는 힘 (식상 + 재성 + 관성) */
  readonly draining: number;
  /** supporting / (supporting + draining), 0..1 */
  readonly ratio: number;
  /** 월지가 일간을 돕는가 */
  readonly hasSeasonalSupport: boolean; // 득령(得令)
  /** 일지가 일간을 돕는가 */
  readonly hasRootSupport: boolean; //     득지(得地)
  /** 나머지 글자에서 돕는 힘이 우세한가 */
  readonly hasPeerSupport: boolean; //     득세(得勢)
  readonly verdict: "strong" | "balanced" | "weak";
}

/**
 * 신강·신약 판정.
 *
 * 명리 유파마다 기준이 다르므로, 여기서는 재현 가능하고 설명 가능한 규칙만 쓴다.
 *  - 가중 오행 분포에서 비겁+인성 대 나머지의 비율
 *  - 득령·득지·득세 3요소
 * ratio 0.45~0.55 구간은 어느 쪽으로도 단정하지 않고 balanced 로 둔다.
 */
export function computeDayMasterStrength(
  pillars: FourPillars,
  distribution: ElementDistribution,
): DayMasterStrength {
  const dayElement = stemAt(pillars.day.stem).element;

  let supporting = 0;
  let draining = 0;
  for (const el of ELEMENT_ORDER) {
    const role = elementRole(dayElement, el);
    if (role === "self" || role === "resource") supporting += distribution.weighted[el];
    else draining += distribution.weighted[el];
  }
  // 일간 자신은 강약 비교에서 제외한다 (항상 존재하므로 정보량이 없다).
  supporting = Math.max(0, supporting - 1);

  const total = supporting + draining;
  const ratio = total === 0 ? 0.5 : supporting / total;

  const helps = (el: FiveElement) => {
    const role = elementRole(dayElement, el);
    return role === "self" || role === "resource";
  };

  const hasSeasonalSupport = helps(branchAt(pillars.month.branch).element);
  const hasRootSupport = helps(branchAt(pillars.day.branch).element);

  const peers = [
    stemAt(pillars.year.stem).element,
    branchAt(pillars.year.branch).element,
    stemAt(pillars.month.stem).element,
    ...(pillars.hour
      ? [stemAt(pillars.hour.stem).element, branchAt(pillars.hour.branch).element]
      : []),
  ];
  const helpingPeers = peers.filter(helps).length;
  const hasPeerSupport = helpingPeers * 2 > peers.length;

  const verdict: DayMasterStrength["verdict"] =
    ratio > 0.55 ? "strong" : ratio < 0.45 ? "weak" : "balanced";

  return Object.freeze({
    supporting,
    draining,
    ratio,
    hasSeasonalSupport,
    hasRootSupport,
    hasPeerSupport,
    verdict,
  });
}
