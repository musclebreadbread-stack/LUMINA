import { describe, expect, it, vi } from "vitest";

// server-only is enforced by Next's bundler; this unit test exercises the
// pure DTO mapper without booting a Next request context.
vi.mock("server-only", () => ({}));

import { toItemPresentation, type PrivateAssignment } from "../repository";

const privateAssignmentFixture: PrivateAssignment = {
  assignmentId: "assignment-1",
  ordinal: 1,
  domain: "gf",
  stimulus: { kind: "text", textKo: "2 + 2 = ?", textEn: "2 + 2 = ?" },
  options: [
    { id: "a", labelKo: "3", labelEn: "3", figure: null },
    { id: "b", labelKo: "4", labelEn: "4", figure: null },
  ],
  correctOptionId: "b",
  parameters: { discrimination: 1.2, difficulty: 0, guessing: 0.25 },
  serverSeed: "secret-seed",
};

describe("cognitive repository DTO boundary", () => {
  it("maps an assignment to presentation without key or IRT parameters", () => {
    const presentation = toItemPresentation(privateAssignmentFixture);
    expect(presentation).toMatchObject({ assignmentId: "assignment-1", ordinal: 1 });
    expect(presentation).not.toHaveProperty("correctOptionId");
    expect(presentation).not.toHaveProperty("parameters");
    expect(JSON.stringify(presentation)).not.toContain("secret-seed");
  });
});
