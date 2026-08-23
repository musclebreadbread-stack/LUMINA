import { gregorianToJDN } from "@engine/shared/time";
import { branchAt, stemAt } from "@engine/saju/constants";
import { dayPillarFromJDN, twelveStageOf, voidBranchesOf, type Pillar } from "@engine/saju/pillars";
import { branchRelationsOf, type BranchRelation } from "@engine/saju/relations";
import { parseReferenceDate } from "./sky";

export interface DayFortune {
  readonly date: string;
  readonly pillar: Pillar;
  readonly stem: ReturnType<typeof stemAt>;
  readonly branch: ReturnType<typeof branchAt>;
  readonly voidBranches: readonly [number, number];
  readonly targetBranch: number | null;
  readonly targetRelations: readonly BranchRelation[];
  readonly targetStage: string | null;
}

export function computeDayFortune(date: string, targetBranch: number | null = null): DayFortune {
  const parsed = parseReferenceDate(date);
  const pillar = dayPillarFromJDN(gregorianToJDN(parsed.year, parsed.month, parsed.day));
  const branch = branchAt(pillar.branch);
  const stem = stemAt(pillar.stem);
  const targetRelations = targetBranch === null ? [] : branchRelationsOf(pillar.branch, targetBranch);
  const targetStage = targetBranch === null ? null : twelveStageOf(pillar.stem, targetBranch);

  return Object.freeze({
    date,
    pillar,
    stem,
    branch,
    voidBranches: voidBranchesOf(pillar),
    targetBranch,
    targetRelations: Object.freeze([...targetRelations]),
    targetStage,
  });
}
