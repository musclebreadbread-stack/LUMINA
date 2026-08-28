import { describe, expect, it } from "vitest";

import { evaluateEligibility } from "../cognitiveEligibility";

describe("cognitive device eligibility", () => {
  it("withholds processing-speed and composite interpretation on mobile", () => {
    expect(
      evaluateEligibility({
        locale: "ko",
        device: "mobile",
        keyboard: false,
        pointer: true,
        viewportWidth: 390,
        viewportHeight: 844,
        reducedMotion: false,
      }),
    ).toEqual({
      eligibleForGs: false,
      eligibleForComposite: false,
      reason: "unsupported_input_device",
    });
  });

  it("does not use reduced-motion preference as an ability label", () => {
    expect(
      evaluateEligibility({
        locale: "ko",
        device: "desktop",
        keyboard: true,
        pointer: true,
        viewportWidth: 1440,
        viewportHeight: 900,
        reducedMotion: true,
      }),
    ).toEqual({ eligibleForGs: true, eligibleForComposite: true, reason: null });
  });
});
