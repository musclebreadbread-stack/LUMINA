import { describe, expect, it } from "vitest";
import { makePillar, type FourPillars } from "@engine/saju/pillars";
import { isValidCitation } from "@engine/shared/citation";
import { assertExplanationBlock } from "@engine/shared/explanation";
import { computeSynastry } from "@engine/synastry";

function chart(
  year: [number, number],
  month: [number, number],
  day: [number, number],
  hour: [number, number] | null = null,
): FourPillars {
  return Object.freeze({
    year: makePillar(...year),
    month: makePillar(...month),
    day: makePillar(...day),
    hour: hour ? makePillar(...hour) : null,
  });
}

describe("Saju synastry", () => {
  it("compares visible branch relations and corresponding stems", () => {
    const left = chart([0, 0], [2, 2], [4, 4]);
    const right = chart([6, 6], [1, 1], [4, 4]);
    const result = computeSynastry(left, right);

    expect(result.engine).toBe("synastry");
    expect(result.tier).toBe("cultural");
    expect(result.summary.branchRelationCount).toBeGreaterThan(0);
    expect(result.summary.supportiveCount).toBeGreaterThan(0);
    expect(result.summary.challengingCount).toBeGreaterThan(0);
    expect(result.summary.stemRelationCount).toBe(3);
    expect(result.branchRelations.map((relation) => relation.kind)).toEqual(
      expect.arrayContaining(["clash", "combination", "trine"]),
    );
    expect(result.stemRelations.map((relation) => relation.kind)).toEqual(
      expect.arrayContaining(["receives-control", "receives-generation", "same-element"]),
    );
    expect(result.dayMaster.kind).toBe("same-element");
  });

  it("returns a frozen, citation-backed explanation for deterministic output", () => {
    const result = computeSynastry(
      chart([0, 0], [2, 2], [4, 4]),
      chart([6, 6], [1, 1], [4, 4]),
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.summary)).toBe(true);
    assertExplanationBlock(result.explanation);
    expect(result.explanation.citations.every(isValidCitation)).toBe(true);
    expect(result.explanation.evidenceRefs).toEqual([
      "saju-synastry-branches",
      "saju-synastry-stems",
    ]);
    expect(computeSynastry(
      chart([0, 0], [2, 2], [4, 4]),
      chart([6, 6], [1, 1], [4, 4]),
    )).toEqual(result);
  });

  it("keeps the tone branches explicit for quiet, supportive, challenging, and mixed charts", () => {
    const quiet = computeSynastry(
      chart([0, 0], [0, 0], [0, 0]),
      chart([0, 0], [0, 0], [0, 0]),
    );
    const supportive = computeSynastry(
      chart([0, 0], [0, 0], [0, 0]),
      chart([1, 1], [1, 1], [1, 1]),
    );
    const challenging = computeSynastry(
      chart([0, 0], [0, 0], [0, 0]),
      chart([0, 6], [0, 6], [0, 6]),
    );

    expect(quiet.summary.tone).toBe("quiet");
    expect(supportive.summary.tone).toBe("supportive");
    expect(challenging.summary.tone).toBe("challenging");
    expect(quiet.explanation.summary.en).toContain("few named branch signals");
    expect(supportive.explanation.summary.en).toContain("more supportive signals");
    expect(challenging.explanation.summary.en).toContain("more challenging signals");

    const mixed = computeSynastry(
      chart([0, 0], [2, 2], [4, 4]),
      chart([6, 6], [1, 1], [4, 4]),
    );
    expect(mixed.summary.tone).toBe("mixed");
    expect(mixed.explanation.summary.en).toContain("both supportive and challenging signals");
  });

  it("classifies all reachable five-element stem directions and includes an hour pillar", () => {
    const expected: readonly (readonly [number, number, string])[] = [
      [0, 1, "same-element"],
      [0, 2, "generates"],
      [0, 4, "controls"],
      [2, 0, "receives-generation"],
      [4, 0, "receives-control"],
    ];

    for (const [leftStem, rightStem, kind] of expected) {
      const result = computeSynastry(
        chart([leftStem, 0], [leftStem, 0], [leftStem, 0], [leftStem, 0]),
        chart(
          [rightStem, rightStem % 2],
          [rightStem, rightStem % 2],
          [rightStem, rightStem % 2],
          [rightStem, rightStem % 2],
        ),
      );
      expect(result.dayMaster.kind).toBe(kind);
      expect(result.stemRelations).toHaveLength(4);
    }
  });
});
