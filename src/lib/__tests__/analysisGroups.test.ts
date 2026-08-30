import { describe, expect, it } from "vitest";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";
import { ANALYSIS_GROUPS, groupAnalyses } from "@/lib/analysisGroups";
import type { AnalysisDefinition } from "@engine/shared/evidence";

describe("home hub analysis groups", () => {
  const groups = groupAnalyses();

  it("keeps the declared group order so the scientific tier stays first", () => {
    expect(groups.map((group) => group.key)).toEqual([
      "assessment",
      "ability",
      "tradition",
      "today",
    ]);
    expect(groups.map((group) => group.tier)).toEqual([
      "scientific",
      "scientific",
      "cultural",
      "cultural",
    ]);
  });

  it("places every catalog entry in exactly one group and drops none", () => {
    const placed = groups.flatMap((group) => group.analyses.map((analysis) => analysis.key));

    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual([...ANALYSIS_CATALOG.map((item) => item.key)].sort());
  });

  it("never invents a key that the catalog does not define", () => {
    const known = new Set(ANALYSIS_CATALOG.map((item) => item.key));
    for (const group of groups) {
      for (const analysis of group.analyses) {
        expect(known.has(analysis.key)).toBe(true);
      }
    }
  });

  it("derives membership from the catalog tier and purpose, not a hand-written key list", () => {
    for (const group of groups) {
      for (const analysis of group.analyses) {
        expect(analysis.tier).toBe(group.tier);
        expect(analysis.purpose).toBe(group.purpose);
      }
    }
  });

  it("groups the psychological assessments together and keeps the ability test apart", () => {
    const assessment = groups.find((group) => group.key === "assessment");
    const ability = groups.find((group) => group.key === "ability");

    expect(assessment?.analyses.map((item) => item.key)).toEqual([
      "psychometrics",
      "jungian",
      "darktriad",
      "attachment",
      "eq",
    ]);
    expect(ability?.analyses.map((item) => item.key)).toEqual(["cognitive"]);
  });

  it("surfaces the orphaned traditional lenses the flat hub used to hide", () => {
    const tradition = groups.find((group) => group.key === "tradition");
    const keys = tradition?.analyses.map((item) => item.key) ?? [];

    expect(keys).toContain("astro");
    expect(keys).toContain("compatibility");
    expect(groups.find((group) => group.key === "today")?.analyses.map((item) => item.key)).toEqual(
      ["horoscope"],
    );
  });

  it("gives every group a title and description message key", () => {
    for (const group of ANALYSIS_GROUPS) {
      expect(group.titleKey.length).toBeGreaterThan(0);
      expect(group.descKey.length).toBeGreaterThan(0);
    }
    expect(new Set(ANALYSIS_GROUPS.map((group) => group.key)).size).toBe(ANALYSIS_GROUPS.length);
  });

  it("fails loudly instead of silently dropping an analysis with no home group", () => {
    const orphan = ANALYSIS_CATALOG[0];
    if (!orphan) throw new Error("catalog fixture is empty");
    const careerOnly: AnalysisDefinition = { ...orphan, purpose: "career" };

    expect(() => groupAnalyses([careerOnly])).toThrow(RangeError);
  });
});
