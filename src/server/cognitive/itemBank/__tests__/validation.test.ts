import { describe, expect, it } from "vitest";

import {
  validateCalibratedItem,
  type ItemBankRecord,
} from "../validation";
import { DEVELOPMENT_FIXTURE_ITEM } from "../developmentFixture";

const fixtureItem: ItemBankRecord = DEVELOPMENT_FIXTURE_ITEM;

describe("cognitive item-bank validation", () => {
  it("rejects an operational item without calibrated parameters", () => {
    expect(() =>
      validateCalibratedItem({
        ...fixtureItem,
        status: "active",
        parameters: null,
      }),
    ).toThrow("active items require calibrated parameters");
  });

  it("rejects a pilot item without calibrated parameters before selection", () => {
    expect(() =>
      validateCalibratedItem({
        ...fixtureItem,
        status: "pilot",
        parameters: null,
      }),
    ).toThrow("active items require calibrated parameters");
  });

  it("rejects an implausibly high 3PL guessing parameter", () => {
    expect(() =>
      validateCalibratedItem({
        ...fixtureItem,
        parameters: { ...fixtureItem.parameters!, guessing: 0.51 },
      }),
    ).toThrow("guessing must be in the range [0, 0.5]");
  });

  it("rejects duplicate option ids and an unknown correct option", () => {
    expect(() =>
      validateCalibratedItem({
        ...fixtureItem,
        presentation: {
          ...fixtureItem.presentation,
          options: [
            fixtureItem.presentation.options[0]!,
            fixtureItem.presentation.options[0]!,
          ],
        },
      }),
    ).toThrow("duplicate option id");

    expect(() =>
      validateCalibratedItem({
        ...fixtureItem,
        correctOptionId: "missing-option",
      }),
    ).toThrow("correct option must exist");
  });

  it("requires two independent expert reviews for active items", () => {
    expect(() =>
      validateCalibratedItem({
        ...fixtureItem,
        calibration: {
          ...fixtureItem.calibration!,
          expertReviewIds: ["reviewer-a"],
        },
      }),
    ).toThrow("two independent expert reviews");
  });
});
