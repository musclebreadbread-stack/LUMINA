import type { BranchRelationKind } from "@engine/saju/relations";

export const BRANCH_RELATION_SIGNAL_BY_KIND: Readonly<Record<BranchRelationKind, string>> =
  Object.freeze({
    clash: "day-branch-clash",
    combination: "day-branch-combination",
    trine: "day-branch-trine",
    punishment: "day-branch-punishment",
    harm: "day-branch-harm",
    destruction: "day-branch-destruction",
  });

export const DAY_VOID_SIGNAL = "day-branch-void";
export const DAY_STAGE_SIGNAL = "day-stage";
