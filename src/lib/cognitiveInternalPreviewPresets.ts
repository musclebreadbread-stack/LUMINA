import type { StandardizedScore } from "@engine/cognitive-standardized/types";

/**
 * 내부 디자인 검토 전용 합성 값이다. 실제 규준·참가자 데이터가 아니며
 * `normVersion`에 항상 "internal-preview-synthetic-v1"을 명시해 구분한다.
 */
export const INTERNAL_PREVIEW_PRESETS = {
  average: {
    fullScaleIq: 100,
    percentile: 50,
    confidenceInterval95: [93, 107],
    normVersion: "internal-preview-synthetic-v1",
  },
  high: {
    fullScaleIq: 131,
    percentile: 98,
    confidenceInterval95: [124, 138],
    normVersion: "internal-preview-synthetic-v1",
  },
  low: {
    fullScaleIq: 71,
    percentile: 3,
    confidenceInterval95: [64, 78],
    normVersion: "internal-preview-synthetic-v1",
  },
} as const satisfies Readonly<Record<"average" | "high" | "low", StandardizedScore>>;

export type InternalPreviewPresetKey = keyof typeof INTERNAL_PREVIEW_PRESETS;

export function resolveInternalPreviewPreset(candidate: string | undefined): StandardizedScore {
  if (candidate !== undefined && candidate in INTERNAL_PREVIEW_PRESETS) {
    return INTERNAL_PREVIEW_PRESETS[candidate as InternalPreviewPresetKey];
  }
  return INTERNAL_PREVIEW_PRESETS.average;
}
