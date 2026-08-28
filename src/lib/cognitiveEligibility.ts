import type { DeviceCapability } from "@engine/cognitive-standardized/types";

export type EligibilityReason = "unsupported_input_device" | "insufficient_viewport" | "unsupported_locale";

export interface CognitiveEligibility {
  readonly eligibleForGs: boolean;
  readonly eligibleForComposite: boolean;
  readonly reason: EligibilityReason | null;
}

const MIN_VIEWPORT_WIDTH = 1024;
const MIN_VIEWPORT_HEIGHT = 600;

/**
 * 검사에 필요한 장치 조건만 판정한다. 능력 수준이나 사람의 우열을 추론하지 않는다.
 * 장치 정보는 호출자가 명시적으로 전달하며 window/navigator를 읽지 않는다.
 */
export function evaluateEligibility(capability: DeviceCapability): CognitiveEligibility {
  if (capability.locale !== "ko" && capability.locale !== "en") {
    return { eligibleForGs: false, eligibleForComposite: false, reason: "unsupported_locale" };
  }
  if (capability.device === "mobile" || !capability.keyboard || !capability.pointer) {
    return { eligibleForGs: false, eligibleForComposite: false, reason: "unsupported_input_device" };
  }
  if (capability.viewportWidth < MIN_VIEWPORT_WIDTH || capability.viewportHeight < MIN_VIEWPORT_HEIGHT) {
    return { eligibleForGs: false, eligibleForComposite: false, reason: "insufficient_viewport" };
  }
  return { eligibleForGs: true, eligibleForComposite: true, reason: null };
}
