import { describe, expect, it } from "vitest";
import { ITEMS } from "@engine/psychometrics/items";
import type { LikertResponse } from "@engine/psychometrics/scoring";
import { decodeResponses, encodeResponses } from "../psychometricsCode";

describe("psychometrics response code", () => {
  it("round-trips all 50 responses in item order", () => {
    const responses: Record<number, LikertResponse> = {};
    for (const item of ITEMS) {
      responses[item.id] = (((item.id - 1) % 5) + 1) as LikertResponse;
    }
    const code = encodeResponses(responses);

    expect(code).toHaveLength(50);
    expect(decodeResponses(code)).toEqual(responses);
  });

  it.each(["", "0".repeat(50), "1".repeat(49), "1".repeat(51), `1${"2".repeat(49)}x`])(
    "rejects invalid code %s",
    (code) => {
      expect(decodeResponses(code)).toBeNull();
    },
  );
});
