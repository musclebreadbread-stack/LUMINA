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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "norm_releases") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      order: vi.fn(() => ({
                        limit: vi.fn(async () => ({ data: [], error: null })),
                      })),
                    })),
                  })),
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { theta: 0, standard_error: 0.3, answered_count: 20, age_years: null }, error: null })),
            })),
          })),
        };
      }),
    })),
  })),
}));

describe("cognitive norm release guard", () => {
  it("withholds a result when no approved norm is available", async () => {
    await expect(resolveScoreForRun("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")).resolves.toEqual({ status: "pilot_withheld", score: null });
  });
});
