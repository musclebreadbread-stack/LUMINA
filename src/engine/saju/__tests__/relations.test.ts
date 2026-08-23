import { describe, expect, it } from "vitest";
import {
  allBranchRelations,
  branchRelationOf,
  branchRelationsOf,
} from "../relations";

describe("branch relations", () => {
  it("covers every ordered branch pair", () => {
    expect(allBranchRelations()).toHaveLength(144);
  });

  it("recognizes the primary relation families", () => {
    expect(branchRelationOf(0, 6)?.kind).toBe("clash");
    expect(branchRelationOf(0, 1)?.kind).toBe("combination");
    expect(branchRelationOf(0, 4)?.kind).toBe("trine");
    expect(branchRelationOf(4, 4)?.kind).toBe("punishment");
    expect(branchRelationOf(0, 7)?.kind).toBe("harm");
    expect(branchRelationOf(0, 9)?.kind).toBe("destruction");
  });

  it("normalizes negative and overflowing branch indexes", () => {
    expect(branchRelationsOf(-12, 18)).toEqual(branchRelationsOf(0, 6));
  });
});
