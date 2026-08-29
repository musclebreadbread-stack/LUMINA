import type {
  ResultSnapshotV1,
  SynthesisClaimV1,
  SynthesisReportV1,
} from "./contracts";
import { isSnapshotEligibleForPortrait } from "./registry";
import { selectCurrentSnapshots } from "./snapshot";

/**
 * A stable identifier for a signal in a materialized result snapshot.
 *
 * Signal ids are intentionally local to the vault. They are not an invitation
 * to expose raw answers or to join records across users.
 */
export function createSignalId(snapshot: ResultSnapshotV1, constructId: string): string {
  return `${snapshot.id}:${constructId}`;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
}

function createSingleSourceClaim(
  snapshot: ResultSnapshotV1,
  constructId: string,
  descriptorIds: readonly string[],
  limitationIds: readonly string[],
): SynthesisClaimV1 {
  const signalId = createSignalId(snapshot, constructId);

  return Object.freeze({
    claimId: `single-source:${signalId}`,
    kind: "single-source",
    status: "exploratory",
    sourceSignalIds: Object.freeze([signalId]),
    counterSignalIds: Object.freeze([]),
    interpretationKey: `single-source.${constructId}`,
    limitationIds: uniqueSorted(limitationIds),
    experimentKey: descriptorIds.length > 0 ? "observe-in-daily-life" : "observe-and-note",
  });
}

/**
 * Build the evidence-separated MVP report.
 *
 * The first release deliberately emits one exploratory claim per signal. It
 * does not infer agreement, conflict, causality, or a combined score. Those
 * claims require a pre-registered comparison rule and independent evidence;
 * without one, a visually compelling synthesis would overstate what the
 * underlying instruments support.
 */
export function createSynthesis(
  snapshots: readonly ResultSnapshotV1[],
): SynthesisReportV1 {
  const currentSnapshots = selectCurrentSnapshots(snapshots)
    .filter(isSnapshotEligibleForPortrait)
    .sort((left, right) => {
      const laneOrder = left.lane.localeCompare(right.lane);
      if (laneOrder !== 0) return laneOrder;
      return left.analysisKey.localeCompare(right.analysisKey);
    });

  const scientificClaims: SynthesisClaimV1[] = [];
  const culturalObservations: SynthesisClaimV1[] = [];

  for (const snapshot of currentSnapshots) {
    const claims = snapshot.signals
      .slice()
      .sort((left, right) => left.constructId.localeCompare(right.constructId))
      .map((signal) =>
        createSingleSourceClaim(
          snapshot,
          signal.constructId,
          signal.descriptorIds,
          signal.limitationIds,
        ),
      );

    if (snapshot.lane === "cultural") {
      culturalObservations.push(...claims);
    } else if (snapshot.lane === "scientific") {
      scientificClaims.push(...claims);
    }
  }

  return Object.freeze({
    scientificClaims: Object.freeze(scientificClaims),
    culturalObservations: Object.freeze(culturalObservations),
    contextualClaims: Object.freeze([]),
  });
}
