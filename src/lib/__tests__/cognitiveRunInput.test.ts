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

  it("accepts an optional norming age only within the target population", () => {
    const base = {
      consent: { operationalStorage: true, researchParticipation: true },
      capability: {
        locale: "ko" as const,
        device: "desktop" as const,
        keyboard: true,
        pointer: true,
        viewportWidth: 1440,
        viewportHeight: 900,
        reducedMotion: false,
      },
    };
    expect(parseStartRunInput({ ...base, ageYears: 32 }).ageYears).toBe(32);
    expect(() => parseStartRunInput({ ...base, ageYears: 17 })).toThrow("age must be an integer");
    expect(() => parseStartRunInput({ ...base, consent: { ...base.consent, researchParticipation: false }, ageYears: 32 })).toThrow(
      "norming demographics require research consent",
    );
  });

  it("accepts optional gender, education, and region strata only within the pre-registered bands", () => {
    const base = {
      consent: { operationalStorage: true, researchParticipation: true },
      capability: {
        locale: "ko" as const,
        device: "desktop" as const,
        keyboard: true,
        pointer: true,
        viewportWidth: 1440,
        viewportHeight: 900,
        reducedMotion: false,
      },
    };
    const parsed = parseStartRunInput({
      ...base,
      genderBand: "self_described",
      educationBand: "bachelor",
      regionClass: "capital_region",
    });
    expect(parsed.genderBand).toBe("self_described");
    expect(parsed.educationBand).toBe("bachelor");
    expect(parsed.regionClass).toBe("capital_region");

    expect(() => parseStartRunInput({ ...base, genderBand: "unknown" })).toThrow("invalid gender band");
    expect(() => parseStartRunInput({ ...base, educationBand: "phd" })).toThrow("invalid education band");
    expect(() => parseStartRunInput({ ...base, regionClass: "moon" })).toThrow("invalid region class");
    expect(() =>
      parseStartRunInput({ ...base, consent: { ...base.consent, researchParticipation: false }, genderBand: "male" }),
    ).toThrow("norming demographics require research consent");
  });
});
