import type {
  CharacterRecipeV1,
  PortraitArtworkKey,
  ResultSnapshotV1,
} from "./contracts";
import { PORTRAIT_ARTWORK_KEYS } from "./artwork";
import { isSnapshotEligibleForPortrait } from "./registry";
import { selectCurrentSnapshots } from "./snapshot";

const CHARACTER_SEED = "portrait-character-v1";

const BACKGROUND_LAYERS = ["ink-mist", "paper-dusk", "smoke-veil", "moon-field"] as const;
const FRAME_LAYERS = ["ring", "arch", "window", "halo"] as const;
const ACCENT_LAYERS = ["ember", "reed", "stone", "mist"] as const;
const MOTION_VARIANTS = ["slow-drift", "quiet-pulse", "still"] as const;
const PORTRAIT_ARTWORK_KEY_SET: ReadonlySet<PortraitArtworkKey> = new Set(PORTRAIT_ARTWORK_KEYS);

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pick<T>(values: readonly T[], hash: number, offset: number): T {
  return values[(hash + offset) % values.length] as T;
}

function fallbackRecipe(): CharacterRecipeV1 {
  return Object.freeze({
    schemaVersion: 1,
    seed: CHARACTER_SEED,
    backgroundLayer: "ink-mist",
    frameLayer: "ring",
    accentLayer: "mist",
    motionVariant: "still",
    artworkKeys: Object.freeze([]),
    primaryArtworkKey: null,
    fallback: true,
  });
}

function isPortraitArtworkKey(value: string): value is PortraitArtworkKey {
  return PORTRAIT_ARTWORK_KEY_SET.has(value as PortraitArtworkKey);
}

function isMoreRecent(candidate: ResultSnapshotV1, current: ResultSnapshotV1): boolean {
  const completedAtOrder = candidate.completedAt.localeCompare(current.completedAt);
  if (completedAtOrder !== 0) return completedAtOrder > 0;

  return candidate.id.localeCompare(current.id) > 0;
}

/**
 * Select decorative layers from the set of completed analysis kinds only.
 * Measured bands and raw responses never participate in the recipe, so the
 * visual identity cannot imply that a score is a personality essence.
 */
export function createCharacterRecipe(
  snapshots: readonly ResultSnapshotV1[],
): CharacterRecipeV1 {
  const currentSnapshots = selectCurrentSnapshots(snapshots).filter(isSnapshotEligibleForPortrait);
  const analysisKeys = [...new Set(currentSnapshots.map((snapshot) => snapshot.analysisKey))]
    .sort((left, right) => left.localeCompare(right));
  const artworkKeys = analysisKeys.filter(isPortraitArtworkKey);

  if (analysisKeys.length === 0) {
    return fallbackRecipe();
  }

  const latestSnapshot = currentSnapshots.reduce<ResultSnapshotV1 | null>(
    (latest, snapshot) => (latest === null || isMoreRecent(snapshot, latest) ? snapshot : latest),
    null,
  );
  const primaryArtworkKey = latestSnapshot && isPortraitArtworkKey(latestSnapshot.analysisKey)
    ? latestSnapshot.analysisKey
    : artworkKeys[0] ?? null;

  const seed = `${CHARACTER_SEED}:${analysisKeys.join("|")}`;
  const hash = hashString(seed);

  return Object.freeze({
    schemaVersion: 1,
    seed,
    backgroundLayer: pick(BACKGROUND_LAYERS, hash, 0),
    frameLayer: pick(FRAME_LAYERS, hash, 1),
    accentLayer: pick(ACCENT_LAYERS, hash, 2),
    motionVariant: pick(MOTION_VARIANTS, hash, 3),
    artworkKeys: Object.freeze(artworkKeys),
    primaryArtworkKey,
    fallback: false,
  });
}
