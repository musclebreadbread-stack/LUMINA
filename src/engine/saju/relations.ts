export type BranchRelationKind =
  | "clash"
  | "combination"
  | "trine"
  | "punishment"
  | "harm"
  | "destruction";

export interface BranchRelation {
  readonly kind: BranchRelationKind;
  readonly branches: readonly number[];
  readonly pair: readonly [number, number];
}

interface RelationGroup {
  readonly kind: BranchRelationKind;
  readonly groups: readonly (readonly number[])[];
}

const RELATION_GROUPS: readonly RelationGroup[] = Object.freeze([
  {
    kind: "clash",
    groups: Object.freeze([
      Object.freeze([0, 6]),
      Object.freeze([1, 7]),
      Object.freeze([2, 8]),
      Object.freeze([3, 9]),
      Object.freeze([4, 10]),
      Object.freeze([5, 11]),
    ]),
  },
  {
    kind: "combination",
    groups: Object.freeze([
      Object.freeze([0, 1]),
      Object.freeze([2, 11]),
      Object.freeze([3, 10]),
      Object.freeze([4, 9]),
      Object.freeze([5, 8]),
      Object.freeze([6, 7]),
    ]),
  },
  {
    kind: "trine",
    groups: Object.freeze([
      Object.freeze([0, 4, 8]),
      Object.freeze([1, 5, 9]),
      Object.freeze([2, 6, 10]),
      Object.freeze([3, 7, 11]),
    ]),
  },
  {
    kind: "punishment",
    groups: Object.freeze([
      Object.freeze([0, 3]),
      Object.freeze([1, 7, 10]),
      Object.freeze([2, 5, 8]),
      Object.freeze([4]),
      Object.freeze([6]),
      Object.freeze([9]),
      Object.freeze([11]),
    ]),
  },
  {
    kind: "harm",
    groups: Object.freeze([
      Object.freeze([0, 7]),
      Object.freeze([1, 6]),
      Object.freeze([2, 9]),
      Object.freeze([3, 10]),
      Object.freeze([4, 11]),
      Object.freeze([5, 8]),
    ]),
  },
  {
    kind: "destruction",
    groups: Object.freeze([
      Object.freeze([0, 9]),
      Object.freeze([1, 4]),
      Object.freeze([2, 11]),
      Object.freeze([3, 6]),
      Object.freeze([5, 8]),
      Object.freeze([7, 10]),
    ]),
  },
]);

const PRIORITY: Readonly<Record<BranchRelationKind, number>> = Object.freeze({
  clash: 0,
  punishment: 1,
  harm: 2,
  destruction: 3,
  combination: 4,
  trine: 5,
});

function normalizeBranch(branch: number): number {
  return ((branch % 12) + 12) % 12;
}

function includesPair(group: readonly number[], a: number, b: number): boolean {
  const hasA = group.includes(a);
  const hasB = group.includes(b);
  if (!hasA || !hasB) return false;
  return a !== b || group.length === 1;
}

function relationForPair(
  kind: BranchRelationKind,
  group: readonly number[],
  a: number,
  b: number,
): BranchRelation {
  return Object.freeze({
    kind,
    branches: Object.freeze([...group]),
    pair: Object.freeze([a, b] as [number, number]),
  });
}

/** Return every named traditional branch relation for a pair of branches. */
export function branchRelationsOf(first: number, second: number): readonly BranchRelation[] {
  const a = normalizeBranch(first);
  const b = normalizeBranch(second);
  const found: BranchRelation[] = [];

  for (const relation of RELATION_GROUPS) {
    for (const group of relation.groups) {
      if (includesPair(group, a, b)) {
        found.push(relationForPair(relation.kind, group, a, b));
        break;
      }
    }
  }

  return Object.freeze(found.sort((left, right) => PRIORITY[left.kind] - PRIORITY[right.kind]));
}

/** Return the highest-priority relation, useful when one signal slot is required. */
export function branchRelationOf(first: number, second: number): BranchRelation | null {
  return branchRelationsOf(first, second)[0] ?? null;
}

/** Enumerate all ordered branch pairs; useful for exhaustive relation tests. */
export function allBranchRelations(): readonly (readonly [number, number, readonly BranchRelation[]])[] {
  const pairs: [number, number, readonly BranchRelation[]][] = [];
  for (let first = 0; first < 12; first += 1) {
    for (let second = 0; second < 12; second += 1) {
      pairs.push([first, second, branchRelationsOf(first, second)]);
    }
  }
  return Object.freeze(pairs.map((pair) => Object.freeze(pair)));
}
