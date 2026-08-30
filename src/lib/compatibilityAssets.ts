import type { SynastryTone } from "@engine/synastry";
import { assetPath } from "@/lib/assets";

export const COMPATIBILITY_OVERVIEW_IMAGE = assetPath("compatibility", "overview");

export function compatibilityToneImagePath(tone: SynastryTone): string {
  return assetPath("compatibility", tone);
}
