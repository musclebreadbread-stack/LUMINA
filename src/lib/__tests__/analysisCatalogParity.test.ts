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

  it("does not expose a mandala node with a stale tier", () => {
    for (const node of MANDALA_FEATURES) {
      expect(node.tier).toBe(ANALYSIS_CATALOG.find((item) => item.key === node.key)?.tier);
    }
  });
});
