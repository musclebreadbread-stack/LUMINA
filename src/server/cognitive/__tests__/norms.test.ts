import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveScoreForRun } from "../norms";

vi.mock("../repository", () => ({
  getOwnedRun: vi.fn(async () => ({
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    status: "completed",
    itemBankVersion: "pilot-v1",
    algorithmVersion: "cat-v1",
    blueprintVersion: "blueprint-v1",
    targetItemCount: 20,
    answeredCount: 20,
  })),
}));

describe("cognitive norm release guard", () => {
  it("withholds a result when no approved norm is available", async () => {
    await expect(resolveScoreForRun("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")).resolves.toEqual({ status: "pilot_withheld", score: null });
  });
});
