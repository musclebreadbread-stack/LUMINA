import { describe, expect, it } from "vitest";
import { ITEMS } from "@engine/eq/items";
import type { LikertResponse } from "@engine/eq/scoring";
import { decodeResponses, encodeResponses } from "../eqCode";

describe("eq response code", () => {
  it("round-trips all 33 responses in item order", () => {
    const responses: Record<number, LikertResponse> = {};
    for (const item of ITEMS) {
      responses[item.id] = (((item.id - 1) % 5) + 1) as LikertResponse;
    }
    const code = encodeResponses(responses);

    expect(code).toHaveLength(33);
    expect(decodeResponses(code)).toEqual(responses);
  });

  it.each(["", "0".repeat(33), "1".repeat(32), "1".repeat(34), `1${"2".repeat(31)}x`])(
    "rejects invalid code %s",
    (code) => {
      expect(decodeResponses(code)).toBeNull();
    },
  );
});
