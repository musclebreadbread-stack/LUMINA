import { describe, expect, it } from "vitest";

import { parseResponseInput, parseStartRunInput } from "../cognitiveRunInput";

describe("cognitive run input parser", () => {
  it("rejects a response with an option not safe for the public contract", () => {
    expect(() =>
      parseResponseInput({
        runId: "11111111-1111-4111-8111-111111111111",
        assignmentId: "22222222-2222-4222-8222-222222222222",
        optionId: "hidden",
      }),
    ).toThrow("invalid option id");
  });

  it("requires explicit operational storage consent and a complete capability", () => {
    expect(() =>
      parseStartRunInput({
        consent: { operationalStorage: false, researchParticipation: true },
        capability: {},
      }),
    ).toThrow("operational storage consent is required");

    expect(
      parseStartRunInput({
        consent: { operationalStorage: true, researchParticipation: false },
        capability: {
          locale: "ko",
          device: "desktop",
          keyboard: true,
          pointer: true,
          viewportWidth: 1440,
          viewportHeight: 900,
          reducedMotion: false,
        },
      }).consent.researchParticipation,
    ).toBe(false);
  });
});
