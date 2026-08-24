import { describe, expect, it } from "vitest";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";
import { MANDALA_FEATURES } from "@/lib/mandalaModel";
import { REFERENCE_GROUPS } from "@/lib/referenceCatalog";

describe("analysis catalog consumers", () => {
  it("has a reference group for every catalog entry", () => {
    const groups = new Set<string>(REFERENCE_GROUPS.map((group) => group.key));
    for (const definition of ANALYSIS_CATALOG) {
      for (const referenceId of definition.evidence.referenceIds) {
        expect(groups.has(referenceId)).toBe(true);
      }
    }
  });

  it("registers every catalog key in exactly one reference group", () => {
    const groupKeys = REFERENCE_GROUPS.map((group) => group.key);

    expect(new Set(groupKeys).size).toBe(groupKeys.length);
    expect(groupKeys).toEqual(ANALYSIS_CATALOG.map((definition) => definition.key));
  });

  it("does not expose a mandala node with a stale tier", () => {
    for (const node of MANDALA_FEATURES) {
      expect(node.tier).toBe(ANALYSIS_CATALOG.find((item) => item.key === node.key)?.tier);
    }
  });
});
