import { describe, expect, it } from "vitest";
import type { AnalysisDefinition, AnalysisKey } from "@engine/shared/evidence";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";
import { nextLensCandidates, pickNextLenses, type LensCandidate } from "@/lib/nextLens";

function keysOf(candidates: readonly LensCandidate[]): readonly AnalysisKey[] {
  return candidates.map((candidate) => candidate.key);
}

describe("next lens candidates", () => {
  it("never suggests the analysis the reader is already looking at", () => {
    for (const definition of ANALYSIS_CATALOG) {
      expect(keysOf(nextLensCandidates(definition.key))).not.toContain(definition.key);
    }
  });

  it("offers every other analysis exactly once", () => {
    const candidates = nextLensCandidates("psychometrics");
    const keys = keysOf(candidates);

    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual(
      ANALYSIS_CATALOG.map((item) => item.key)
        .filter((key) => key !== "psychometrics")
        .sort(),
    );
  });

  it("puts same-group siblings ahead of every crossing", () => {
    const candidates = nextLensCandidates("psychometrics");
    const lastSibling = candidates.findLastIndex((candidate) => candidate.relation === "sibling");
    const firstCrossing = candidates.findIndex((candidate) => candidate.relation === "crossing");

    expect(lastSibling).toBeGreaterThanOrEqual(0);
    expect(firstCrossing).toBe(lastSibling + 1);
  });

  it("marks siblings with the reader's own group and crossings with another one", () => {
    for (const candidate of nextLensCandidates("darktriad")) {
      if (candidate.relation === "sibling") expect(candidate.groupKey).toBe("assessment");
      else expect(candidate.groupKey).not.toBe("assessment");
    }
  });

  it("walks outward one group at a time instead of always landing on the same family", () => {
    // assessment 다음 칸은 ability 이므로 성격 검사에서 건너뛰는 첫 분석은 인지능력이다.
    const fromAssessment = nextLensCandidates("eq").filter((c) => c.relation === "crossing");
    expect(fromAssessment[0]?.groupKey).toBe("ability");

    // ability 묶음은 하나뿐이라 형제가 없고, 곧장 다음 칸인 tradition 으로 건너간다.
    const fromAbility = nextLensCandidates("cognitive");
    expect(fromAbility.every((candidate) => candidate.relation === "crossing")).toBe(true);
    expect(fromAbility[0]?.groupKey).toBe("tradition");

    // 마지막 묶음(today)에서는 한 바퀴 돌아 첫 묶음으로 되돌아온다.
    const fromToday = nextLensCandidates("horoscope");
    expect(fromToday[0]?.groupKey).toBe("assessment");
  });

  it("carries the message keys the screen needs so the caller never re-derives them", () => {
    const candidate = nextLensCandidates("cognitive")[0];
    if (!candidate) throw new Error("cognitive should always have a crossing candidate");
    const definition = ANALYSIS_CATALOG.find((item) => item.key === candidate.key);

    expect(candidate.href).toBe(definition?.href);
    expect(candidate.titleKey).toBe(definition?.titleKey);
    expect(candidate.descKey).toBe(definition?.descKey);
    expect(candidate.groupTitleKey.length).toBeGreaterThan(0);
  });

  it("rejects a key that the given catalog does not contain", () => {
    const solo = ANALYSIS_CATALOG.find((item) => item.key === "saju");
    if (!solo) throw new Error("catalog fixture is missing saju");

    expect(() => nextLensCandidates("eq", [solo])).toThrow(RangeError);
  });

  it("survives a catalog where the reader's group holds nothing else", () => {
    const solo = ANALYSIS_CATALOG.find((item) => item.key === "cognitive");
    if (!solo) throw new Error("catalog fixture is missing cognitive");

    expect(nextLensCandidates("cognitive", [solo])).toEqual([]);
  });
});

describe("picking the lenses to show", () => {
  const candidates = nextLensCandidates("psychometrics");

  it("shows one sibling and one crossing when nothing has been explored", () => {
    const picked = pickNextLenses(candidates, new Set<AnalysisKey>());

    expect(picked).toHaveLength(2);
    expect(picked[0]?.relation).toBe("sibling");
    expect(picked[1]?.relation).toBe("crossing");
  });

  it("prefers an analysis the reader has not opened yet", () => {
    const firstSibling = candidates.find((candidate) => candidate.relation === "sibling");
    const firstCrossing = candidates.find((candidate) => candidate.relation === "crossing");
    if (!firstSibling || !firstCrossing) throw new Error("fixture lost its two relations");

    const picked = pickNextLenses(candidates, new Set([firstSibling.key, firstCrossing.key]));

    expect(picked.map((candidate) => candidate.key)).not.toContain(firstSibling.key);
    expect(picked.map((candidate) => candidate.key)).not.toContain(firstCrossing.key);
    expect(picked).toHaveLength(2);
  });

  it("falls back to the first candidate instead of going blank once everything is explored", () => {
    const everything = new Set(candidates.map((candidate) => candidate.key));
    const picked = pickNextLenses(candidates, everything);

    expect(picked.map((candidate) => candidate.key)).toEqual([
      candidates.find((candidate) => candidate.relation === "sibling")?.key,
      candidates.find((candidate) => candidate.relation === "crossing")?.key,
    ]);
  });

  it("drops the missing half rather than padding it when a relation has no candidate", () => {
    const crossingsOnly = nextLensCandidates("cognitive");
    const picked = pickNextLenses(crossingsOnly, new Set<AnalysisKey>());

    expect(picked).toHaveLength(1);
    expect(picked[0]?.relation).toBe("crossing");
    expect(pickNextLenses([] as readonly LensCandidate[], new Set<AnalysisKey>())).toEqual([]);
  });

  it("accepts a localized view object, not just the raw candidate shape", () => {
    const views = [
      { key: "saju" as const, relation: "crossing" as const, title: "사주" },
      { key: "tarot" as const, relation: "crossing" as const, title: "타로" },
    ];

    expect(pickNextLenses(views, new Set<AnalysisKey>(["saju"]))).toEqual([views[1]]);
  });
});

describe("catalog invariants the recommendation depends on", () => {
  it("gives every analysis at least one thing to move on to", () => {
    for (const definition of ANALYSIS_CATALOG) {
      const picked = pickNextLenses(nextLensCandidates(definition.key), new Set<AnalysisKey>());
      expect(picked.length).toBeGreaterThan(0);
    }
  });

  it("only ever suggests hrefs that the catalog itself declares", () => {
    const hrefs = new Set<string>(ANALYSIS_CATALOG.map((item: AnalysisDefinition) => item.href));
    for (const definition of ANALYSIS_CATALOG) {
      for (const candidate of nextLensCandidates(definition.key)) {
        expect(hrefs.has(candidate.href)).toBe(true);
      }
    }
  });
});
