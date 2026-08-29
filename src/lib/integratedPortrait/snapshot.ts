import type { AnalysisKey } from "@engine/shared/evidence";
import type { PortraitEligibility, ResultSnapshotV1 } from "./contracts";
import { isSnapshotEligibleForPortrait } from "./registry";

export const INTEGRATED_PORTRAIT_MINIMUMS = Object.freeze({
  analyses: 3,
  scientificProvenanceGroups: 2,
});

function isMoreRecent(candidate: ResultSnapshotV1, current: ResultSnapshotV1): boolean {
  const completedAtOrder = candidate.completedAt.localeCompare(current.completedAt);
  if (completedAtOrder !== 0) return completedAtOrder > 0;

  return candidate.id.localeCompare(current.id) > 0;
}

export function selectCurrentSnapshots(
  snapshots: readonly ResultSnapshotV1[],
): readonly ResultSnapshotV1[] {
  const selectedByAnalysis = new Map<AnalysisKey, ResultSnapshotV1>();

  for (const snapshot of snapshots) {
    const current = selectedByAnalysis.get(snapshot.analysisKey);
    if (!current || isMoreRecent(snapshot, current)) {
      selectedByAnalysis.set(snapshot.analysisKey, snapshot);
    }
  }

  return Object.freeze(
    [...selectedByAnalysis.values()].sort((left, right) =>
      left.analysisKey.localeCompare(right.analysisKey),
    ),
  );
}

export function getPortraitEligibility(
  snapshots: readonly ResultSnapshotV1[],
): PortraitEligibility {
  const currentSnapshots = selectCurrentSnapshots(snapshots).filter(isSnapshotEligibleForPortrait);
  const scientificProvenanceGroups = new Set(
    currentSnapshots
      .filter((snapshot) => snapshot.lane === "scientific")
      .map((snapshot) => snapshot.provenanceGroup),
  );
  const distinctAnalysisCount = currentSnapshots.length;
  const scientificProvenanceCount = scientificProvenanceGroups.size;
  const missingAnalysisCount = Math.max(
    0,
    INTEGRATED_PORTRAIT_MINIMUMS.analyses - distinctAnalysisCount,
  );
  const missingScientificProvenanceCount = Math.max(
    0,
    INTEGRATED_PORTRAIT_MINIMUMS.scientificProvenanceGroups - scientificProvenanceCount,
  );

  return Object.freeze({
    distinctAnalysisCount,
    scientificProvenanceCount,
    missingAnalysisCount,
    missingScientificProvenanceCount,
    isUnlocked: missingAnalysisCount === 0 && missingScientificProvenanceCount === 0,
  });
}
