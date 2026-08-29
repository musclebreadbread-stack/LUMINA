import type { CharacterRecipeV1, ResultSnapshotV1 } from "./contracts";
import { isSnapshotEligibleForPortrait } from "./registry";
import { selectCurrentSnapshots } from "./snapshot";

const CHARACTER_SEED = "portrait-character-v1";

const BACKGROUND_LAYERS = ["ink-mist", "paper-dusk", "smoke-veil", "moon-field"] as const;
const FRAME_LAYERS = ["ring", "arch", "window", "halo"] as const;
const ACCENT_LAYERS = ["ember", "reed", "stone", "mist"] as const;
const MOTION_VARIANTS = ["slow-drift", "quiet-pulse", "still"] as const;

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
    fallback: true,
  });
}

/**
 * Select decorative layers from the set of completed analysis kinds only.
 * Measured bands and raw responses never participate in the recipe, so the
 * visual identity cannot imply that a score is a personality essence.
 */
export function createCharacterRecipe(
  snapshots: readonly ResultSnapshotV1[],
): CharacterRecipeV1 {
  const analysisKeys = [...new Set(
    selectCurrentSnapshots(snapshots)
      .filter(isSnapshotEligibleForPortrait)
      .map((snapshot) => snapshot.analysisKey),
  )].sort((left, right) => left.localeCompare(right));

  if (analysisKeys.length === 0) {
    return fallbackRecipe();
  }

  const seed = `${CHARACTER_SEED}:${analysisKeys.join("|")}`;
  const hash = hashString(seed);

  return Object.freeze({
    schemaVersion: 1,
    seed,
    backgroundLayer: pick(BACKGROUND_LAYERS, hash, 0),
    frameLayer: pick(FRAME_LAYERS, hash, 1),
    accentLayer: pick(ACCENT_LAYERS, hash, 2),
    motionVariant: pick(MOTION_VARIANTS, hash, 3),
    fallback: false,
  });
}
